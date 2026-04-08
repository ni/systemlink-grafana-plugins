import { AppEvents, createDataFrame, DataFrameDTO, DataQueryRequest, DataSourceInstanceSettings, dateTime, FieldDTO, FieldType, LegacyMetricFindQueryOptions, MetricFindValue, QueryResultMetaNotice, ScopedVars, TimeRange } from "@grafana/data";
import { DataFrameDataSourceBase } from "../../DataFrameDataSourceBase";
import { BackendSrv, getBackendSrv, TemplateSrv, getTemplateSrv } from "@grafana/runtime";
import { Column, Option, DataFrameDataQuery, DataFrameDataSourceOptions, DataFrameQueryType, DataFrameQueryV2, DataFrameVariableQuery, DataFrameVariableQueryType, DataTableProjectionLabelLookup, DataTableProjections, DataTableProperties, defaultQueryV2, defaultVariableQueryV2, FlattenedTableProperties, TableDataRows, TableProperties, TablePropertiesList, ValidDataFrameQueryV2, ValidDataFrameVariableQuery, DataFrameQueryV1, DecimatedDataRequest, UndecimatedDataRequest, ColumnFilter, CombinedFilters, DataFrameQueryResultsResponse, ColumnOptions, ColumnType, TableColumnsData, ColumnWithDisplayName, ColumnDataType, metadataFieldOptions, DATA_TABLE_NAME_FIELD, DATA_TABLE_ID_FIELD, DATA_TABLE_NAME_LABEL, DATA_TABLE_ID_LABEL, CustomPropertyOptions, PropertySelections, ALL_STANDARD_PROPERTIES, PropertiesQueryCache, DataFrameResultsResponseProperties } from "../../types";
import { COLUMN_OPTIONS_LIMIT, COLUMN_SELECTION_LIMIT, COLUMNS_GROUP, CUSTOM_PROPERTY_COLUMNS_LIMIT, DELAY_BETWEEN_REQUESTS_MS, FLOAT32_MAX, FLOAT32_MIN, FLOAT64_MAX, FLOAT64_MIN, INT32_MAX, INT32_MIN, INT64_MAX, INT64_MIN, X_COLUMN_RANGE_DECIMAL_PRECISION, INTEGER_DATA_TYPES, NUMERIC_DATA_TYPES, POSSIBLE_UNIT_CUSTOM_PROPERTY_KEYS, REQUESTS_PER_SECOND, RESULT_IDS_LIMIT, TAKE_LIMIT, MAXIMUM_DATA_POINTS, UNDECIMATED_RECORDS_LIMIT, CUSTOM_COLUMN_PROPERTIES_GROUP, CUSTOM_DATA_TABLE_PROPERTIES_GROUP, CUSTOM_PROPERTY_SUFFIX, propertiesCacheTTL, DATA_TABLES_IDS_LIMIT } from "datasources/data-frame/constants";
import { ExpressionTransformFunction, listFieldsQuery, multipleValuesQuery, timeFieldsQuery, transformComputedFieldsQuery } from "core/query-builder.utils";
import { LEGACY_METADATA_TYPE, Workspace } from "core/types";
import { extractErrorInfo } from "core/errors";
import { DataTableQueryBuilderFieldNames } from "datasources/data-frame/components/v2/constants/DataTableQueryBuilder.constants";
import _ from "lodash";
import { catchError, combineLatestWith, concatMap, from, isObservable, lastValueFrom, map, mergeMap, Observable, of, reduce, timer, switchMap, takeUntil, Subject, tap } from "rxjs";
import { ResultsQueryBuilderFieldNames } from "shared/components/ResultsQueryBuilder/ResultsQueryBuilder.constants";
import { replaceVariables } from "core/utils";
import { ColumnsQueryBuilderFieldNames } from "datasources/data-frame/components/v2/constants/ColumnsQueryBuilder.constants";
import { QueryBuilderOperations } from "core/query-builder.constants";
import { DataFrameQueryParamsHandler } from "./DataFrameQueryParamsHandler";
import Papa from 'papaparse';
import TTLCache from "@isaacs/ttlcache";

export class DataFrameDataSourceV2 extends DataFrameDataSourceBase {
    defaultQuery = defaultQueryV2;
    private scopedVars: ScopedVars = {};
    private isHighResolutionZoomFeatureEnabled: boolean;
    private readonly propertiesQueryCache: TTLCache<string, PropertiesQueryCache> = new TTLCache(
        {
            ttl: propertiesCacheTTL
        }
    );

    public constructor(
        public readonly instanceSettings: DataSourceInstanceSettings<DataFrameDataSourceOptions>,
        public readonly backendSrv: BackendSrv = getBackendSrv(),
        public readonly templateSrv: TemplateSrv = getTemplateSrv()
    ) {
        super(instanceSettings, backendSrv, templateSrv);
        this.isHighResolutionZoomFeatureEnabled = this.instanceSettings
            .jsonData?.featureToggles?.highResolutionZoom ?? false;
    }

    runQuery(
        query: DataFrameDataQuery,
        options: DataQueryRequest<DataFrameQueryV2>
    ): Observable<DataFrameDTO> {
        this.scopedVars = options.scopedVars;
        const processedQuery = this.processQuery(query);
        const transformedQuery = this.transformQuery(processedQuery, options.scopedVars);

        if (this.isHighResolutionZoomFeatureEnabled) {
            const filterXRangeOnZoomPan = options.targets.some(target => this.resolveFilterXRangeOnZoomPan(target));
            DataFrameQueryParamsHandler.updateSyncXAxisRangeTargetsQueryParam(
                filterXRangeOnZoomPan,
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
        query: DataFrameDataQuery
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
        const filterXRangeOnZoomPan = this.resolveFilterXRangeOnZoomPan(query);

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

    queryTables$(
        filters: CombinedFilters,
        take?: number,
        projections?: DataTableProjections[]
    ): Observable<TableProperties[]> {
        const filterAndSubstitutions$ = this.buildQueryTablesFilterAndSubstitutions$(filters);
        return filterAndSubstitutions$.pipe(
            switchMap(filterAndSubstitutions => {
                if (!filterAndSubstitutions) {
                    return of([]);
                }

                return this.queryTablesInternal$(
                    filterAndSubstitutions.filter,
                    take,
                    projections,
                    filterAndSubstitutions.substitutions
                );
            })
        );
    }

    private buildQueryTablesFilterAndSubstitutions$(
        filters: CombinedFilters
    ): Observable<{ filter: string; substitutions?: string[] } | null> {
        if (!filters.resultFilter) {
            return of({
                filter: filters.dataTableFilter || ''
            });
        }

        const results$ = this.queryResults$(filters.resultFilter);
        return results$.pipe(
            map(results => {
                if (results.length === 0) {
                    return null;
                }

                const {
                    filter: resultFilter,
                    substitutions
                } = this.buildResultFilter(results);
                const filter = this.buildCombinedFilter({
                    resultFilter,
                    dataTableFilter: filters.dataTableFilter,
                    columnFilter: filters.columnFilter
                });

                return { filter, substitutions };
            })
        );
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

    public async getCustomPropertyOptions(
        filters: CombinedFilters,
        take: number
    ): Promise<CustomPropertyOptions> {
        const tables = await lastValueFrom(
            this.queryTables$(
                filters,
                take,
                [
                    DataTableProjections.Properties,
                    DataTableProjections.ColumnProperties
                ]
            )
        );
        
        if (!this.tablesContainsProperties(tables)) {
            return { 
                dataTableCustomPropertyOptions:[],
                columnCustomPropertyOptions: []
            };
        }

        const dataTableProperties = new Set(
            tables.flatMap(table => table.properties ? Object.keys(table.properties) : [])
        );
        const columnProperties = new Set(
            tables.flatMap(table =>
                table.columns?.flatMap(column =>
                    column.properties ? Object.keys(column.properties) : []
                ) ?? []
            )
        );

        const dataTableCustomPropertyOptions = this.createCustomPropertyOptions(
            dataTableProperties,
            CUSTOM_DATA_TABLE_PROPERTIES_GROUP
        );
        const columnCustomPropertyOptions = this.createCustomPropertyOptions(
            columnProperties,
            CUSTOM_COLUMN_PROPERTIES_GROUP
        );
        return {
            dataTableCustomPropertyOptions,
            columnCustomPropertyOptions
        };
    }

    private getTableData$(
        tableColumnsMap: Record<string, TableColumnsData>,
        tableRowCountMap: Record<string, number>,
        query: ValidDataFrameQueryV2,
        timeRange: TimeRange,
        maxDataPoints = 1000
    ): Observable<{ data: Record<string, TableDataRows>; isLimitExceeded: boolean }> {
        const queryUndecimatedData = this.isUndecimatedDataQuery(query);

        if (queryUndecimatedData) {
            const { requests, isDataPointLimitReached } = this.getUndecimatedDataRequests(
                tableColumnsMap,
                tableRowCountMap,
                query,
                timeRange,
            );
            return this.queryTableDataInBatches$(
                requests,
                request => this.getUndecimatedTableData$(request)
            ).pipe(
                map(result => ({
                    ...result,
                    isLimitExceeded: result.isLimitExceeded || isDataPointLimitReached
                }))
            );
        }

        const requests = this.getDecimatedDataRequests(tableColumnsMap, query, timeRange, maxDataPoints);
        return this.queryTableDataInBatches$(
            requests,
            request => this.getDecimatedTableData$(request)
        );
    }

    private queryTableDataInBatches$<TRequest extends { tableId: string }>(
        requests: TRequest[],
        queryTableDataHandler$: (request: TRequest) => Observable<TableDataRows>
    ): Observable<{ data: Record<string, TableDataRows>; isLimitExceeded: boolean }> {
        const totalRequests = requests.length;
        const batches = _.chunk(requests, REQUESTS_PER_SECOND);
        const stopSignal$ = new Subject<void>();

        return from(batches).pipe(
            mergeMap((batch, index) =>
                timer(index * DELAY_BETWEEN_REQUESTS_MS).pipe(
                    takeUntil(stopSignal$),
                    concatMap(() => from(batch).pipe(
                        mergeMap(request =>
                            queryTableDataHandler$(request).pipe(
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
                if (acc.isLimitExceeded) {
                    return acc;
                }

                const retrievedDataFrame = result.data.frame;
                const rowsInRetrievedDataFrame = retrievedDataFrame.data.length;
                const columnsInRetrievedDataFrame = retrievedDataFrame.columns.length;
                const dataPointsInRetrievedDataFrame = rowsInRetrievedDataFrame * columnsInRetrievedDataFrame;
                const remainingDataPointCapacity = MAXIMUM_DATA_POINTS - acc.totalDataPoints;

                acc.processedTables++;

                const canFitAllDataPoints = dataPointsInRetrievedDataFrame <= remainingDataPointCapacity;
                if (canFitAllDataPoints) {
                    acc.data[result.tableId] = result.data;
                    acc.totalDataPoints += dataPointsInRetrievedDataFrame;
                } else {
                    const numberOfRowsToInclude = Math.floor(remainingDataPointCapacity / columnsInRetrievedDataFrame);
                    if (numberOfRowsToInclude > 0) {
                        acc.data[result.tableId] = {
                            frame: {
                                columns: retrievedDataFrame.columns,
                                data: retrievedDataFrame.data.slice(0, numberOfRowsToInclude)
                            }
                        };
                        acc.totalDataPoints += numberOfRowsToInclude * columnsInRetrievedDataFrame;
                    }
                }

                if (acc.totalDataPoints === MAXIMUM_DATA_POINTS || !canFitAllDataPoints) {
                    const hasMoreTablesToProcess = acc.processedTables < totalRequests;
                    if (hasMoreTablesToProcess || !canFitAllDataPoints) {
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
            : Math.min(maxDataPoints, MAXIMUM_DATA_POINTS);

        return Object.entries(tableColumnsMap).map(([tableId, columnsMap]) => {
            const filters = this.constructColumnFilters(
                    query, 
                    columnsMap,
                    timeRange
                );
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

    private getUndecimatedDataRequests(
        tableColumnsMap: Record<string, TableColumnsData>,
        tableRowCountMap: Record<string, number>,
        query: ValidDataFrameQueryV2,
        timeRange: TimeRange
    ): { 
        requests: UndecimatedDataRequest[];
        isDataPointLimitReached: boolean 
    } {
        const requests: UndecimatedDataRequest[] = [];
        let isDataPointLimitReached = false;

        const tablesWithSelectedColumns = Object.entries(tableColumnsMap)
            .filter(([tableId, columnsMap]) => {
                const tableRowCount = tableRowCountMap[tableId];
                return columnsMap.selectedColumns.length > 0 && tableRowCount > 0;
            });

        let totalDataPointsAcrossTables = 0;
        const configuredTake = query.undecimatedRecordCount;
        for (const [tableId, columnsMap] of tablesWithSelectedColumns) {
            const remainingDataPointsCapacity = MAXIMUM_DATA_POINTS - totalDataPointsAcrossTables;
            if (remainingDataPointsCapacity === 0) {
                isDataPointLimitReached = true;
                break;
            }

            let take = Math.min(configuredTake, tableRowCountMap[tableId]);
            const selectedColumnsCount = columnsMap.selectedColumns.length;
            const dataPoints = take * selectedColumnsCount;
            const canFitAllDataPoints = dataPoints <= remainingDataPointsCapacity;
            if (!canFitAllDataPoints) {
                take = Math.floor(remainingDataPointsCapacity / selectedColumnsCount);
                isDataPointLimitReached = true;
            }

            if (take !== 0) {
                const request = this.constructUndecimatedDataRequest(
                    tableId,
                    columnsMap,
                    query,
                    timeRange,
                    take
                );
                requests.push(request);
            }

            const dataPointsQueried = take * selectedColumnsCount;
            totalDataPointsAcrossTables += dataPointsQueried;

            if(isDataPointLimitReached) {
                break;
            }
        }
        return { requests, isDataPointLimitReached };
    }

    private constructUndecimatedDataRequest(
        tableId: string,
        columnsMap: TableColumnsData,
        query: ValidDataFrameQueryV2,
        timeRange: TimeRange,
        take: number
    ): UndecimatedDataRequest {
        const filters = this.constructColumnFilters(
            query,
            columnsMap,
            timeRange
        );
        const orderBy = query.xColumn
            ? [{ column: this.parseColumnIdentifier(query.xColumn).columnName }]
            : [
                {
                    column: columnsMap.columns.find(
                        column => column.columnType === ColumnType.Index
                    )!.name
                }
            ];

        return {
            tableId,
            columns: columnsMap.selectedColumns.map(column => column.name),
            orderBy,
            filters,
            take
        };
    }

    private constructColumnFilters(
        query: ValidDataFrameQueryV2,
        columnsMap: TableColumnsData,
        timeRange: TimeRange
    ): ColumnFilter[] {
        const nullFilters: ColumnFilter[] = query.filterNulls
            ? this.constructNullFilters(columnsMap.selectedColumns)
            : [];
        const xRangeFilters: ColumnFilter[] = query.filterXRangeOnZoomPan
            ? this.constructXRangeFilters(query.xColumn, columnsMap.columns, timeRange)
            : [];
        return [
            ...nullFilters,
            ...xRangeFilters
        ];
    }

    private constructXRangeFilters(
        xColumnIdentifier: string | null,
        columns: Column[],
        timeRange: TimeRange
    ): ColumnFilter[] {
        let updatedXColumnIdentifier = xColumnIdentifier;

        if (!updatedXColumnIdentifier) {
            const indexColumn = columns.find(column => column.columnType === 'INDEX');
            if (!indexColumn) {
                return [];
            }

            updatedXColumnIdentifier = this.getColumnIdentifier(
                indexColumn.name,
                indexColumn.dataType
            );
        }

        return this.constructRangeFilters(updatedXColumnIdentifier, columns, timeRange);
    }

    private constructRangeFilters(
        columnIdentifier: string,
        columns: Column[],
        timeRange: TimeRange
    ): ColumnFilter[] {
        const parsedColumnIdentifier = this.parseColumnIdentifier(columnIdentifier);

        switch (parsedColumnIdentifier.transformedDataType) {
            case 'Timestamp':
                return this.constructTimestampRangeFilters(
                    parsedColumnIdentifier.columnName,
                    timeRange,
                );
            case 'Numeric':
                if (!this.isHighResolutionZoomFeatureEnabled) {
                    return [];
                }
                return this.constructNumericRangeFilters(
                    parsedColumnIdentifier.columnName,
                    columns,
                );
            default:
                return [];
        }
    }

    private constructTimestampRangeFilters(
        columnName: string,
        timeRange: TimeRange,
    ): ColumnFilter[] {
        if (!columnName) {
            return [];
        }

        return this.createRangeFilters(
            columnName,
            timeRange.from.toISOString(),
            timeRange.to.toISOString()
        );
    }

    private constructNumericRangeFilters(
        columnName: string,
        columns: Column[],
    ): ColumnFilter[] {
        const column = columns.find(column => column.name === columnName);
        const columnDataType = column?.dataType;

        if (!columnDataType) {
            return [];
        }

        const rangeFromUrlParams = DataFrameQueryParamsHandler.getXColumnRangeFromUrlParams(columnName);

        if (!rangeFromUrlParams) {
            return [];
        }

        const formattedMin = this.formatValueForColumnType(
            rangeFromUrlParams.min,
            columnDataType,
            Math.ceil
        );
        const formattedMax = this.formatValueForColumnType(
            rangeFromUrlParams.max,
            columnDataType,
            Math.floor
        );

        if (
            !this.isValueInBounds(formattedMin, columnDataType) ||
            !this.isValueInBounds(formattedMax, columnDataType) ||
            formattedMin > formattedMax
        ) {
            return [];
        }

        return this.createRangeFilters(
            columnName,
            formattedMin.toString(),
            formattedMax.toString()
        );
    }

    private createRangeFilters(
        columnName: string,
        minValue: string,
        maxValue: string
    ): ColumnFilter[] {
        return [
            {
                column: columnName,
                operation: 'GREATER_THAN_EQUALS',
                value: minValue
            },
            {
                column: columnName,
                operation: 'LESS_THAN_EQUALS',
                value: maxValue
            },
        ];
    }

    private isValueInBounds(value: number, columnDataType: string): boolean {
        switch (columnDataType) {
            case 'INT32':
                return value >= INT32_MIN && value <= INT32_MAX;
            case 'INT64':
                return value >= INT64_MIN && value <= INT64_MAX;
            case 'FLOAT32':
                return value >= FLOAT32_MIN && value <= FLOAT32_MAX;
            case 'FLOAT64':
                return value >= FLOAT64_MIN && value <= FLOAT64_MAX;
            default:
                return false;
        }
    }

    private formatValueForColumnType(
        value: number,
        columnDataType: string,
        roundingFn: (value: number) => number = Math.round
    ): number {
        if (INTEGER_DATA_TYPES.includes(columnDataType)) {
            return roundingFn(value);
        }

        return parseFloat(value.toFixed(X_COLUMN_RANGE_DECIMAL_PRECISION));
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

    private getUndecimatedTableData$(request: UndecimatedDataRequest): Observable<TableDataRows> {
        const requestBody = {
            columns: request.columns,
            orderBy: request.orderBy,
            filters: request.filters.length > 0 ? request.filters : undefined,
            take: request.take,
            destination: 'INLINE',
            responseFormat: 'CSV',
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
                    payload: ['Error While Fetching Undecimated Table Data', errorMessage],
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
            const fatalErrors = parseResult.errors.filter(
                error => error.type !== 'Delimiter'
            );

            if (fatalErrors.length > 0) {
                const errorMessages = fatalErrors.map(error => error.message).join(', ');
                throw new Error(`SystemLink failed to parse the CSV data: ${errorMessages}`);
            }
        }

        const rows = parseResult.data;
        if (rows.length === 0) {
            return { frame: { columns: [], data: [] } };
        }

        const columns = rows[0];
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

    private createCustomPropertyOptions(
        properties: Set<string>,
        group: string
    ): Option[] {
        const options = Array.from(properties).map(property => ({
            label: property,
            value: `${property}${CUSTOM_PROPERTY_SUFFIX}`,
            group
        }));

        return this.sortOptionsByLabel(options);
    }

    private sortOptionsByLabel(options: Option[]): Option[] {
        return options.sort((option1, option2) => option1.label.localeCompare(option2.label));
    }

    private tablesContainsColumns(tables: TableProperties[]): boolean {
        return tables.length > 0 && tables[0].columns !== undefined;
    }

    private tablesContainsProperties(tables: TableProperties[]): boolean {
        if (tables.length === 0) {
            return false;
        }

        const hasTableProperties = tables.some(table => table.properties !== undefined);
        const hasColumnProperties = tables.some(table => 
            table.columns?.some(column => column.properties !== undefined)
        );

        return hasTableProperties || hasColumnProperties;
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
        const isDataQueryType = query.type === DataFrameQueryType.Data;
        
        if (!isDataQueryType || !this.hasRequiredFilters(query)) {
            return false;
        }

        const isUndecimatedDataQuery = this.isUndecimatedDataQuery(query);

        if (isUndecimatedDataQuery) {
            const recordCount =  
                query.undecimatedRecordCount ?? this.defaultQuery.undecimatedRecordCount;  
            const isUndecimatedRecordCountValid =  
                typeof recordCount === 'number'  
                && recordCount > 0  
                && recordCount <= UNDECIMATED_RECORDS_LIMIT;

            return isUndecimatedRecordCountValid;
        }

        return true;
    }

    public hasRequiredFilters(query: ValidDataFrameQueryV2): boolean {
        return (
            query.resultFilter !== ''
            || query.dataTableFilter !== ''
        );
    }

    private isUndecimatedDataQuery(query: ValidDataFrameQueryV2): boolean {
        return query.decimationMethod === 'NONE';
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

                if (this.isUndecimatedDataQuery(processedQuery)) {
                    projections.push(DataTableProjections.RowCount);
                }

                if (processedQuery.showUnits) {
                    projections.push(DataTableProjections.ColumnProperties);  
                }

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
                            processedQuery.includeIndexColumns,
                            processedQuery.showUnits
                        );

                        const tableRowCountMap: Record<string, number> = Object.fromEntries(
                            tables.map(table => [table.id, table.rowCount])
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
                                : this.getTableData$(
                                    tableColumnsMap,
                                    tableRowCountMap,
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
                                        selectedColumnIdentifiers,
                                        processedQuery.showUnits
                                    );
                                    const notices = result.isLimitExceeded ? [
                                        {
                                            severity: 'warning' as const,
                                            text: `Data limited to ${MAXIMUM_DATA_POINTS.toLocaleString()} data points. Some data is not displayed. Refine your filters or reduce the number of selected columns to see all data.`
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
        selectedColumnIdentifiers: string[],
        showUnits: boolean
    ): FieldDTO[] {
        let uniqueOutputColumns = this.getUniqueColumns(
            Object.values(tableColumnsMap)
                .flatMap(columnsData => columnsData.selectedColumns)
        );
        uniqueOutputColumns = this.sortColumnsByType(uniqueOutputColumns, xColumn);

        const fields: FieldDTO[] = [
            ...uniqueOutputColumns.map(column => {
                const config: FieldDTO['config'] = {};

                if (showUnits) {
                    const unit = this.getUnitForColumn(column);
                    if (unit) {
                        config.unit = unit;
                    }
                }

                return this.createField({
                    name: column.displayName,
                    type: this.getFieldTypeForDataType(column.dataType),
                    values: [],
                    config
                })
            }),
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

            const columnInfoByDisplayName: Map<string, ColumnWithDisplayName> = tableColumnsData 
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
                        const columnDetails = columnInfoByDisplayName.get(field.name);

                        if (!columnDetails) {
                            const emptyValues = Array(rowCount).fill(null);
                            field.values = field.values!.concat(emptyValues);
                            break;
                        }

                        const { 
                            name: actualColumnName,
                            dataType: columnDataType
                        } = columnDetails;
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
            const key = this.getColumnIdentifier(column.displayName, column.dataType);
            if (!uniqueColumnsMap.has(key)) {
                uniqueColumnsMap.set(key, column);
            }
        });
        return Array.from(uniqueColumnsMap.values());
    }

    private getUnitForColumn(column?: Column): string {
        const properties = column?.properties ?? {};
        const matchedUnitPropertyKey = POSSIBLE_UNIT_CUSTOM_PROPERTY_KEYS.find(name => properties[name]);
        return matchedUnitPropertyKey ? properties[matchedUnitPropertyKey] : '';
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
        includeIndexColumns: boolean,
        showUnits: boolean
    ): Record<string, TableColumnsData> {
        const selectedTableColumnsMap: Record<string, TableColumnsData> = {};
        const uniqueColumnsAcrossTables = this.getUniqueColumnsAcrossTables(tables);
        tables.forEach(table => {
            const selectedColumns = this.getSelectedColumnsForTable(
                selectedColumnIdentifiers,
                table,
                includeIndexColumns
            ).map(column => {
                let displayName = uniqueColumnsAcrossTables.find(
                    uniqueColumn => uniqueColumn.value === this.getColumnIdentifier(column.name, column.dataType)
                )?.label || '';

                if (showUnits) {
                    const unit = this.getUnitForColumn(column);
                    if (unit) {
                        displayName += ` (${unit})`;
                    }
                }

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
                    properties: column.properties ?? {}
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

        return flattenedData.slice(0, MAXIMUM_DATA_POINTS);
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

    private isCustomProperty(property:  string): boolean {
        return property.endsWith(CUSTOM_PROPERTY_SUFFIX);
    }

    private extractCustomProperty(property: string): string {
        return property.slice(0, -CUSTOM_PROPERTY_SUFFIX.length);
    }

    private getStandardAndCustomProperties(properties: string[]): PropertySelections {
        const customProperties: string[] = [];
        const standardProperties: DataTableProperties[] = [];
        for (const property of properties) {
            if (this.isCustomProperty(property)) {
                customProperties.push(property);
            } else if (ALL_STANDARD_PROPERTIES.has(property)) {
                standardProperties.push(property as DataTableProperties);
            }
        }
        return { customProperties, standardProperties };
    }

    private getFieldsForPropertiesQuery$(processedQuery: ValidDataFrameQueryV2): Observable<DataFrameDTO> {
        const selectedDataTableProperties = this.getStandardAndCustomProperties(
            processedQuery.dataTableProperties
        );
        const selectedColumnProperties = this.getStandardAndCustomProperties(
            processedQuery.columnProperties
        );

        const selectedStandardProperties = new Set<DataTableProperties>([
            ...selectedDataTableProperties.standardProperties,
            ...selectedColumnProperties.standardProperties,
        ]);

        if (selectedDataTableProperties.customProperties.length > 0) {
            selectedStandardProperties.add(DataTableProperties.Properties);
        }

        if (selectedColumnProperties.customProperties.length > 0) {
            selectedStandardProperties.add(DataTableProperties.ColumnProperties);
        }

        const projections = [...selectedStandardProperties]
            .map(property => DataTableProjectionLabelLookup[property].projection);
        const tables$ = this.getTables$(
            processedQuery,
            projections
        );
        const flattenedTablesWithColumns$ = tables$.pipe(
            map(tables => this.flattenTablesWithColumns(tables))
        );
        const workspaces$ = from(this.loadWorkspaces());
        const dataFrame$ = flattenedTablesWithColumns$.pipe(
            combineLatestWith(workspaces$),
            map(([flattenedTablesWithColumns, workspaces]) => {
                if (
                    !this.areSelectedCustomPropertiesValid(
                        selectedDataTableProperties.customProperties,
                        selectedColumnProperties.customProperties,
                        flattenedTablesWithColumns
                    )
                ) {
                    const errorMessage = 'One or more selected properties are invalid. Please update your properties selection or refine your filters.';
                    this.appEvents?.publish?.({
                        type: AppEvents.alertError.name,
                        payload: ['Properties selection error', errorMessage],
                    });
                    throw new Error(errorMessage);
                }

                const fields: FieldDTO[] = [];
                const includeDataTableCustomProperties = selectedStandardProperties.has(
                    DataTableProperties.Properties
                );
                const fieldNames = new Set<string>();
                const includeColumnCustomProperties = selectedStandardProperties.has(
                    DataTableProperties.ColumnProperties
                );
                const filteredStandardProperties = [...selectedStandardProperties].filter(
                    property => property !== DataTableProperties.Properties
                    && property !== DataTableProperties.ColumnProperties
                );

                filteredStandardProperties.forEach(property => {
                    const values = this.getFieldValues(
                        flattenedTablesWithColumns,
                        property,
                        workspaces
                    );
                    const name = DataTableProjectionLabelLookup[property].label;
                    fieldNames.add(name);
                    fields.push({
                        name,
                        type: this.getFieldType(property),
                        values
                    });
                });

                let customPropertyColumnsLimit = CUSTOM_PROPERTY_COLUMNS_LIMIT;
                /**
                 * If @see DataTableProperties.Properties is selected,
                 * flatten it into separate fields in the data frame output
                 */
                if (includeDataTableCustomProperties) {
                    const includeAllCustomProperties = selectedDataTableProperties
                        .standardProperties.includes(DataTableProperties.Properties);
                    const customPropertyFields = this.createFieldsFromCustomProperties(
                        flattenedTablesWithColumns,
                        table => table.properties,
                        customPropertyColumnsLimit,
                        fieldNames,
                        'Data table',
                        includeAllCustomProperties,
                        selectedDataTableProperties.customProperties
                    );
                    customPropertyFields.forEach(field => fieldNames.add(field.name));
                    customPropertyColumnsLimit -= customPropertyFields.length;
                    fields.push(...customPropertyFields);
                }

                /**
                 * If @see DataTableProperties.ColumnProperties is selected,
                 * flatten it into separate fields in the data frame output
                 */
                if (includeColumnCustomProperties) {
                    const includeAllCustomProperties = selectedColumnProperties
                        .standardProperties.includes(DataTableProperties.ColumnProperties);
                    const customPropertyFields = this.createFieldsFromCustomProperties(
                        flattenedTablesWithColumns,
                        table => table.columnProperties,
                        customPropertyColumnsLimit,
                        fieldNames,
                        'Column',
                        includeAllCustomProperties,
                        selectedColumnProperties.customProperties
                    );
                    customPropertyFields.forEach(field => fieldNames.add(field.name));
                    customPropertyColumnsLimit -= customPropertyFields.length;
                    fields.push(...customPropertyFields);
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

    private getTables$(
        processedQuery: ValidDataFrameQueryV2,
        projections: DataTableProjections[]
    ): Observable<TableProperties[]> {
        const propertiesQueryCache = this.propertiesQueryCache.get(processedQuery.refId);
        const filters = {
            resultFilter: processedQuery.resultFilter,
            dataTableFilter: processedQuery.dataTableFilter,
            columnFilter: processedQuery.columnFilter
        };
        const requestInputs = JSON.stringify({
            filters,
            take: processedQuery.take,
            projections,
        });
        const selectedProperties: string[] = [
            ...processedQuery.dataTableProperties,
            ...processedQuery.columnProperties
        ];

        const isOnlyCustomPropertiesChanged = this.isOnlyCustomPropertySelectionsChanged(
            propertiesQueryCache,
            requestInputs,
            selectedProperties
        );
        if (isOnlyCustomPropertiesChanged) {
            return of(propertiesQueryCache!.response);
        }

        const projectionExcludingId = projections
            .filter(projection => projection !== DataTableProjections.Id);
        return this.queryTables$(
            filters,
            processedQuery.take,
            projectionExcludingId,
        ).pipe(
            tap(response => {
                const updatedPropertiesQueryCache: PropertiesQueryCache = {
                    requestInputs,
                    selectedProperties,
                    response
                };
                this.propertiesQueryCache.set(
                    processedQuery.refId,
                    updatedPropertiesQueryCache
                );
            }),
            catchError(error => {
                this.propertiesQueryCache.delete(processedQuery.refId);
                throw error;
            })
        );
    }

    private isOnlyCustomPropertySelectionsChanged(
        propertiesQueryCache: PropertiesQueryCache | undefined,
        requestInputs: string,
        selectedProperties: string[]
    ): boolean {
        if (
            !propertiesQueryCache
            || propertiesQueryCache.requestInputs !== requestInputs
        ) {
            return false;
        }

        return !_.isEqual(propertiesQueryCache.selectedProperties, selectedProperties);
    }

    private areSelectedCustomPropertiesValid(
        selectedDataTableCustomProperties: string[],
        selectedColumnCustomProperties: string[],
        tables: FlattenedTableProperties[]
    ): boolean {
        if( 
            selectedDataTableCustomProperties.length === 0 
            && selectedColumnCustomProperties.length === 0
        ) {
            return true;
        }

        let allDataTableCustomPropertyKeys = new Set<string>();
        if (selectedDataTableCustomProperties.length > 0) {
            allDataTableCustomPropertyKeys = this.getUniqueCustomPropertyKeys(
                tables,
                table => table.properties,
            );
        }

        let allColumnCustomPropertyKeys = new Set<string>();
        if (selectedColumnCustomProperties.length > 0) {
            allColumnCustomPropertyKeys = this.getUniqueCustomPropertyKeys(
                tables,
                table => table.columnProperties,
            );
        }

        const areDataTableCustomPropertiesValid = selectedDataTableCustomProperties.every(
            selectedDataTableCustomProperty => {
                const selectedCustomProperty = this.extractCustomProperty(
                    selectedDataTableCustomProperty
                );
                return selectedCustomProperty 
                    ? allDataTableCustomPropertyKeys.has(selectedCustomProperty) 
                    : false;
            }
        );
        const areColumnCustomPropertiesValid = selectedColumnCustomProperties.every(
            selectedColumnCustomProperty => {
                const selectedCustomProperty = this.extractCustomProperty(
                    selectedColumnCustomProperty
                );
                return selectedCustomProperty 
                    ? allColumnCustomPropertyKeys.has(selectedCustomProperty) 
                    : false;
            }
        );

        return areDataTableCustomPropertiesValid && areColumnCustomPropertiesValid;
    }

    private createFieldsFromCustomProperties(
        tables: FlattenedTableProperties[],
        propertyAccessor: (table: FlattenedTableProperties) => Record<string, string> | undefined,
        limit: number,
        existingFieldNames: Set<string>,
        fieldNameSuffix: string,
        includeAllCustomProperties: boolean,
        selectedCustomProperties: string[]
    ): FieldDTO[] {
        let uniqueCustomPropertyKeys = new Set<string>();
        if (includeAllCustomProperties) {
            uniqueCustomPropertyKeys = this.getUniqueCustomPropertyKeys(
                tables,
                propertyAccessor,
                limit,
            );
        }

        for (const property of selectedCustomProperties) {
            const selectedCustomProperty = this.extractCustomProperty(property);
            if (selectedCustomProperty) {
                uniqueCustomPropertyKeys.add(selectedCustomProperty);
            }
        }

        const sortedPropertyKeys = Array.from(uniqueCustomPropertyKeys)
            .sort((propertyKey1, propertyKey2) => propertyKey1.localeCompare(propertyKey2));

        return sortedPropertyKeys.map(propertyKey => (this.createField({
            name: this.getCustomPropertyFieldName(propertyKey, existingFieldNames, fieldNameSuffix),
            type: FieldType.string,
            values: tables.map(table => propertyAccessor(table)?.[propertyKey])
        })));
    }

    private getCustomPropertyFieldName(
        propertyKey: string,
        existingFieldNames: Set<string>,
        fieldNameSuffix: string
    ): string {
        return existingFieldNames.has(propertyKey)
            ? `${propertyKey} (${fieldNameSuffix})`
            : propertyKey;
    }

    private getUniqueCustomPropertyKeys(
        tables: FlattenedTableProperties[],
        propertyAccessor: (table: FlattenedTableProperties) => Record<string, string> | undefined,
        limit?: number,
    ): Set<string> {
        const propertyKeysSet = new Set<string>();
        for (const table of tables) {
            const properties = propertyAccessor(table);
            if (properties) {
                for (const key of Object.keys(properties)) {
                    propertyKeysSet.add(key);
                    if (limit !== undefined && propertyKeysSet.size >= limit) {
                        return propertyKeysSet;
                    }
                }
            }
        }
        return propertyKeysSet;
    }

    private queryResults$(
        resultFilter: string
    ): Observable<DataFrameResultsResponseProperties[]> {
        const queryResultsUrl = `${this.instanceSettings.url}/nitestmonitor/v2/query-results`;
        const requestBody = {
            filter: resultFilter,
            projection: ['id', 'dataTableIds'],
            take: RESULT_IDS_LIMIT,
            orderBy: 'UPDATED_AT',
            descending: true
        };

        return this.post$<DataFrameQueryResultsResponse>(
            queryResultsUrl,
            requestBody,
            { showErrorAlert: false }
        ).pipe(
            map(response => {
                if (!response.results || response.results.length === 0) {
                    return [];
                }
                return response.results;
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

    private buildResultFilter(
        results: DataFrameResultsResponseProperties[]
    ): { filter: string; substitutions?: string[] } {
        if (results.length === 0) {
            return { filter: '' };
        }

        const {
            resultIds,
            dataTableIds
        } = this.extractResultAndDataTableIds(results);

        const resultIdFilter = this.buildPlaceholderContainsFilter(
            'testResultId',
            resultIds.length,
            0
        );
        if (dataTableIds.length === 0) {
            return {
                filter: resultIdFilter,
                substitutions: resultIds
            };
        }

        const dataTableIdFilter = this.buildPlaceholderContainsFilter(
            'id',
            dataTableIds.length,
            resultIds.length
        );
        return {
            filter: `(${resultIdFilter})||(${dataTableIdFilter})`,
            substitutions: [...resultIds, ...dataTableIds]
        };
    }

    private buildPlaceholderContainsFilter(
        fieldName: string,
        count: number,
        startIndex: number
    ): string {
        const placeholders = Array.from(
            { length: count },
            (_, index) => `@${startIndex + index}`
        ).join(',');
        return `new[]{${placeholders}}.Contains(${fieldName})`;
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

    private resolveDataTableProperties(query: DataFrameDataQuery): string[] {
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
    ): boolean {
        if ('filterXRangeOnZoomPan' in query && query.filterXRangeOnZoomPan !== undefined) {
            return query.filterXRangeOnZoomPan;
        }

        if ('applyTimeFilters' in query && query.applyTimeFilters !== undefined) {
            return query.applyTimeFilters;
        }

        return defaultQueryV2.filterXRangeOnZoomPan;
    }

    private extractResultAndDataTableIds(
        results: DataFrameResultsResponseProperties[]
    ): { resultIds: string[]; dataTableIds: string[] } {
        const resultIds: string[] = [];
        const dataTableIdSet = new Set<string>();

        for (const { id, dataTableIds } of results) {
            resultIds.push(id);
            dataTableIds?.forEach(dataTableId => {
                if (dataTableIdSet.size < DATA_TABLES_IDS_LIMIT) {
                    dataTableIdSet.add(dataTableId);
                }
            });
        }

        return { resultIds, dataTableIds: [...dataTableIdSet] };
    }
}
