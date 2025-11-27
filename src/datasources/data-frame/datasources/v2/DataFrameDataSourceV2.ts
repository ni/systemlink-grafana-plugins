import { AppEvents, DataFrameDTO, DataQueryRequest, DataSourceInstanceSettings, FieldType, LegacyMetricFindQueryOptions, MetricFindValue, ScopedVars, TimeRange } from "@grafana/data";
import { DataFrameDataSourceBase } from "../../DataFrameDataSourceBase";
import { BackendSrv, getBackendSrv, TemplateSrv, getTemplateSrv } from "@grafana/runtime";
import { Column, Option, DataFrameDataQuery, DataFrameDataSourceOptions, DataFrameQueryType, DataFrameQueryV2, DataFrameVariableQuery, DataFrameVariableQueryType, DataTableProjectionLabelLookup, DataTableProjections, DataTableProperties, defaultQueryV2, defaultVariableQueryV2, FlattenedTableProperties, TableDataRows, TableProperties, TablePropertiesList, ValidDataFrameQueryV2, ValidDataFrameVariableQuery, DataFrameQueryV1, DecimatedDataRequest, ColumnFilter, CombinedFilters } from "../../types";
import { COLUMN_OPTIONS_LIMIT, DELAY_BETWEEN_REQUESTS_MS, REQUESTS_PER_SECOND, TAKE_LIMIT, TOTAL_ROWS_LIMIT } from "datasources/data-frame/constants";
import { ExpressionTransformFunction, listFieldsQuery, multipleValuesQuery, timeFieldsQuery, transformComputedFieldsQuery } from "core/query-builder.utils";
import { LEGACY_METADATA_TYPE, Workspace } from "core/types";
import { extractErrorInfo } from "core/errors";
import { DataTableQueryBuilderFieldNames } from "datasources/data-frame/components/v2/constants/DataTableQueryBuilder.constants";
import _ from "lodash";
import { catchError, combineLatestWith, concatMap, forkJoin, from, lastValueFrom, map, mergeMap, Observable, of, reduce, timer } from "rxjs";
import { ResultsQueryBuilderFieldNames } from "datasources/results/constants/ResultsQueryBuilder.constants";

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
                options?.scopedVars! || ''
            );
        }

        if (processedQuery.queryType === DataFrameVariableQueryType.ListDataTables) {
            const filters = {
                dataTableFilter: processedQuery.dataTableFilter,
            };
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

        const columns = await this.getColumnOptions(processedQuery.dataTableFilter);
        const limitedColumns = columns.splice(0, COLUMN_OPTIONS_LIMIT);

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
        // TODO: Implement logic to combine with result and column filters.
        return this.queryTablesInternal$(filters.dataTableFilter!, take, projections);
    }

    private queryTablesInternal$(
        filter: string,
        take = TAKE_LIMIT,
        projection?: DataTableProjections[]
    ): Observable<TableProperties[]> {
        const response = this.post$<TablePropertiesList>(
            `${this.baseUrl}/query-tables`,
            { filter, take, projection },
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

    public async getColumnOptionsWithVariables(filter: string): Promise<Option[]> {
        const columnOptionsWithoutVariables = await this.getColumnOptions(
            filter
        );
        const columnOptionsWithVariables = [
            ...this.getVariableOptions(),
            ...columnOptionsWithoutVariables
        ];
        return columnOptionsWithVariables;
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

    private async getColumnOptions(dataTableFilter: string): Promise<Option[]> {
        const tables = await lastValueFrom(
            this.queryTables$({ dataTableFilter }, TAKE_LIMIT, [
                DataTableProjections.ColumnName,
                DataTableProjections.ColumnDataType,
            ]));

        const hasColumns = tables.some(
            table => Array.isArray(table.columns)
                && table.columns.length > 0
        );
        if (!hasColumns) {
            return [];
        }

        const columnTypeMap = this.createColumnNameDataTypesMap(tables);

        return this.createColumnOptions(columnTypeMap);
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
            this.dataTableComputedDataFields,
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

    private createColumnOptions(columnTypeMap: Record<string, Set<string>>): Option[] {
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
        const tables$ = this.queryTables$(
            { dataTableFilter: processedQuery.dataTableFilter },
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
}
