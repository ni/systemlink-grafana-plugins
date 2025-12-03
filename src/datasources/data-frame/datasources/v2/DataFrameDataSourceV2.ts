import { AppEvents, createDataFrame, DataFrameDTO, DataQueryRequest, DataSourceInstanceSettings, FieldType, LegacyMetricFindQueryOptions, MetricFindValue, ScopedVars, TimeRange } from "@grafana/data";
import { DataFrameDataSourceBase } from "../../DataFrameDataSourceBase";
import { BackendSrv, getBackendSrv, TemplateSrv, getTemplateSrv } from "@grafana/runtime";
import { Column, Option, DataFrameDataQuery, DataFrameDataSourceOptions, DataFrameQueryType, DataFrameQueryV2, DataFrameVariableQuery, DataFrameVariableQueryType, DataTableProjectionLabelLookup, DataTableProjections, DataTableProperties, defaultQueryV2, defaultVariableQueryV2, FlattenedTableProperties, TableDataRows, TableProperties, TablePropertiesList, ValidDataFrameQueryV2, ValidDataFrameVariableQuery, DataFrameQueryV1, DecimatedDataRequest, ColumnFilter, CombinedFilters, QueryResultsResponse, ColumnOptions } from "../../types";
import { COLUMN_OPTIONS_LIMIT, DELAY_BETWEEN_REQUESTS_MS, REQUESTS_PER_SECOND, RESULT_IDS_LIMIT, TAKE_LIMIT, TOTAL_ROWS_LIMIT } from "datasources/data-frame/constants";
import { ExpressionTransformFunction, listFieldsQuery, multipleValuesQuery, timeFieldsQuery, transformComputedFieldsQuery } from "core/query-builder.utils";
import { LEGACY_METADATA_TYPE, Workspace } from "core/types";
import { extractErrorInfo } from "core/errors";
import { DataTableQueryBuilderFieldNames } from "datasources/data-frame/components/v2/constants/DataTableQueryBuilder.constants";
import _ from "lodash";
import { catchError, combineLatestWith, concatMap, forkJoin, from, isObservable, lastValueFrom, map, mergeMap, Observable, of, reduce, timer, switchMap } from "rxjs";
import { ResultsQueryBuilderFieldNames } from "datasources/results/constants/ResultsQueryBuilder.constants";
import { ColumnsQueryBuilderFieldNames } from "datasources/data-frame/components/v2/constants/ColumnsQueryBuilder.constants";
import { QueryBuilderOperations } from "core/query-builder.constants";

export class DataFrameDataSourceV2 extends DataFrameDataSourceBase {
    defaultQuery = defaultQueryV2;
    private scopedVars: ScopedVars = {};

    public constructor(
        public readonly instanceSettings: DataSourceInstanceSettings<DataFrameDataSourceOptions>,
        public readonly backendSrv: BackendSrv = getBackendSrv(),
        public readonly templateSrv: TemplateSrv = getTemplateSrv()
    ) {
        super(instanceSettings, backendSrv, templateSrv);
    }

    runQuery(
        query: DataFrameDataQuery,
        options: DataQueryRequest<DataFrameQueryV2>
    ): Observable<DataFrameDTO> {
        this.scopedVars = options.scopedVars;
        const processedQuery = this.processQuery(query);

        if (processedQuery.dataTableFilter) {
            processedQuery.dataTableFilter = this.transformDataTableQuery(
                processedQuery.dataTableFilter,
                options.scopedVars
            );
        }

        if (processedQuery.resultFilter) {
            processedQuery.resultFilter = this.transformResultQuery(
                processedQuery.resultFilter,
                options.scopedVars
            );
        }

        if (processedQuery.columnFilter) {
            processedQuery.columnFilter = this.transformColumnQuery(
                processedQuery.columnFilter,
                options.scopedVars
            );
        }

        if (this.shouldQueryForData(processedQuery)) {
            return this.getFieldsForDataQuery$(
                processedQuery
            );
        }

        if (this.shouldQueryForProperties(processedQuery)) {
            return this.getFieldsForPropertiesQuery$(processedQuery);
        }

        return of({
            refId: processedQuery.refId,
            name: processedQuery.refId,
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
                text: table.name,
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

    processQuery(query: DataFrameDataQuery): ValidDataFrameQueryV2 {
        // Handle existing dashboards with 'MetaData' type
        if ((query.type as any) === LEGACY_METADATA_TYPE) {
            query.type = DataFrameQueryType.Properties;
        }

        // Migration for 1.6.0: DataFrameQuery.columns changed to string[]
        if (Array.isArray(query.columns) && this.areAllObjectsWithNameProperty(query.columns)) {
            query.columns = (query.columns as Array<{ name: string; }>).map(column => column.name);
        }

        if ('tableId' in query) {
            // Convert V1 to V2
            const { tableId, ...v1QueryWithoutTableId } = query as DataFrameQueryV1;
            const dataTableProperties = query.type === DataFrameQueryType.Properties
                ? [DataTableProperties.Properties]
                : defaultQueryV2.dataTableProperties;
            const columns = this.getMigratedColumns(tableId, query.columns);

            return {
                ...defaultQueryV2,
                ...v1QueryWithoutTableId,
                dataTableFilter: tableId ? `id = "${tableId}"` : '',
                dataTableProperties,
                columns
            };
        }

        return {
            ...defaultQueryV2,
            ...query
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
        projection?: DataTableProjections[],
        substitutions?: string[]
    ): Observable<TableProperties[]> {
        const requestBody = {
            interactive: true,
            filter,
            take,
            projection,
            substitutions,
        };
        const response = this.post$<TablePropertiesList>(
            `${this.baseUrl}/query-tables`,
            requestBody,
            { useApiIngress: true }
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
        const uniqueColumnsAcrossTablesWithVariables = [
            ...this.getVariableOptions(),
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

    // TODO(#3526598): Make this method private after implementing the runQuery method for data query type.
    public getDecimatedTableDataInBatches$(
        tableColumnsMap: Record<string, Column[]>,
        query: ValidDataFrameQueryV2,
        timeRange: TimeRange,
        intervals = 1000
    ): Observable<Record<string, TableDataRows>> {
        const decimatedDataRequests = this.getDecimatedDataRequests(
            tableColumnsMap,
            query,
            timeRange,
            intervals
        );
        const batches = _.chunk(decimatedDataRequests, REQUESTS_PER_SECOND);

        return from(batches).pipe(
            mergeMap((batch, index) =>
                timer(index * DELAY_BETWEEN_REQUESTS_MS).pipe(
                    concatMap(() => forkJoin(
                        batch.map(request =>
                            this.getDecimatedTableData$(request).pipe(
                                map(tableDataRows => ({
                                    tableId: request.tableId,
                                    data: tableDataRows
                                }))
                            )
                        )
                    ))
                )
            ),
            reduce((acc, results) => {
                results.forEach(({ tableId, data }) => acc[tableId] = data);
                return acc;
            }, {} as Record<string, TableDataRows>)
        );
    }

    private getDecimatedDataRequests(
        tableColumnsMap: Record<string, Column[]>,
        query: ValidDataFrameQueryV2,
        timeRange: TimeRange,
        intervals = 1000
    ): DecimatedDataRequest[] {
        return Object.entries(tableColumnsMap).map(([tableId, columns]) => {
            const filters: ColumnFilter[] = query.filterNulls
                ? this.constructNullFilters(columns)
                : [];

            return {
                tableId,
                columns: columns.map(column => column.name),
                filters,
                decimation: {
                    method: query.decimationMethod,
                    xColumn: query.xColumn || undefined,
                    yColumns: this.getNumericColumns(columns).map(column => column.name),
                    intervals,
                }
            };
        });
    }

    private getDecimatedTableData$(request: DecimatedDataRequest): Observable<TableDataRows> {
        return this.post$<TableDataRows>(
            `${this.baseUrl}/tables/${request.tableId}/query-decimated-data`,
            {
                columns: request.columns,
                filters: request.filters,
                decimation: request.decimation,
            },
            { useApiIngress: true }
        );
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

        const columnTypeMap = this.createColumnNameDataTypesMap(tables);
        const uniqueColumnsAcrossTables = this.getUniqueColumnsAcrossTables(columnTypeMap);
        const commonColumnsAcrossTables = includeCommonColumnsAcrossTables
            ? this.getCommonColumnsAcrossTables(tables)
            : [];

        return { uniqueColumnsAcrossTables, commonColumnsAcrossTables };
    }

    private tablesContainsColumns(tables: TableProperties[]): boolean {
        return tables.length > 0 && tables[0].columns !== undefined;
    }

    private createColumnIdentifierSet(columns: Column[]): Set<string> {
        return new Set(
            columns.map(column =>
                `${column.name}-${this.transformColumnType(column.dataType)}`
            )
        );
    }

    private getMigratedColumns(
        tableId: string | undefined,
        currentColumns: any[] | undefined
    ): Observable<string[]> | string[] {
        if (!tableId || !currentColumns?.length || !this.areAllEntriesString(currentColumns)) {
            return [];
        }

        return this.getTable(tableId).pipe(
            map(table => this.migrateColumnsFromV1ToV2(currentColumns, table)),
            catchError(error => {
                const errorMessage = this.getErrorMessage(error, 'data table columns');
                this.appEvents?.publish?.({
                    type: AppEvents.alertError.name,
                    payload: ['Error during fetching columns for migration', errorMessage],
                });
                return of(currentColumns);
            })
        );
    }

    private getTable(id: string): Observable<TableProperties> {
        return this.get$<TableProperties>(`${this.baseUrl}/tables/${id}`);
    }

    private migrateColumnsFromV1ToV2(columns: string[], table: TableProperties): string[] {
        return columns.map(selectedColumn => {
            const matchingColumn = table.columns.find(
                tableColumn => tableColumn.name === selectedColumn
            );
            return matchingColumn
                ? `${matchingColumn.name}-${this.transformColumnType(matchingColumn.dataType)}`
                : selectedColumn;
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

    public transformColumnQuery(query: string, scopedVars: ScopedVars = this.scopedVars) {
        return transformComputedFieldsQuery(
            this.templateSrv.replace(query, scopedVars),
            this.columnComputedDataFields,
        );
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
            case '429':
                return `The query to fetch ${context} failed due to too many requests. Please try again later.`;
            case '504':
                return `The query to fetch ${context} experienced a timeout error. Narrow your query with a more specific filter and try again.`;
            default:
                return `The query failed due to the following error: (status ${errorDetails.statusCode}) ${errorDetails.message}.`;
        }
    }

    private transformColumnType(dataType: string): string {
        const type = ['INT32', 'INT64', 'FLOAT32', 'FLOAT64'].includes(dataType)
            ? 'Numeric'
            : this.toSentenceCase(dataType);
        return type;
    }

    private createColumnNameDataTypesMap(tables: TableProperties[]): Record<string, Set<string>> {
        const columnNameDataTypeMap: Record<string, Set<string>> = {};
        tables.forEach(table => {
            table.columns?.forEach((column: { name: string; dataType: string; }) => {
                if (column?.name && column.dataType) {
                    const dataType = this.transformColumnType(column.dataType);
                    (columnNameDataTypeMap[column.name] ??= new Set()).add(dataType);
                }
            });
        });
        return columnNameDataTypeMap;
    };

    private getUniqueColumnsAcrossTables(columnTypeMap: Record<string, Set<string>>): Option[] {
        const options: Option[] = [];

        Object.entries(columnTypeMap).forEach(([name, dataTypes]) => {
            const columnDataType = Array.from(dataTypes);

            if (columnDataType.length === 1) {
                // Single type: show just the name as label and value as name with type in sentence case
                options.push({ label: name, value: `${name}-${columnDataType[0]}` });
            } else {
                // Multiple types: show type in label and value
                columnDataType.forEach(type => {
                    options.push({ label: `${name} (${type})`, value: `${name}-${type}` });
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

        return [...commonColumns].map(column => 
            ({label: this.extractColumnNameFromColumnIdentifier(column), value: column})
        );
    }

    private extractColumnNameFromColumnIdentifier(columnIdentifier: string): string {
        const parts = columnIdentifier.split('-');
        // Remove transformed column type
        parts.pop();
        const columnName = parts.join('-');

        return columnName;
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
        return query.type === DataFrameQueryType.Data;
    }

    private getFieldsForDataQuery$(
        processedQuery: ValidDataFrameQueryV2
    ): Observable<DataFrameDTO> {
        return this.getDecimatedDataForSelectedColumns$(
            processedQuery
        );
    }

    private getDecimatedDataForSelectedColumns$(
        processedQuery: ValidDataFrameQueryV2
    ): Observable<DataFrameDTO> {
        const selectedColumns$ = isObservable(processedQuery.columns)
            ? processedQuery.columns
            : of(processedQuery.columns);
        return selectedColumns$.pipe(
            switchMap(selectedColumns => {
                if (selectedColumns.length === 0) {
                    return of(
                        this.buildDataFrame(processedQuery.refId)
                    );
                }

                const projections: DataTableProjections[] = [
                    DataTableProjections.ColumnName,
                    DataTableProjections.ColumnDataType,
                    DataTableProjections.ColumnType,
                ];

                const tables$ = this.queryTables$(
                    {
                        dataTableFilter: processedQuery.dataTableFilter
                    },
                    TAKE_LIMIT,
                    projections
                );

                return tables$.pipe(
                    map(tables => {
                        if (!this.areSelectedColumnsValid(selectedColumns, tables)) {
                            const errorMessage = 'One or more selected columns are invalid. Please update your column selection or refine your filters.';
                            this.appEvents?.publish?.({
                                type: AppEvents.alertError.name,
                                payload: ['Column selection error', errorMessage],
                            });
                            throw new Error(errorMessage);
                        }

                        const selectedTableColumnMap = this.buildSelectedColumnsMap(
                            selectedColumns,
                            tables
                        );
                        if (Object.keys(selectedTableColumnMap).length > 0) {
                            // TODO: Implement fetching decimated data for selected columns if needed.
                        }

                        return this.buildDataFrame(processedQuery.refId);
                    })
                );
            })
        );
    }

    private areSelectedColumnsValid(
        selectedColumns: string[],
        tables: TableProperties[]
    ): boolean {
        const allTableColumns = new Set<string>(
            tables.flatMap(table =>
                table.columns?.map(column =>
                    `${column.name}-${this.transformColumnType(column.dataType)}`
                ) ?? []
            )
        );

        return selectedColumns.every(
            selectedColumn => allTableColumns.has(selectedColumn)
        );
    }

    private buildSelectedColumnsMap(
        selectedColumns: string[],
        tables: TableProperties[]
    ): Record<string, Column[]> {
        const selectedTableColumnsMap: Record<string, Column[]> = {};
        tables.forEach(table => {
            const selectedColumnsForTable = this.getSelectedColumnsForTable(
                selectedColumns, table
            );
            if (selectedColumnsForTable.length > 0) {
                selectedTableColumnsMap[table.id] = selectedColumnsForTable;
            }
        });
        return selectedTableColumnsMap;
    }

    private getSelectedColumnsForTable(
        selectedColumns: string[],
        table: TableProperties
    ): Column[] {
        if (!Array.isArray(table.columns) || table.columns.length === 0) {
            return [];
        }

        const selectedColumnDetails: Column[] = [];

        table.columns.forEach(column => {
            const transformedColumnType = this.transformColumnType(column.dataType);
            const tableColumnId = `${column.name}-${transformedColumnType}`;
            if (selectedColumns.includes(tableColumnId)) {
                selectedColumnDetails.push({
                    name: column.name,
                    dataType: column.dataType,
                    columnType: column.columnType,
                    properties: {}
                });
            }
        });
        return selectedColumnDetails;
    }

    private buildDataFrame(refId: string): DataFrameDTO {
        return createDataFrame({
            refId,
            name: refId,
            fields: [],
        });
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
        [ ColumnsQueryBuilderFieldNames.ColumnName ].map(field => [ field, this.convertToColumnsAnyExpression(field) ])
    );

    private convertToColumnsAnyExpression (field: string): ExpressionTransformFunction {
        return (value: string, operation: string) => {
            const isNegatedOperation = this.isNegatedOperation(operation);
            const positiveOperation = this.getPositiveOperation(operation);
            const innerExpression = multipleValuesQuery(field)(value, positiveOperation);
            const cleanedExpression = this.removeNegationWrapper(innerExpression);
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

    private removeNegationWrapper (expression: string): string {
        return expression.startsWith('!(')
            ? expression.slice(2, -1)
            : expression;
    }

    private transformToIteratorExpression (expression: string, field: string): string {
        const fieldPattern = new RegExp(`\\b${field}\\b`, 'g');
        return expression.replace(fieldPattern, `it.${field}`);
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
                const fields = propertiesToQuery.map(property => {
                    const values = this.getFieldValues(
                        flattenedTablesWithColumns,
                        property,
                        workspaces
                    );
                    return {
                        name: DataTableProjectionLabelLookup[property].label,
                        type: this.getFieldType(property),
                        values
                    };
                });

                return {
                    refId: processedQuery.refId,
                    name: processedQuery.refId,
                    fields: fields,
                };
            })
        );

        return dataFrame$;
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
        const placeholders = resultIds.map((_, index) => `@${index}`).join(', ');
        const resultFilter = `new[] {${placeholders}}.Contains(testResultId)`;
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
        if (filters.columnFilter) {
            combinedFilters.push(`(${filters.columnFilter})`);
        }

        return combinedFilters.join(' && ');
    }
}
