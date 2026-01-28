import { AppEvents, createDataFrame, DataFrameDTO, DataQueryRequest, DataSourceInstanceSettings, dateTime, FieldDTO, FieldType, LegacyMetricFindQueryOptions, MetricFindValue, QueryResultMetaNotice, ScopedVars, TimeRange } from "@grafana/data";
import { DataFrameDataSourceBase } from "../../DataFrameDataSourceBase";
import { BackendSrv, getBackendSrv, TemplateSrv, getTemplateSrv } from "@grafana/runtime";
import { Column, Option, DataFrameDataQuery, DataFrameDataSourceOptions, DataFrameQueryType, DataFrameQueryV2, DataFrameVariableQuery, DataFrameVariableQueryType, DataTableProjectionLabelLookup, DataTableProjections, DataTableProperties, defaultQueryV2, defaultVariableQueryV2, FlattenedTableProperties, TableDataRows, TableProperties, TablePropertiesList, ValidDataFrameQueryV2, ValidDataFrameVariableQuery, DataFrameQueryV1, DecimatedDataRequest, UndecimatedDataRequest, ColumnFilter, CombinedFilters, QueryResultsResponse, ColumnOptions, ColumnType, TableColumnsData, ColumnWithDisplayName, ColumnDataType, DataTableFirstClassPropertyLabels, metadataFieldOptions, DATA_TABLE_NAME_FIELD, DATA_TABLE_ID_FIELD, DATA_TABLE_NAME_LABEL, DATA_TABLE_ID_LABEL, DataFrameFeatureToggles } from "../../types";
import { COLUMN_OPTIONS_LIMIT, COLUMN_SELECTION_LIMIT, COLUMNS_GROUP, CUSTOM_PROPERTY_COLUMNS_LIMIT, DELAY_BETWEEN_REQUESTS_MS, NUMERIC_DATA_TYPES, REQUESTS_PER_SECOND, RESULT_IDS_LIMIT, TAKE_LIMIT, TOTAL_ROWS_LIMIT, UNDECIMATED_RECORDS_LIMIT } from "datasources/data-frame/constants";
import { ExpressionTransformFunction, listFieldsQuery, multipleValuesQuery, timeFieldsQuery, transformComputedFieldsQuery } from "core/query-builder.utils";
import { LEGACY_METADATA_TYPE, Workspace } from "core/types";
import { extractErrorInfo } from "core/errors";
import { DataTableQueryBuilderFieldNames } from "datasources/data-frame/components/v2/constants/DataTableQueryBuilder.constants";
import _ from "lodash";
import { catchError, combineLatestWith, concatMap, from, isObservable, lastValueFrom, map, mergeMap, Observable, of, reduce, timer, switchMap, takeUntil, Subject } from "rxjs";
import { ResultsQueryBuilderFieldNames } from "shared/components/ResultsQueryBuilder/ResultsQueryBuilder.constants";
import { replaceVariables } from "core/utils";
import { ColumnsQueryBuilderFieldNames } from "datasources/data-frame/components/v2/constants/ColumnsQueryBuilder.constants";
import { QueryBuilderOperations } from "core/query-builder.constants";
import { DataFrameQueryParamsHandler } from "./DataFrameQueryParamsHandler";
import Papa from 'papaparse';

export class DataFrameDataSourceV2 extends DataFrameDataSourceBase {
    defaultQuery = defaultQueryV2;
    private scopedVars: ScopedVars = {};
    private isQueryUndecimatedDataFeatureEnabled: boolean;

    public constructor(
        public readonly instanceSettings: DataSourceInstanceSettings<DataFrameDataSourceOptions>,
        public readonly backendSrv: BackendSrv = getBackendSrv(),
        public readonly templateSrv: TemplateSrv = getTemplateSrv(),
        protected readonly featureToggles: DataFrameFeatureToggles
    ) {
        super(instanceSettings, backendSrv, templateSrv, featureToggles);
        this.isQueryUndecimatedDataFeatureEnabled = this.instanceSettings
            .jsonData?.featureToggles?.queryUndecimatedData ?? false;
    }

    runQuery(
        query: DataFrameDataQuery,
        options: DataQueryRequest<DataFrameQueryV2>
    ): Observable<DataFrameDTO> {
        this.scopedVars = options.scopedVars;
        const processedQuery = this.processQuery(query, options.targets);
        const transformedQuery = this.transformQuery(processedQuery, options.scopedVars);

        if (this.featureToggles.highResolutionZoom) {
            DataFrameQueryParamsHandler.updateSyncXAxisRangeTargetsQueryParam(
                transformedQuery.filterXRangeOnZoomPan,
                options.panelId?.toString(),
            );
        }

        if (this.shouldQueryForData(transformedQuery)) {
            return this.getFieldsForDataQuery$(
                transformedQuery,
                options
            );
        }

        if (this.shouldQueryForProperties(transformedQuery)) {
            return this.getFieldsForPropertiesQuery$(transformedQuery);
        }

        return of({
            refId: transformedQuery.refId,
            name: transformedQuery.refId,
            fields: []
        });
    }

    async metricFindQuery(
        query: DataFrameVariableQuery,
        options: LegacyMetricFindQueryOptions
    ): Promise<MetricFindValue[]> {
        const processedQuery = this.processVariableQuery(query);

        if (processedQuery.dataTableFilter) {
            processedQuery.dataTableFilter = this.transformDataTableQuery(
                processedQuery.dataTableFilter,
                options?.scopedVars || {}
            );
        }

        if (processedQuery.resultFilter) {
            processedQuery.resultFilter = this.transformResultQuery(
                processedQuery.resultFilter,
                options?.scopedVars || {}
            );
        }

        if (processedQuery.columnFilter) {
            processedQuery.columnFilter = this.transformColumnQuery(
                processedQuery.columnFilter,
                options?.scopedVars || {}
            );
        }

        const filters = {
            resultFilter: processedQuery.resultFilter,
            dataTableFilter: processedQuery.dataTableFilter,
            columnFilter: processedQuery.columnFilter
        };

        if (processedQuery.queryType === DataFrameVariableQueryType.ListDataTables) {
            const tables = await lastValueFrom(this.queryTables$(
                filters,
                TAKE_LIMIT,
                [DataTableProjections.Name]
            ));
            return tables.map(table => ({
                text: `${table.name} (${table.id})`,
                value: table.id,
            }));
        }

        const columns = await this.getColumnOptions(filters, false);
        const limitedColumns = columns.uniqueColumnsAcrossTables.splice(0, COLUMN_OPTIONS_LIMIT);

        return limitedColumns.map(column => ({
            text: column.label,
            value: column.value,
        }));
    }

    shouldRunQuery(query: DataFrameDataQuery): boolean {
        return !query.hide;
    }

    processQuery(
        query: DataFrameDataQuery,
        queries: DataFrameDataQuery[]
    ): ValidDataFrameQueryV2 {
        // Handle existing dashboards with 'MetaData' type
        if ((query.type as any) === LEGACY_METADATA_TYPE) {
            query.type = DataFrameQueryType.Properties;
        }

        // Migration for 1.6.0: DataFrameQuery.columns changed to string[]
        if (Array.isArray(query.columns) && this.areAllObjectsWithNameProperty(query.columns)) {
            query.columns = (query.columns as Array<{ name: string; }>).map(column => column.name);
        }

        const dataTableFilter = this.resolveDataTableFilter(query);
        const columns = this.resolveColumns(query);
        const dataTableProperties = this.resolveDataTableProperties(query);
        const filterXRangeOnZoomPan = this.resolveFilterXRangeOnZoomPan(query, queries);

        const { tableId, applyTimeFilters, ...v2SpecificProperties } = query as DataFrameQueryV1;
        return {
            ...defaultQueryV2,
            ...v2SpecificProperties,
            dataTableFilter,
            columns,
            dataTableProperties,
            filterXRangeOnZoomPan,
        };
    }

    public prepareQuery(query: DataFrameDataQuery): DataFrameDataQuery {
        return query;
    }

    public processVariableQuery(query: DataFrameVariableQuery): ValidDataFrameVariableQuery {
        if (_.isPlainObject(query) && 'tableId' in query) {
            // Convert V1 to V2
            const {
                tableId,
                type,
                columns,
                decimationMethod,
                filterNulls,
                applyTimeFilters,
                queryType,
                ...baseQueryProps
            } = query as DataFrameQueryV1;
            const dataTableFilter = tableId ? `id = "${tableId}"` : '';

            return {
                ...defaultVariableQueryV2,
                ...baseQueryProps,
                queryType: DataFrameVariableQueryType.ListColumns,
                dataTableFilter,
            };
        }

        return {
            ...defaultVariableQueryV2,
            ...query
        } as ValidDataFrameVariableQuery;
    }

    async getTableProperties(_id?: string): Promise<TableProperties> {
        throw new Error('Method not implemented.');
    }

    async getDecimatedTableData(
        _query: DataFrameDataQuery,
        _columns: Column[],
        _timeRange: TimeRange,
        _intervals?: number | undefined
    ): Promise<TableDataRows> {
        // TODO: Implement logic to fetch and return decimated table data based on the query, columns, time range, and intervals.
        throw new Error('Method not implemented.');
    }

    queryTables$(
        filters: CombinedFilters,
        take?: number,
        projections?: DataTableProjections[]
    ): Observable<TableProperties[]> {
        const isQueryByResultFeatureEnabled = this.instanceSettings.jsonData?.featureToggles?.queryByResultAndColumnProperties;
        if (filters.resultFilter && isQueryByResultFeatureEnabled) {
            return this.queryResultIds$(filters.resultFilter).pipe(
                switchMap(resultIds => {
                    if (resultIds.length === 0) {
                        return of([]);
                    }
                    const resultFilter = this.buildResultIdFilter(resultIds);
                    const combinedFilter = this.buildCombinedFilter({
                        resultFilter,
                        dataTableFilter: filters.dataTableFilter,
                        columnFilter: filters.columnFilter
                    });
                    return this.queryTablesInternal$(
                        combinedFilter,
                        take,
                        projections,
                        resultIds
                    );
                })
            );
        }
        return this.queryTablesInternal$(filters.dataTableFilter || '', take, projections, undefined);
    }

    private queryTablesInternal$(
        filter: string,
        take = TAKE_LIMIT,
        projection: DataTableProjections[] = [],
        substitutions?: string[]
    ): Observable<TableProperties[]> {
        const updatedProjections = [...projection];
        if(!updatedProjections.includes(DataTableProjections.RowsModifiedAt)) {
            updatedProjections.push(DataTableProjections.RowsModifiedAt);
        }
        
        const requestBody = {
            interactive: true,
            orderBy: DataTableProjections.RowsModifiedAt,
            orderByDescending: true,
            filter,
            take,
            projection: updatedProjections,
            substitutions,
        };
        const response = this.post$<TablePropertiesList>(
            `${this.baseUrl}/query-tables`,
            requestBody,
            { useApiIngress: true, showErrorAlert: false }
        );

        return response.pipe(
            map(res => res.tables),
            catchError(error => {
                const errorMessage = this.getErrorMessage(error, 'data tables');
                this.appEvents?.publish?.({
                    type: AppEvents.alertError.name,
                    payload: ['Error during data tables query', errorMessage],
                });
                throw new Error(errorMessage);
            })
        );
    }

    queryTables(
        filter: string,
        take = TAKE_LIMIT,
        projection?: DataTableProjections[]
    ): Promise<TableProperties[]> {
        return Promise.resolve([]);
    }

    public async getColumnOptionsWithVariables(
        filters: CombinedFilters
    ): Promise<ColumnOptions> {
        const columnOptions = await this.getColumnOptions(filters);

        const variableOptionsWithGroup = this.getVariableOptions().map(
            option => ({ ...option, group: COLUMNS_GROUP })
        );

        const uniqueColumnsAcrossTablesWithVariables = [
            ...metadataFieldOptions,
            ...variableOptionsWithGroup,
            ...columnOptions.uniqueColumnsAcrossTables
        ];
        const commonColumnsAcrossTablesWithVariables = [
            ...this.getVariableOptions(),
            ...columnOptions.commonColumnsAcrossTables
        ];
        return {
            uniqueColumnsAcrossTables: uniqueColumnsAcrossTablesWithVariables,
            commonColumnsAcrossTables: commonColumnsAcrossTablesWithVariables
        };
    }

    private getTableDataInBatches$(
        tableColumnsMap: Record<string, TableColumnsData>,
        query: ValidDataFrameQueryV2,
        timeRange: TimeRange,
        maxDataPoints = 1000
    ): Observable<{ data: Record<string, TableDataRows>; isLimitExceeded: boolean }> {
        const queryUndecimatedData = this.isQueryUndecimatedDataFeatureEnabled 
            && query.decimationMethod === 'NONE';

        const requests: Array<{ tableId: string }> = queryUndecimatedData
            ? this.getUndecimatedDataRequests(tableColumnsMap, query, timeRange)
            : this.getDecimatedDataRequests(tableColumnsMap, query, timeRange, maxDataPoints);
        
        const fetchTableData$ = queryUndecimatedData
            ? (request: { tableId: string }) => 
                this.getUndecimatedTableData$(request as UndecimatedDataRequest)
            : (request: { tableId: string }) => 
                this.getDecimatedTableData$(request as DecimatedDataRequest);

        const totalRequests = requests.length;
        const batches = _.chunk(requests, REQUESTS_PER_SECOND);
        const stopSignal$ = new Subject<void>();

        return from(batches).pipe(
            mergeMap((batch, index) =>
                timer(index * DELAY_BETWEEN_REQUESTS_MS).pipe(
                    takeUntil(stopSignal$),
                    concatMap(() => from(batch).pipe(
                        mergeMap(request =>
                            fetchTableData$(request).pipe(
                                takeUntil(stopSignal$),
                                map(tableDataRows => ({
                                    tableId: request.tableId,
                                    data: tableDataRows
                                }))
                            )
                        )
                    ))
                )
            ),
            reduce((acc, result) => {
                const retrievedDataFrame = result.data.frame;
                const rowsInRetrievedDataFrame = retrievedDataFrame.data.length;
                const columnsInRetrievedDataFrame = retrievedDataFrame.columns.length;
                const dataPointsToAdd = rowsInRetrievedDataFrame * columnsInRetrievedDataFrame;
                
                acc.processedTables++;
                acc.totalDataPoints += dataPointsToAdd;

                // Only accumulate data if within limit
                if (acc.totalDataPoints <= TOTAL_ROWS_LIMIT) {
                    acc.data[result.tableId] = result.data;
                }

                // Signal to stop if limit reached
                if (acc.totalDataPoints >= TOTAL_ROWS_LIMIT) {
                    // Mark as exceeded if there are more tables to process OR if a single table exceeded the limit
                    if (acc.processedTables < totalRequests || acc.totalDataPoints > TOTAL_ROWS_LIMIT) {
                        acc.isLimitExceeded = true;
                    }
                    stopSignal$.next();
                    stopSignal$.complete();
                }

                return acc;
            }, 
            { 
                totalDataPoints: 0, 
                data: {} as Record<string, TableDataRows>, 
                processedTables: 0, 
                isLimitExceeded: false 
            }),
            map(acc => ({ data: acc.data, isLimitExceeded: acc.isLimitExceeded }))
        );
    }

    private getDecimatedDataRequests(
        tableColumnsMap: Record<string, TableColumnsData>,
        query: ValidDataFrameQueryV2,
        timeRange: TimeRange,
        maxDataPoints = 1000
    ): DecimatedDataRequest[] {
        const intervals = maxDataPoints < 0 
            ? 0 
            : Math.min(maxDataPoints, TOTAL_ROWS_LIMIT);

        return Object.entries(tableColumnsMap).map(([tableId, columnsMap]) => {
            const nullFilters: ColumnFilter[] = query.filterNulls
                ? this.constructNullFilters(columnsMap.selectedColumns)
                : [];
            const timeFilters: ColumnFilter[] = query.filterXRangeOnZoomPan
                ? this.constructTimeFilters(query.xColumn, columnsMap.columns, timeRange)
                : [];
            const filters: ColumnFilter[] = [
                ...nullFilters,
                ...timeFilters
            ];

            const xColumn = query.xColumn 
                    ? this.parseColumnIdentifier(query.xColumn).columnName
                    : undefined;
            const yColumns = this.getNumericColumns(columnsMap.selectedColumns)
                .filter(column => column.name !== xColumn)
                .map(column => column.name)

            return {
                tableId,
                columns: columnsMap.selectedColumns.map(column => column.name),
                filters,
                decimation: {
                    method: query.decimationMethod,
                    xColumn: xColumn,
                    yColumns,
                    intervals,
                }
            };
        });
    }

    private constructTimeFilters(
        xColumn: string | null,
        columns: Column[],
        timeRange: TimeRange
    ): ColumnFilter[] {
        let columnName: string | undefined;

        if (xColumn) {
            const parsedColumnIdentifier = this.parseColumnIdentifier(xColumn);
            columnName = parsedColumnIdentifier.transformedDataType === 'Timestamp'
                ? parsedColumnIdentifier.columnName
                : undefined;
        } else {
            const timeIndexColumn = columns.find(column =>
                column.dataType === 'TIMESTAMP' && column.columnType === 'INDEX'
            );
            columnName = timeIndexColumn?.name;
        }

        if (!columnName) {
            return [];
        }

        return [
            {
                column: columnName,
                operation: 'GREATER_THAN_EQUALS',
                value: timeRange.from.toISOString()
            },
            {
                column: columnName,
                operation: 'LESS_THAN_EQUALS',
                value: timeRange.to.toISOString()
            },
        ];
    }

    private getDecimatedTableData$(request: DecimatedDataRequest): Observable<TableDataRows> {
        return this.post$<TableDataRows>(
            `${this.baseUrl}/tables/${request.tableId}/query-decimated-data`,
            {
                columns: request.columns,
                filters: request.filters,
                decimation: request.decimation,
            },
            { useApiIngress: true, showErrorAlert: false }
        ).pipe(
            catchError(error => {
                const errorMessage = this.getErrorMessage(error, 'decimated table data');
                this.appEvents?.publish?.({
                    type: AppEvents.alertError.name,
                    payload: ['Error fetching decimated table data', errorMessage],
                });
                return of({frame: {columns: [], data: []}});
            })
        );
    }

    private getUndecimatedDataRequests(
        tableColumnsMap: Record<string, TableColumnsData>,
        query: ValidDataFrameQueryV2,
        timeRange: TimeRange
    ): UndecimatedDataRequest[] {
        const take = Math.min(
            query.undecimatedRecordCount ?? UNDECIMATED_RECORDS_LIMIT, 
            UNDECIMATED_RECORDS_LIMIT
        );
        return Object.entries(tableColumnsMap).map(([tableId, columnsMap]) => {
            const nullFilters: ColumnFilter[] = query.filterNulls
                ? this.constructNullFilters(columnsMap.selectedColumns)
                : [];
            const timeFilters: ColumnFilter[] = query.applyTimeFilters
                ? this.constructTimeFilters(query.xColumn, columnsMap.columns, timeRange)
                : [];
            const filters: ColumnFilter[] = [
                ...nullFilters,
                ...timeFilters
            ];

            const orderBy = query.xColumn 
                ? [
                    {
                        column: this.parseColumnIdentifier(query.xColumn).columnName,
                        descending: true
                    }]
                : undefined;

            return {
                tableId,
                columns: columnsMap.selectedColumns.map(column => column.name),
                orderBy,
                filters,
                take
            };
        });
    }

    private getUndecimatedTableData$(request: UndecimatedDataRequest): Observable<TableDataRows> {
        const requestBody = {
            columns: request.columns,
            orderBy: request.orderBy,
            filters: request.filters.length > 0 ? request.filters : undefined,
            destination: 'INLINE',
            responseFormat: 'CSV',
            take: request.take
        };
        return this.post$<string>(
            `${this.baseUrl}/tables/${request.tableId}/export-data`,
            requestBody,
            { 
                useApiIngress: true,
                showErrorAlert: false,
            }
        ).pipe(
            map(csvData => this.parseCsvToTableDataRows(csvData)),
            catchError(error => {
                const errorMessage = this.getErrorMessage(error, 'undecimated table data');
                this.appEvents?.publish?.({
                    type: AppEvents.alertError.name,
                    payload: ['Error fetching undecimated table data', errorMessage],
                });
                return of({ frame: { columns: [], data: [] } });
            })
        );
    }

    private parseCsvToTableDataRows(csvData: string): TableDataRows {
        const parseResult = Papa.parse<string[]>(csvData, {
            header: false,
            skipEmptyLines: true
        });
        if (parseResult.errors && parseResult.errors.length > 0) {
            // Only treat actual parsing errors as fatal, not warnings like delimiter auto-detection
            const fatalErrors = parseResult.errors.filter(
                error => error.type !== 'Delimiter'
            );

            if (fatalErrors.length > 0) {
                const errorMessages = fatalErrors.map(error => error.message).join(', ');
                throw new Error(`Failed to parse CSV data: ${errorMessages}`);
            }
        }

        const rows = parseResult.data;
        if (rows.length === 0) {
            return { frame: { columns: [], data: [] } };
        }

        // First row contains column headers
        const columns = rows[0];
        // Remaining rows are data
        const data = rows.slice(1);

        return {
            frame: {
                columns,
                data
            }
        };
    }

    private async getColumnOptions(
        filters: CombinedFilters,
        includeCommonColumnsAcrossTables = true
    ): Promise<ColumnOptions> {
        const tables = await lastValueFrom(
            this.queryTables$(filters, TAKE_LIMIT, [
                DataTableProjections.ColumnName,
                DataTableProjections.ColumnDataType,
            ]));

        if (!this.tablesContainsColumns(tables)) {
            return { uniqueColumnsAcrossTables: [], commonColumnsAcrossTables: [] };
        }

        const hasColumns = tables.some(
            table => Array.isArray(table.columns)
                && table.columns.length > 0
        );
        if (!hasColumns) {
            return { uniqueColumnsAcrossTables: [], commonColumnsAcrossTables: [] };
        }

        const uniqueColumnsAcrossTables = this.sortOptionsByLabel(
            this.getUniqueColumnsAcrossTables(tables)
        );
        const commonColumnsAcrossTables = includeCommonColumnsAcrossTables
            ? this.sortOptionsByLabel(this.getCommonColumnsAcrossTables(tables))
            : [];

        return { uniqueColumnsAcrossTables, commonColumnsAcrossTables };
    }

    private sortOptionsByLabel(options: Option[]): Option[] {
        return options.sort((option1, option2) => option1.label.localeCompare(option2.label));
    }

    private tablesContainsColumns(tables: TableProperties[]): boolean {
        return tables.length > 0 && tables[0].columns !== undefined;
    }

    private createColumnIdentifierSet(columns: Column[]): Set<string> {
        return new Set(
            columns.map(column => this.getColumnIdentifier(column.name, column.dataType))
        );
    }

    private getMigratedColumns(
        tableId: string | undefined,
        currentColumns: any[] | undefined
    ): Observable<string[]> | string[] {
        if (!tableId || !currentColumns?.length || !this.areAllEntriesString(currentColumns)) {
            return [];
        }

        const transformedTableId = this.templateSrv.replace(tableId, this.scopedVars);
        return this.getTable(transformedTableId).pipe(
            map(table => this.migrateColumnsFromV1ToV2(currentColumns, table)),
            catchError(error => {
                const errorMessage = this.getErrorMessage(error, 'data table columns');
                this.appEvents?.publish?.({
                    type: AppEvents.alertError.name,
                    payload: ['Error fetching columns for migration', errorMessage],
                });
                return of(currentColumns.map(column => {
                    if (this.templateSrv.containsTemplate(column)) {
                        return column;
                    }

                    return this.getColumnIdentifier(column, 'unknown');
                }));
            })
        );
    }

    private getTable(id: string): Observable<TableProperties> {
        return this.get$<TableProperties>(`${this.baseUrl}/tables/${id}`);
    }

    private migrateColumnsFromV1ToV2(columns: string[], table: TableProperties): string[] {
        return columns.map(selectedColumn => {
            if (this.templateSrv.containsTemplate(selectedColumn)) {
                return selectedColumn;
            }

            const matchingColumn = table.columns.find(
                tableColumn => tableColumn.name === selectedColumn
            );
            const matchingColumnName = matchingColumn ? matchingColumn.name : selectedColumn;
            const matchingColumnDataType = matchingColumn ? matchingColumn.dataType : 'unknown';
            return this.getColumnIdentifier(matchingColumnName, matchingColumnDataType);
        });
    }

    public transformDataTableQuery(query: string, scopedVars: ScopedVars = this.scopedVars) {
        return transformComputedFieldsQuery(
            this.templateSrv.replace(query, scopedVars),
            this.dataTableComputedDataFields,
        );
    }

    public transformResultQuery(query: string, scopedVars: ScopedVars = this.scopedVars) {
        return transformComputedFieldsQuery(
            this.templateSrv.replace(query, scopedVars),
            this.resultsComputedDataFields,
        );
    }

    public transformColumnQuery(query: string, _scopedVars: ScopedVars = this.scopedVars) {
        // Column filter queries require custom variable replacement logic to parse column names from 
        // template variable values (e.g., "Column1-Numeric" -> "Column1"). Variable replacement 
        // is handled within the expression transform function rather than on the entire query string.
        return transformComputedFieldsQuery(
            query,
            this.columnComputedDataFields,
        );
    }

    private transformColumns(columns: string[]): string[] {
        return replaceVariables(columns, this.templateSrv);
    }

    private transformXColumn(xColumn: string, scopedVars: ScopedVars = this.scopedVars): string {
        return this.templateSrv.replace(xColumn, scopedVars);
    }

    private transformQuery(
        query: ValidDataFrameQueryV2, 
        scopedVars: ScopedVars = this.scopedVars
    ): ValidDataFrameQueryV2 {
        if (query.dataTableFilter) {
            query.dataTableFilter = this.transformDataTableQuery(
                query.dataTableFilter,
                scopedVars
            );
        }

        if (query.resultFilter) {
            query.resultFilter = this.transformResultQuery(
                query.resultFilter,
                scopedVars
            );
        }

        if (query.columnFilter) {
            query.columnFilter = this.transformColumnQuery(
                query.columnFilter,
                scopedVars
            );
        }

        if (query.columns && !isObservable(query.columns)) {
            query.columns = this.transformColumns(query.columns);
        }

        if (query.xColumn){
            query.xColumn = this.transformXColumn(query.xColumn, scopedVars);
        }

        return query;
    }

    private areAllObjectsWithNameProperty(object: any[]): object is Array<{ name: string; }> {
        return _.every(
            object,
            entry => _.isPlainObject(entry) && 'name' in (entry as {})
        );
    }

    private areAllEntriesString(array: any[]): array is string[] {
        return _.every(array, entry => typeof entry === 'string');
    }

    private getErrorMessage(error: Error, context: string): string {
        const errorDetails = extractErrorInfo(error.message);

        switch (errorDetails.statusCode) {
            case '':
                return 'The query failed due to an unknown error.';
            case '404':
                return `The query to fetch ${context} failed because the requested resource was not found. Please check the query parameters and try again.`;
            case '429':
                return `The query to fetch ${context} failed due to too many requests. Please try again later.`;
            case '504':
                return `The query to fetch ${context} experienced a timeout error. Narrow your query with a more specific filter and try again.`;
            default:
                return `The query failed due to the following error: (status ${errorDetails.statusCode}) ${errorDetails.message}.`;
        }
    }

    private transformColumnDataType(dataType: string): string {
        const type = NUMERIC_DATA_TYPES.includes(dataType)
            ? 'Numeric'
            : this.toSentenceCase(dataType);
        return type;
    }

    private createColumnNameDataTypesMap(tables: TableProperties[]): Record<string, Set<string>> {
        const columnNameDataTypeMap: Record<string, Set<string>> = {};
        tables.forEach(table => {
            table.columns?.forEach((column: { name: string; dataType: string; }) => {
                if (column?.name && column.dataType) {
                    const dataType = this.transformColumnDataType(column.dataType);
                    (columnNameDataTypeMap[column.name] ??= new Set()).add(dataType);
                }
            });
        });
        return columnNameDataTypeMap;
    };

    private getUniqueColumnsAcrossTables(tables: TableProperties[]): Option[] {
        const columnNameDataTypesMap = this.createColumnNameDataTypesMap(tables);
        const options: Option[] = [];

        Object.entries(columnNameDataTypesMap).forEach(([columnName, dataTypes]) => {
            const columnDataType = Array.from(dataTypes);

            if (columnDataType.length === 1) {
                // Single type: show just the name as label and value as name with type in sentence case
                options.push({ 
                    label: columnName,
                    value: `${columnName}-${columnDataType[0]}`,
                    group: COLUMNS_GROUP
                });
            } else {
                // Multiple types: show type in label and value
                columnDataType.forEach(dataType => {
                    options.push({
                        label: `${columnName} (${dataType})`,
                        value: `${columnName}-${dataType}`,
                        group: COLUMNS_GROUP
                    });
                });
            }
        });

        return options;
    };

    private getCommonColumnsAcrossTables(tables: TableProperties[]): Option[] {
        if (!this.tablesContainsColumns(tables)) {
            return [];
        }

        const numericColumns = this.getNumericColumns(tables[0].columns);
        let commonColumns = this.createColumnIdentifierSet(numericColumns);

        for (let i = 1; (i < tables.length) && (commonColumns.size > 0); i++) {
            const tableColumnsSet = this.createColumnIdentifierSet(tables[i].columns);
            commonColumns = new Set(
                [...commonColumns].filter(column => tableColumnsSet.has(column))
            );
        }

        return [...commonColumns].map(column => {
            return {
                label: this.parseColumnIdentifier(column).columnName,
                value: column
            }
        });
    }

    private getColumnIdentifier(columnName: string, dataType: string): string {
        const transformedDataType = this.transformColumnDataType(dataType);
        return `${columnName}-${transformedDataType}`;
    }

    public parseColumnIdentifier(
        columnIdentifier: string
    ): { columnName: string, transformedDataType: string } {
        const parts = columnIdentifier.split('-');
        // Remove transformed column type
        const transformedDataType = parts.pop() ?? '';
        const columnName = parts.join('-');

        return {
            columnName,
            transformedDataType
        };
    }

    /**
     * Converts a string to sentence case (e.g., 'TIMESTAMP' -> 'Timestamp').
     */
    private toSentenceCase(str: string) {
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    };

    private shouldQueryForProperties(query: ValidDataFrameQueryV2): boolean {
        const isDataTableOrColumnPropertiesSelected = (
            query.dataTableProperties.length > 0
            || query.columnProperties.length > 0
        );
        const isTakeValid = query.take > 0 && query.take <= TAKE_LIMIT;

        return (
            query.type === DataFrameQueryType.Properties
            && isDataTableOrColumnPropertiesSelected
            && isTakeValid
        );
    }

    private shouldQueryForData(query: ValidDataFrameQueryV2): boolean {
        return (
            query.type === DataFrameQueryType.Data
            && this.hasRequiredFilters(query)
        );
    }

    public hasRequiredFilters(query: ValidDataFrameQueryV2): boolean {
        return (
            query.resultFilter !== ''
            || query.dataTableFilter !== ''
        );
    }

    private getFieldsForDataQuery$(
        processedQuery: ValidDataFrameQueryV2,
        options: DataQueryRequest<DataFrameQueryV2>
    ): Observable<DataFrameDTO> {
        return this.getTableDataForSelectedColumns$(
            processedQuery,
            options
        );
    }

    private getTableDataForSelectedColumns$(
        processedQuery: ValidDataFrameQueryV2,
        options: DataQueryRequest<DataFrameQueryV2>
    ): Observable<DataFrameDTO> {
        const selectedColumnIdentifiers$ = isObservable(processedQuery.columns)
            ? processedQuery.columns
            : of(processedQuery.columns);
        return selectedColumnIdentifiers$.pipe(
            switchMap(selectedColumnIdentifiers => {
                if (selectedColumnIdentifiers.length === 0) {
                    return of(
                        this.buildDataFrame(processedQuery.refId)
                    );
                }

                const nonMetadataColumnIdentifiers = this.filterMetadataFields(selectedColumnIdentifiers);

                if (nonMetadataColumnIdentifiers.length > COLUMN_SELECTION_LIMIT) {
                    const errorMessage = `The number of columns you selected (${nonMetadataColumnIdentifiers.length.toLocaleString()}) exceeds the column limit (${COLUMN_SELECTION_LIMIT.toLocaleString()}). Reduce your number of selected columns and try again.`;
                    this.appEvents?.publish?.({
                        type: AppEvents.alertError.name,
                        payload: ['Column selection error', errorMessage],
                    });
                    throw new Error(errorMessage);
                }

                const projections: DataTableProjections[] = [
                    DataTableProjections.ColumnName,
                    DataTableProjections.ColumnDataType,
                    DataTableProjections.ColumnType,
                ];

                if (selectedColumnIdentifiers.includes(DATA_TABLE_NAME_FIELD)) {
                    projections.push(DataTableProjections.Name);
                }

                const tables$ = this.queryTables$(
                    {
                        resultFilter: processedQuery.resultFilter,
                        dataTableFilter: processedQuery.dataTableFilter,
                        columnFilter: processedQuery.columnFilter,
                    },
                    TAKE_LIMIT,
                    projections
                );

                return tables$.pipe(
                    switchMap(tables => {
                        if (!this.areSelectedColumnsValid(nonMetadataColumnIdentifiers, tables)) {
                            const errorMessage = 'One or more selected columns are invalid. Please update your column selection or refine your filters.';
                            this.appEvents?.publish?.({
                                type: AppEvents.alertError.name,
                                payload: ['Column selection error', errorMessage],
                            });
                            throw new Error(errorMessage);
                        }

                        if (
                            processedQuery.xColumn
                            && !this.isSelectedXColumnValid(processedQuery.xColumn, tables)
                        ) {
                            const errorMessage = 'The selected X column is invalid. Please update your X column selection or refine your filters.';
                            this.appEvents?.publish?.({
                                type: AppEvents.alertError.name,
                                payload: ['X Column selection error', errorMessage],
                            });
                            throw new Error(errorMessage);
                        }

                        const tableColumnsMap = this.buildTableColumnsMap(
                            nonMetadataColumnIdentifiers,
                            tables,
                            processedQuery.includeIndexColumns
                        );

                        const hasOnlyMetadataFields = selectedColumnIdentifiers.every(
                            selectedColumnIdentifier => selectedColumnIdentifier === DATA_TABLE_ID_FIELD || selectedColumnIdentifier === DATA_TABLE_NAME_FIELD
                        );

                        if (
                            Object.keys(tableColumnsMap).length > 0
                            || hasOnlyMetadataFields
                        ) {
                            const tableNamesMap = this.buildTableNamesMap(tables);
                            const tableDataMap$ = hasOnlyMetadataFields
                                ? of({
                                    data: Object.fromEntries(
                                        tables.map(table => [
                                            table.id, 
                                            { frame: { columns: [], data: [[]] } }
                                        ])
                                    ),
                                    isLimitExceeded: false
                                })
                                : this.getTableDataInBatches$(
                                    tableColumnsMap,
                                    processedQuery,
                                    options.range,
                                    options.maxDataPoints
                                );

                            return tableDataMap$.pipe(
                                map(result => {
                                    const aggregatedTableDataRows = this.aggregateTableDataRows(
                                        tableColumnsMap,
                                        tableNamesMap,
                                        result.data,
                                        processedQuery.xColumn,
                                        selectedColumnIdentifiers
                                    );
                                    const notices = result.isLimitExceeded ? [
                                        {
                                            severity: 'warning' as const,
                                            text: `Data limited to ${TOTAL_ROWS_LIMIT.toLocaleString()} data points. Some data is not displayed. Refine your filters or reduce the number of selected columns to see all data.`
                                        }
                                    ] : undefined;
                                    const dataFrame = this.buildDataFrame(
                                        processedQuery.refId,
                                        aggregatedTableDataRows,
                                        notices
                                    );
                                    return dataFrame;
                                })
                            );
                        }
                        return of(this.buildDataFrame(processedQuery.refId));
                    })
                );
            })
        );
    }

    private aggregateTableDataRows(
        tableColumnsMap: Record<string, TableColumnsData>,
        tableNamesMap: Record<string, string>,
        tableRowDataMap: Record<string, TableDataRows>,
        xColumn: string | null,
        selectedColumnIdentifiers: string[]
    ): FieldDTO[] {
        let uniqueOutputColumns = this.getUniqueColumns(
            Object.values(tableColumnsMap)
                .flatMap(columnsData => columnsData.selectedColumns)
        );
        uniqueOutputColumns = this.sortColumnsByType(uniqueOutputColumns, xColumn);

        const fields: FieldDTO[] = [
            ...uniqueOutputColumns.map(column => (this.createField({
                name: column.displayName,
                type: this.getFieldTypeForDataType(column.dataType),
                values: [],
            })))
        ];

        metadataFieldOptions.forEach(({ label, value }) => {
            if (selectedColumnIdentifiers.includes(value)) {
                fields.push({
                    name: label,
                    type: FieldType.string,
                    values: [],
                });
            }
        });

        Object.entries(tableRowDataMap).forEach(([tableId, tableRowData]) => {
            const tableName = tableNamesMap[tableId] || '';
            const tableColumnsData = tableColumnsMap[tableId];
            const columns = tableRowData.frame.columns;
            const data = tableRowData.frame.data;
            const rowCount = data.length;

            const columnInfoByDisplayName = tableColumnsData 
                ? new Map(tableColumnsData.selectedColumns.map(column => [column.displayName, column]))
                : new Map(); // Handle case where only metadata fields are selected
            const columnIndexByName = new Map(
                columns.map((columnName, index) => [columnName, index])
            );

            fields.forEach(field => {
                switch (field.name) {
                    case DATA_TABLE_ID_LABEL:
                        const tableIdColumnValues = Array(rowCount).fill(tableId);
                        field.values = field.values!.concat(tableIdColumnValues);
                        break;
                    case DATA_TABLE_NAME_LABEL:
                        const tableNameColumnValues = Array(rowCount).fill(tableName);
                        field.values = field.values!.concat(tableNameColumnValues);
                        break;
                    default:
                        const { 
                            name: actualColumnName,
                            dataType: columnDataType
                        } = columnInfoByDisplayName.get(field.name) || {};
                        const columnIndex = actualColumnName !== undefined
                            ? columnIndexByName.get(actualColumnName)
                            : undefined;
                        if (
                            actualColumnName === undefined
                            || columnDataType === undefined
                            || columnIndex === undefined
                        ) {
                            const emptyValues = Array(rowCount).fill(null);
                            field.values = field.values!.concat(emptyValues);
                            break;
                        }

                        const transformedData = data.map(row => {
                            return this.transformValue(columnDataType, row[columnIndex]);
                        });
                        field.values = field.values!.concat(transformedData);
                        break;
                }
            });
        });

        return fields;
    }

    private transformValue(dataType: ColumnDataType, value: string | null): any {
        if (dataType !== 'STRING' && !value) {
            return null;
        }

        switch (dataType) {
            case 'BOOL':
                return value!.toLowerCase() === 'true';
            case 'INT32':
            case 'INT64':
            case 'FLOAT32':
            case 'FLOAT64':
                return Number(value);
            case 'TIMESTAMP':
                return dateTime(value).valueOf();
            default:
                return value;
        }
    }

    private getFieldTypeForDataType(dataType: ColumnDataType): FieldType {
        switch (dataType) {
            case 'BOOL':
                return FieldType.boolean;
            case 'INT32':
            case 'INT64':
            case 'FLOAT32':
            case 'FLOAT64':
                return FieldType.number;
            case 'TIMESTAMP':
                return FieldType.time;
            default:
                return FieldType.string;
        }
    }

    private getUniqueColumns(columns: ColumnWithDisplayName[]): ColumnWithDisplayName[] {
        const uniqueColumnsMap: Map<string, ColumnWithDisplayName> = new Map();
        columns.forEach(column => {
            const key = this.getColumnIdentifier(column.name, column.dataType);
            if (!uniqueColumnsMap.has(key)) {
                uniqueColumnsMap.set(key, column);
            }
        });
        return Array.from(uniqueColumnsMap.values());
    }

    private buildTableNamesMap(tables: TableProperties[]) {
        const tableIdNamesMap: Record<string, string> = {};
        tables.forEach(table => {
            tableIdNamesMap[table.id] = table.name;
        });
        return tableIdNamesMap;
    }

    private areSelectedColumnsValid(
        selectedColumns: string[],
        tables: TableProperties[]
    ): boolean {
        const allTableColumns = this.createColumnIdentifierSet(
            tables.flatMap(table => table.columns ?? [])
        );

        return selectedColumns.every(
            selectedColumn => allTableColumns.has(selectedColumn)
        );
    }

    private isSelectedXColumnValid(
        xColumn: string,
        tables: TableProperties[]
    ): boolean {
        const transformedDataType = this.parseColumnIdentifier(xColumn).transformedDataType;
        const isXColumnDataTypeValid = transformedDataType === 'Numeric' 
            || transformedDataType === 'Timestamp';
        if (!isXColumnDataTypeValid) {
            return false;
        }

        return tables.every(table => this.createColumnIdentifierSet(table.columns).has(xColumn));
    }

    private buildTableColumnsMap(
        selectedColumnIdentifiers: string[],
        tables: TableProperties[],
        includeIndexColumns: boolean
    ): Record<string, TableColumnsData> {
        const selectedTableColumnsMap: Record<string, TableColumnsData> = {};
        const uniqueColumnsAcrossTables = this.getUniqueColumnsAcrossTables(tables);
        tables.forEach(table => {
            const selectedColumns = this.getSelectedColumnsForTable(
                selectedColumnIdentifiers,
                table,
                includeIndexColumns
            ).map(column => {
                const displayName = uniqueColumnsAcrossTables.find(
                    uniqueColumn => uniqueColumn.value === this.getColumnIdentifier(column.name, column.dataType)
                )?.label || '';
                return {
                    ...column,
                    displayName
                };
            });
            if (selectedColumns.length > 0) {
                selectedTableColumnsMap[table.id] = {
                    selectedColumns,
                    columns: table.columns
                };
            }
        });
        return selectedTableColumnsMap;
    }

    private filterMetadataFields(columnIdentifiers: string[]): string[] {
        return columnIdentifiers.filter(columnIdentifier => 
            columnIdentifier !== DATA_TABLE_ID_FIELD && 
            columnIdentifier !== DATA_TABLE_NAME_FIELD
        );
    }

    private getSelectedColumnsForTable(
        selectedColumns: string[],
        table: TableProperties,
        includeIndexColumns: boolean
    ): Column[] {
        if (!Array.isArray(table.columns) || table.columns.length === 0) {
            return [];
        }

        const selectedColumnDetails: Column[] = [];

        table.columns.forEach(column => {
            const tableColumnId = this.getColumnIdentifier(column.name, column.dataType);
            if (selectedColumns.includes(tableColumnId)) {
                selectedColumnDetails.push({
                    name: column.name,
                    dataType: column.dataType,
                    columnType: column.columnType,
                    properties: {}
                });
            }
        });

        if (
            includeIndexColumns
            && selectedColumnDetails.length > 0
        ) {
            const tableIndexColumn = table.columns
                .find(column => column.columnType === ColumnType.Index);
            const tableIndexColumnId = this.getColumnIdentifier(
                tableIndexColumn?.name || '',
                tableIndexColumn?.dataType || ''
            );
            if (tableIndexColumn && !selectedColumns.includes(tableIndexColumnId)) {
                selectedColumnDetails.push(tableIndexColumn);
            }
        }

        return selectedColumnDetails;
    }

    private sortColumnsByType(
        uniqueColumns: ColumnWithDisplayName[],
        xColumn?: string | null
    ): ColumnWithDisplayName[] {
        const columnTypeOrder = {
            [ColumnType.Index]: 0,
            [ColumnType.Normal]: 1,
            [ColumnType.Nullable]: 2,
        };
        const xColumnName = xColumn ? this.parseColumnIdentifier(xColumn).columnName : null;

        return uniqueColumns.sort((a, b) => {
            const aIsXColumn = a.name === xColumnName;
            const bIsXColumn = b.name === xColumnName;

            if (aIsXColumn || bIsXColumn) {
                return aIsXColumn ? -1 : 1;
            }

            const orderA = columnTypeOrder[a.columnType];
            const orderB = columnTypeOrder[b.columnType];
            return orderA - orderB;
        });
    }

    private buildDataFrame(
        refId: string,
        fields: FieldDTO[] = [],
        notices?: QueryResultMetaNotice[]
    ): DataFrameDTO {
        const frame = createDataFrame({
            refId,
            name: refId,
            fields,
        });
        
        if (notices) {
            frame.meta = {
                ...frame.meta,
                notices
            };
        }
        
        return frame;
    }

    private get dataTableComputedDataFields(): Map<string, ExpressionTransformFunction> {
        const computedFields = new Map<string, ExpressionTransformFunction>();
        const queryBuilderFieldNames = new Set(Object.values(DataTableQueryBuilderFieldNames));

        for (const property of Object.values(DataTableProperties)) {
            const fieldName = DataTableProjectionLabelLookup[property].field;

            if (queryBuilderFieldNames.has(fieldName as DataTableQueryBuilderFieldNames)) {
                computedFields.set(
                    fieldName,
                    this.isTimeField(property)
                        ? timeFieldsQuery(fieldName)
                        : multipleValuesQuery(fieldName)
                );
            }
        }

        return computedFields;
    }

    protected readonly resultsComputedDataFields = new Map<string, ExpressionTransformFunction>(
        Object.values(ResultsQueryBuilderFieldNames).map(field => {
            let callback;

            switch (field) {
                case ResultsQueryBuilderFieldNames.UPDATED_AT:
                case ResultsQueryBuilderFieldNames.STARTED_AT:
                    callback = timeFieldsQuery(field);
                    break;
                case ResultsQueryBuilderFieldNames.KEYWORDS:
                    callback = listFieldsQuery(field);
                    break;
                default:
                    callback = multipleValuesQuery(field);
            }

            return [field, callback];
        })
    );

    protected readonly columnComputedDataFields = new Map<string, ExpressionTransformFunction>(
        [ColumnsQueryBuilderFieldNames.ColumnName].map(field => [
            field,
            this.convertToColumnsAnyExpression(field)
        ])
    );

    private convertToColumnsAnyExpression (field: string): ExpressionTransformFunction {
        return (value: string, operation: string) => {
            const isNegatedOperation = this.isNegatedOperation(operation);
            const positiveOperation = this.getPositiveOperation(operation);
            let columnNameValue = value;
            if (this.templateSrv.containsTemplate(value)) {
                const replacedValue = this.templateSrv.replace(value, this.scopedVars);
                columnNameValue = this.parseColumnNameFromValue(replacedValue);
            }
            const innerExpression = multipleValuesQuery(field)(columnNameValue, positiveOperation);
            const cleanedExpression = this.removeWrapper(innerExpression);
            const transformedExpression = this.transformToIteratorExpression(cleanedExpression, field);

            return isNegatedOperation
                ? `!columns.any(${transformedExpression})`
                : `columns.any(${transformedExpression})`;
        };
    }

    private isNegatedOperation (operation: string): boolean {
        return (
            operation === '!=' ||
            operation === QueryBuilderOperations.DOES_NOT_EQUAL.name ||
            operation === QueryBuilderOperations.DOES_NOT_CONTAIN.name
        );
    }

    private getPositiveOperation (operation: string): string {
        if (operation === '!=' || operation === QueryBuilderOperations.DOES_NOT_EQUAL.name) {
            return QueryBuilderOperations.EQUALS.name;
        }
        if (operation === QueryBuilderOperations.DOES_NOT_CONTAIN.name) {
            return QueryBuilderOperations.CONTAINS.name;
        }
        return operation;
    }

    private removeWrapper (expression: string): string {
        return expression.startsWith('(')
            ? expression.slice(1, -1)
            : expression;
    }

    private transformToIteratorExpression (expression: string, field: string): string {
        const fieldPattern = new RegExp(`\\b${field}\\b`, 'g');
        return expression.replace(fieldPattern, `it.${field}`);
    }

    private parseColumnNameFromValue(filterValue: string): string {
        const isMultiValue = filterValue.startsWith('{') && filterValue.endsWith('}');
        
        if (isMultiValue) {
            const values = filterValue.slice(1, -1).split(',');
            const extractedNames = values.map(value => 
                this.extractColumnName(value)
            );
            const uniqueNames = [...new Set(extractedNames)];
            return `{${uniqueNames.join(',')}}`;
        }
        
        return this.extractColumnName(filterValue);
    }
    
    private extractColumnName(value: string): string {
        const transformedDataTypes = ['Numeric', 'String', 'Bool', 'Timestamp'];
        const hasDataTypeSuffix = transformedDataTypes.some(dataType => 
            value.endsWith(`-${dataType}`)
        );
        
        return hasDataTypeSuffix 
            ? this.parseColumnIdentifier(value).columnName 
            : value;
    }

    private isTimeField(field: DataTableProperties): boolean {
        const timeFields = [
            DataTableProperties.CreatedAt,
            DataTableProperties.MetadataModifiedAt,
            DataTableProperties.RowsModifiedAt
        ];
        return timeFields.includes(field);
    };

    private isNumericField(field: DataTableProperties): boolean {
        const numberFields = [
            DataTableProperties.ColumnCount,
            DataTableProperties.RowCount,
            DataTableProperties.MetadataRevision
        ];
        return numberFields.includes(field);
    };

    private isBooleanField(field: DataTableProperties): boolean {
        return field === DataTableProperties.SupportsAppend;
    };

    private isObjectField(field: DataTableProperties): boolean {
        const fields = [
            DataTableProperties.ColumnProperties,
            DataTableProperties.Properties,
        ];
        return fields.includes(field);
    };

    private getFieldType(property: DataTableProperties): FieldType {
        switch (true) {
            case this.isTimeField(property):
                return FieldType.time;
            case this.isNumericField(property):
                return FieldType.number;
            case this.isBooleanField(property):
                return FieldType.boolean;
            case this.isObjectField(property):
                return FieldType.other;
            default:
                return FieldType.string;
        }
    }

    private flattenTablesWithColumns(tables: TableProperties[]): FlattenedTableProperties[] {
        if (tables.length === 0 || !tables[0].columns) {
            return tables;
        }

        const flattenedData = tables.flatMap(table => {
            const baseData = {
                id: table.id,
                name: table.name,
                columnCount: table.columnCount,
                createdAt: table.createdAt,
                metadataModifiedAt: table.metadataModifiedAt,
                metadataRevision: table.metadataRevision,
                rowCount: table.rowCount,
                rowsModifiedAt: table.rowsModifiedAt,
                supportsAppend: table.supportsAppend,
                workspace: table.workspace,
                properties: table.properties,
            };

            return table.columns.length > 0
                ? table.columns.map(column => ({
                    ...baseData,
                    columnName: column.name,
                    columnDataType: column.dataType,
                    columnType: column.columnType,
                    columnProperties: column.properties,
                }))
                : [baseData];
        });

        return flattenedData.slice(0, TOTAL_ROWS_LIMIT);
    }

    private getFieldValues(
        tables: FlattenedTableProperties[],
        property: DataTableProperties,
        workspaces: Map<string, Workspace>
    ): Array<string | number | boolean | Record<string, string> | undefined> {
        const field = DataTableProjectionLabelLookup[property].field;
        return tables.map(table => {
            const value = table[field];

            if (property === DataTableProperties.Workspace) {
                const workspace = workspaces.get(value as string);
                return workspace ? workspace.name : value;
            }

            return value;
        });
    }

    private getFieldsForPropertiesQuery$(processedQuery: ValidDataFrameQueryV2): Observable<DataFrameDTO> {
        const propertiesToQuery = [
            ...processedQuery.dataTableProperties,
            ...processedQuery.columnProperties
        ];
        const projections = propertiesToQuery
            .map(property => DataTableProjectionLabelLookup[property].projection);
        const projectionExcludingId = projections
            .filter(projection => projection !== DataTableProjections.Id);
        const filters = {
            resultFilter: processedQuery.resultFilter,
            dataTableFilter: processedQuery.dataTableFilter,
            columnFilter: processedQuery.columnFilter
        };
        const tables$ = this.queryTables$(
            filters,
            processedQuery.take,
            projectionExcludingId
        );
        const flattenedTablesWithColumns$ = tables$.pipe(
            map(tables => this.flattenTablesWithColumns(tables))
        );
        const workspaces$ = from(this.loadWorkspaces());
        const dataFrame$ = flattenedTablesWithColumns$.pipe(
            combineLatestWith(workspaces$),
            map(([flattenedTablesWithColumns, workspaces]) => {
                const fields: FieldDTO[] = [];
                const includeDataTableCustomProperties = propertiesToQuery.includes(
                    DataTableProperties.Properties
                );
                const propertiesToQueryWithoutDataTableCustomProperties = propertiesToQuery.filter(
                    property => property !== DataTableProperties.Properties
                );

                propertiesToQueryWithoutDataTableCustomProperties.forEach(property => {
                    const values = this.getFieldValues(
                        flattenedTablesWithColumns,
                        property,
                        workspaces
                    );
                    fields.push({
                        name: DataTableProjectionLabelLookup[property].label,
                        type: this.getFieldType(property),
                        values
                    });
                });

                /**
                 * If @see DataTableProperties.Properties is selected,
                 * flatten it into separate fields in the data frame output
                 */
                if (includeDataTableCustomProperties) {
                    const propertyFields = this.createFieldsFromTableProperties(flattenedTablesWithColumns);
                    fields.push(...propertyFields);
                }

                return {
                    refId: processedQuery.refId,
                    name: processedQuery.refId,
                    fields: fields,
                };
            })
        );

        return dataFrame$;
    }

    private createFieldsFromTableProperties(tables: FlattenedTableProperties[]): FieldDTO[] {
        const uniquePropertyKeys = this.getUniqueCustomPropertyKeys(tables);
        const sortedPropertyKeys = Array.from(uniquePropertyKeys)
            .sort((propertyKey1, propertyKey2) => propertyKey1.localeCompare(propertyKey2));

        return sortedPropertyKeys.map(propertyKey => (this.createField({
            name: this.getCustomPropertyFieldName(propertyKey),
            type: FieldType.string,
            values: tables.map(table => table.properties?.[propertyKey])
        })));
    }

    private getCustomPropertyFieldName(propertyKey: string): string {
        return DataTableFirstClassPropertyLabels.has(propertyKey)
            ? `${propertyKey} (Data table)`
            : propertyKey;
    }

    private getUniqueCustomPropertyKeys(tables: FlattenedTableProperties[]): Set<string> {
        const propertyKeysSet = new Set<string>();
        for (const table of tables) {
            if (table.properties) {
                for (const key of Object.keys(table.properties)) {
                    propertyKeysSet.add(key);
                    if (propertyKeysSet.size >= CUSTOM_PROPERTY_COLUMNS_LIMIT) {
                        return propertyKeysSet;
                    }
                }
            }
        }
        return propertyKeysSet;
    }

    private queryResultIds$(resultFilter: string): Observable<string[]> {
        const queryResultsUrl = `${this.instanceSettings.url}/nitestmonitor/v2/query-results`;
        const requestBody = {
            filter: resultFilter,
            projection: ['id'],
            take: RESULT_IDS_LIMIT,
            orderBy: 'UPDATED_AT',
            descending: true
        };

        return this.post$<QueryResultsResponse>(
            queryResultsUrl,
            requestBody,
            { showErrorAlert: false }
        ).pipe(
            map(response => {
                if (!response.results || response.results.length === 0) {
                    return [];
                }
                return response.results.map(result => result.id);
            }),
            catchError(error => {
                const errorMessage = this.getErrorMessage(error, 'results');
                this.appEvents?.publish?.({
                    type: AppEvents.alertError.name,
                    payload: ['Error querying test results', errorMessage],
                });
                return of([]);
            })
        );
    }

    private buildResultIdFilter(resultIds: string[]): string {
        if (resultIds.length === 0) {
            return '';
        }
        const placeholders = resultIds.map((_, index) => `@${index}`).join(',');
        const resultFilter = `new[]{${placeholders}}.Contains(testResultId)`;
        return resultFilter;
    }

    private buildCombinedFilter(filters: CombinedFilters): string {
        const combinedFilters: string[] = [];

        if (filters.resultFilter) {
            combinedFilters.push(`(${filters.resultFilter})`);
        }
        if (filters.dataTableFilter) {
            combinedFilters.push(`(${filters.dataTableFilter})`);
        }
        if (filters.resultFilter && filters.columnFilter) {
            combinedFilters.push(`(${filters.columnFilter})`);
        }

        return combinedFilters.join('&&');
    }

    private createField(field: FieldDTO): FieldDTO {
        if (field.name.toLowerCase() === 'value') {
            return {
                ...field,
                config: {
                    ...field.config,
                    displayName: field.name,
                },
            };
        }
        return field;
    }

    private resolveDataTableFilter(query: DataFrameDataQuery): string {
        if ('dataTableFilter' in query && query.dataTableFilter !== undefined) {
            return query.dataTableFilter;
        }

        if ('tableId' in query && query.tableId !== undefined && query.tableId !== '') {
            return `id = "${query.tableId}"`;
        }

        return defaultQueryV2.dataTableFilter;
    }

    private resolveColumns(query: DataFrameDataQuery): string[] | Observable<string[]> {
        if ('tableId' in query) {
            return this.getMigratedColumns(query.tableId, query.columns);
        }

        return query.columns ?? defaultQueryV2.columns;
    }

    private resolveDataTableProperties(query: DataFrameDataQuery): DataTableProperties[] {
        if ('dataTableProperties' in query && query.dataTableProperties !== undefined) {
            return query.dataTableProperties;
        }

        if (query.type === DataFrameQueryType.Properties) {
            return [DataTableProperties.Properties];
        }

        return defaultQueryV2.dataTableProperties;
    }

    private resolveFilterXRangeOnZoomPan(
        query: DataFrameDataQuery,
        queries: DataFrameDataQuery[]
    ): boolean {
        if ('filterXRangeOnZoomPan' in query && query.filterXRangeOnZoomPan !== undefined) {
            return queries.some(q => (q as DataFrameQueryV2).filterXRangeOnZoomPan);
        }

        if ('applyTimeFilters' in query && query.applyTimeFilters !== undefined) {
            if (this.featureToggles.highResolutionZoom) {
                return queries.some(q => (q as DataFrameQueryV1).applyTimeFilters);
            }

            return query.applyTimeFilters;
        }

        return defaultQueryV2.filterXRangeOnZoomPan;
    }
}
