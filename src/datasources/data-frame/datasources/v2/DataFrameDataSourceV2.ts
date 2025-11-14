import { AppEvents, DataFrameDTO, DataQueryRequest, DataSourceInstanceSettings, FieldType, LegacyMetricFindQueryOptions, MetricFindValue, ScopedVars, TimeRange } from "@grafana/data";
import { DataFrameDataSourceBase } from "../../DataFrameDataSourceBase";
import { BackendSrv, getBackendSrv, TemplateSrv, getTemplateSrv } from "@grafana/runtime";
import { Column, Option, DataFrameDataQuery, DataFrameDataSourceOptions, DataFrameQueryType, DataFrameQueryV2, DataFrameVariableQuery, DataFrameVariableQueryType, DataTableProjectionLabelLookup, DataTableProjections, DataTableProperties, defaultQueryV2, defaultVariableQueryV2, FlattenedTableProperties, TableDataRows, TableProperties, TablePropertiesList, ValidDataFrameQuery, ValidDataFrameQueryV2, ValidDataFrameVariableQuery } from "../../types";
import { TAKE_LIMIT } from "datasources/data-frame/constants";
import { ExpressionTransformFunction, multipleValuesQuery, timeFieldsQuery, transformComputedFieldsQuery } from "core/query-builder.utils";
import { Workspace } from "core/types";
import { extractErrorInfo } from "core/errors";
import { DataTableQueryBuilderFieldNames } from "datasources/data-frame/components/v2/constants/DataTableQueryBuilder.constants";
import { ComboboxOption } from "@grafana/ui";
import { QueryResultsResponse, ResultsProperties } from "datasources/results/types/QueryResults.types";
import { ResultsQueryBuilderFieldNames } from "datasources/results/constants/ResultsQueryBuilder.constants";
import { ColumnsQueryBuilderFieldNames } from "datasources/data-frame/components/v2/constants/ColumnsQueryBuilder.constants";

const RESULTS_QUERY_TAKE_LIMIT = 1001;
const RESULTS_QUERY_MAX_IDS = 1000;
const RESULTS_QUERY_ORDER_BY = 'UPDATED_AT';
const RESULTS_QUERY_PROJECTION: ResultsProperties[] = [ResultsProperties.id];

export class DataFrameDataSourceV2 extends DataFrameDataSourceBase<DataFrameQueryV2> {
    defaultQuery = defaultQueryV2;
    private readonly queryResultsUrl = `${this.instanceSettings.url}/nitestmonitor/v2/query-results`;
    private readonly columnNameExpressionTransformer = multipleValuesQuery('it.Name');
    private readonly columnsComputedDataFields = new Map<string, ExpressionTransformFunction>([
        [
            ColumnsQueryBuilderFieldNames.ColumnName,
            (value, operation) => `columns.Any(${this.columnNameExpressionTransformer(value, operation)})`,
        ],
    ]);
    private readonly resultsComputedDataFields = new Map<string, ExpressionTransformFunction>(
        Object.values(ResultsQueryBuilderFieldNames).map(field => [
            field,
            field === ResultsQueryBuilderFieldNames.UPDATED_AT || field === ResultsQueryBuilderFieldNames.STARTED_AT
                ? timeFieldsQuery(field)
                : multipleValuesQuery(field),
        ])
    );

    public constructor(
        public readonly instanceSettings: DataSourceInstanceSettings<DataFrameDataSourceOptions>,
        public readonly backendSrv: BackendSrv = getBackendSrv(),
        public readonly templateSrv: TemplateSrv = getTemplateSrv()
    ) {
        super(instanceSettings, backendSrv, templateSrv);
    }

    async runQuery(
        query: DataFrameQueryV2,
        options: DataQueryRequest<DataFrameQueryV2>
    ): Promise<DataFrameDTO> {
        const processedQuery = this.processQuery(query);
        const scopedVars = options.scopedVars;

        const transformedDataTableFilter = this.transformDataTableFilter(processedQuery.dataTableFilter, scopedVars);
        processedQuery.dataTableFilter = transformedDataTableFilter;

    const transformedColumnsFilter = this.transformColumnsFilter(processedQuery.columnsFilter, scopedVars);
    processedQuery.columnsFilter = transformedColumnsFilter ?? '';

        let resultIds: string[] = [];
        if (processedQuery.resultsFilter) {
            const { ids } = await this.fetchResultIds(processedQuery.resultsFilter, scopedVars);

            if (ids.length === 0) {
                return this.createEmptyResult(processedQuery.refId);
            }

            resultIds = ids;
        }

        const combinedFilter = this.buildTablesFilter({
            dataTableFilter: transformedDataTableFilter,
            columnsFilter: transformedColumnsFilter,
            resultIds,
        });

        if (this.shouldQueryForProperties(processedQuery)) {
            return this.getFieldsForPropertiesQuery(processedQuery, {
                filter: combinedFilter ?? transformedDataTableFilter,
                substitutions: resultIds,
            });
        }

        return this.createEmptyResult(processedQuery.refId);
    }

    async metricFindQuery(
        query: DataFrameVariableQuery,
        options: LegacyMetricFindQueryOptions
    ): Promise<MetricFindValue[]> {
        const processedQuery = this.processVariableQuery(query);
        const scopedVars = options.scopedVars;

        const transformedDataTableFilter = this.transformDataTableFilter(processedQuery.dataTableFilter, scopedVars);
        processedQuery.dataTableFilter = transformedDataTableFilter;

        const transformedColumnsFilter = this.transformColumnsFilter(processedQuery.columnsFilter, scopedVars);
        processedQuery.columnsFilter = transformedColumnsFilter ?? '';

        let resultIds: string[] = [];
        if (processedQuery.resultsFilter) {
            const { ids } = await this.fetchResultIds(processedQuery.resultsFilter, scopedVars);

            if (ids.length === 0) {
                return [];
            }

            resultIds = ids;
        }

        if (processedQuery.queryType === DataFrameVariableQueryType.ListDataTables) {
            const combinedFilter = this.buildTablesFilter({
                dataTableFilter: transformedDataTableFilter,
                columnsFilter: undefined,
                resultIds,
            });

            const tables = await this.queryTables(
                combinedFilter ?? transformedDataTableFilter,
                TAKE_LIMIT,
                [DataTableProjections.Name],
                resultIds
            );

            return tables.map(table => ({
                text: table.name,
                value: table.id,
            }));
        }

        if (processedQuery.queryType === DataFrameVariableQueryType.ListColumns) {
            const combinedFilter = this.buildTablesFilter({
                dataTableFilter: transformedDataTableFilter,
                columnsFilter: transformedColumnsFilter,
                resultIds,
            });

            const tables = await this.queryTables(
                combinedFilter ?? transformedDataTableFilter,
                TAKE_LIMIT,
                [DataTableProjections.ColumnName],
                resultIds
            );

            const columnNames = new Set<string>();
            tables.forEach(table => {
                table.columns?.forEach(column => {
                    if (column?.name) {
                        columnNames.add(column.name);
                    }
                });
            });

            return Array.from(columnNames)
                .sort((a, b) => a.localeCompare(b))
                .map(name => ({ text: name, value: name }));
        }

        return [];
    }

    shouldRunQuery(query: ValidDataFrameQuery): boolean {
        const processedQuery = this.processQuery(query);

        return !processedQuery.hide && processedQuery.type === DataFrameQueryType.Properties;
    }

    processQuery(query: DataFrameDataQuery): ValidDataFrameQueryV2 {
        // TODO: #3259801 - Implement Migration of DataFrameQueryV1 to ValidDataFrameQueryV2.
        return {
            ...defaultQueryV2,
            ...query
        } as ValidDataFrameQueryV2;
    }

    public processVariableQuery(query: DataFrameVariableQuery): ValidDataFrameVariableQuery {
        // TODO: #3259801 - Implement Migration of DataFrameQueryV1 to ValidDataFrameVariableQuery.
        return {
            ...defaultVariableQueryV2,
            ...query
        } as ValidDataFrameVariableQuery;
    }

    async getTableProperties(_id?: string): Promise<TableProperties> {
        throw new Error('Method not implemented.');
    }

    async getDecimatedTableData(
        _query: DataFrameQueryV2,
        _columns: Column[],
        _timeRange: TimeRange,
        _intervals?: number | undefined
    ): Promise<TableDataRows> {
        // TODO: Implement logic to fetch and return decimated table data based on the query, columns, time range, and intervals.
        throw new Error('Method not implemented.');
    }

    async queryTables(
        filter: string,
        take = TAKE_LIMIT,
        projection?: DataTableProjections[],
        substitutions?: string[]
    ): Promise<TableProperties[]> {
        try {
            const body: {
                filter: string;
                take: number;
                projection?: DataTableProjections[];
                substitutions?: string[];
                interactive: boolean;
            } = {
                filter,
                take,
                projection,
                interactive: true,
            };

            if (substitutions?.length) {
                body.substitutions = substitutions;
            }

            const response = await this.post<TablePropertiesList>(
                `${this.baseUrl}/query-tables`,
                body,
                { useApiIngress: true }
            );
            return response.tables;
        } catch (error) {
            const errorDetails = extractErrorInfo((error as Error).message);
            let errorMessage: string;

            switch (errorDetails.statusCode) {
                case '':
                    errorMessage = 'The query failed due to an unknown error.';
                    break;
                case '429':
                    errorMessage = 'The query to fetch data tables failed due to too many requests. Please try again later.';
                    break;
                case '504':
                    errorMessage = 'The query to fetch data tables experienced a timeout error. Narrow your query with a more specific filter and try again.';
                    break;
                default:
                    errorMessage = `The query failed due to the following error: (status ${errorDetails.statusCode}) ${errorDetails.message}.`;
                    break;
            }

            this.appEvents?.publish?.({
                type: AppEvents.alertError.name,
                payload: ['Error during data tables query', errorMessage],
            });

            throw new Error(errorMessage);
        }
    }

    public async getColumnOptions(filter: string, resultsFilter?: string): Promise<{ options: ComboboxOption[]; hasMore: boolean; }> {
        if (!filter?.trim()) {
            return { options: [], hasMore: false };
        }

        const transformedDataTableFilter = this.transformDataTableFilter(filter);

        let resultIds: string[] = [];
        let hasMore = false;
        if (resultsFilter) {
            const result = await this.fetchResultIds(resultsFilter);
            const { ids } = result;
            hasMore = result.hasMore;

            if (ids.length === 0) {
                return { options: [], hasMore };
            }

            resultIds = ids;
        }

        const combinedFilter = this.buildTablesFilter({
            dataTableFilter: transformedDataTableFilter,
            columnsFilter: undefined,
            resultIds,
        });

        const tables = await this.queryTables(combinedFilter ?? transformedDataTableFilter, TAKE_LIMIT, [
            DataTableProjections.ColumnName,
            DataTableProjections.ColumnDataType,
        ], resultIds.length ? resultIds : undefined);

        const hasColumns = tables.some(
            table => Array.isArray(table.columns)
                && table.columns.length > 0
        );
        if (!hasColumns) {
            return { options: [], hasMore };
        }

        const columnTypeMap = this.createColumnNameDataTypesMap(tables);

        return {
            options: this.createColumnOptions(columnTypeMap),
            hasMore,
        };
    }

    public async getTablesForResultsFilter(resultsFilter?: string): Promise<{ tables: TableProperties[]; hasMore: boolean; }> {
        const { ids, hasMore } = await this.fetchResultIds(resultsFilter);

        if (!resultsFilter?.trim() || ids.length === 0) {
            return { tables: [], hasMore };
        }

        const combinedFilter = this.buildTablesFilter({
            dataTableFilter: '',
            columnsFilter: undefined,
            resultIds: ids,
        });

        const tables = await this.queryTables(
            combinedFilter ?? '',
            RESULTS_QUERY_MAX_IDS,
            [DataTableProjections.Id, DataTableProjections.Name],
            ids
        );

        return {
            tables,
            hasMore,
        };
    }

    private createEmptyResult(refId: string): DataFrameDTO {
        return {
            refId,
            name: refId,
            fields: [],
        };
    }

    private transformResultsFilter(filter?: string, scopedVars?: ScopedVars): string | undefined {
        if (!filter?.trim()) {
            return undefined;
        }

        const replacedFilter = this.templateSrv.replace(filter, scopedVars);
        return transformComputedFieldsQuery(replacedFilter, this.resultsComputedDataFields);
    }

    private transformDataTableFilter(filter?: string, scopedVars?: ScopedVars): string {
        if (!filter) {
            return '';
        }

        const replacedFilter = this.templateSrv.replace(filter, scopedVars);
        return transformComputedFieldsQuery(replacedFilter, this.dataTableComputedDataFields);
    }

    private transformColumnsFilter(filter?: string, scopedVars?: ScopedVars): string | undefined {
        if (!filter?.trim()) {
            return undefined;
        }

        const replacedFilter = this.templateSrv.replace(filter, scopedVars);
        return transformComputedFieldsQuery(replacedFilter, this.columnsComputedDataFields);
    }

    private buildTablesFilter({
        dataTableFilter,
        columnsFilter,
        resultIds,
    }: {
        dataTableFilter?: string;
        columnsFilter?: string;
        resultIds: string[];
    }): string | undefined {
        const clauses: string[] = [];

        if (resultIds.length) {
            const placeholders = resultIds.map((_, index) => `@${index}`).join(', ');
            clauses.push(`(new[] {${placeholders}}.Contains(testResultId))`);
        }

        if (dataTableFilter?.trim()) {
            clauses.push(dataTableFilter.startsWith('(') ? dataTableFilter : `(${dataTableFilter})`);
        }

        if (resultIds.length && columnsFilter?.trim()) {
            clauses.push(columnsFilter.startsWith('(') ? columnsFilter : `(${columnsFilter})`);
        }

        if (!clauses.length) {
            return dataTableFilter?.trim() ? dataTableFilter : undefined;
        }

        return clauses.join(' && ');
    }

    private async fetchResultIds(resultsFilter?: string, scopedVars?: ScopedVars): Promise<{ ids: string[]; hasMore: boolean; }> {
        const transformedFilter = this.transformResultsFilter(resultsFilter, scopedVars);

        if (!transformedFilter?.trim()) {
            return { ids: [], hasMore: false };
        }

        const response = await this.queryResults(transformedFilter);
        const results = response.results ?? [];
        const ids = results.map(result => result.id).filter((id): id is string => Boolean(id));
        const hasMore = results.length === RESULTS_QUERY_TAKE_LIMIT;

        return {
            ids: ids.slice(0, RESULTS_QUERY_MAX_IDS),
            hasMore,
        };
    }

    private async queryResults(filter: string): Promise<QueryResultsResponse> {
        try {
            return await this.post<QueryResultsResponse>(
                this.queryResultsUrl,
                {
                    filter,
                    orderBy: RESULTS_QUERY_ORDER_BY,
                    descending: true,
                    projection: RESULTS_QUERY_PROJECTION,
                    take: RESULTS_QUERY_TAKE_LIMIT,
                    returnCount: false,
                },
                { showErrorAlert: false }
            );
        } catch (error) {
            const errorDetails = extractErrorInfo((error as Error).message);
            let errorMessage: string;

            switch (errorDetails.statusCode) {
                case '':
                    errorMessage = 'The query failed due to an unknown error.';
                    break;
                case '404':
                    errorMessage = 'The query to fetch results failed because the requested resource was not found. Please check the query parameters and try again.';
                    break;
                case '429':
                    errorMessage = 'The query to fetch results failed due to too many requests. Please try again later.';
                    break;
                case '504':
                    errorMessage = 'The query to fetch results experienced a timeout error. Narrow your query with a more specific filter and try again.';
                    break;
                default:
                    errorMessage = `The query failed due to the following error: (status ${errorDetails.statusCode}) ${errorDetails.message}.`;
                    break;
            }

            this.appEvents?.publish?.({
                type: AppEvents.alertError.name,
                payload: ['Error during results query', errorMessage],
            });

            throw new Error(errorMessage);
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
        return tables.flatMap(table => {
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

            return table.columns?.length > 0
                ? table.columns.map(column => ({
                    ...baseData,
                    columnName: column.name,
                    columnDataType: column.dataType,
                    columnType: column.columnType,
                    columnProperties: column.properties,
                }))
                : [baseData];
        });
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

    private async getFieldsForPropertiesQuery(
        processedQuery: ValidDataFrameQueryV2,
        queryOptions: { filter?: string; substitutions: string[] }
    ): Promise<DataFrameDTO> {
        const propertiesToQuery = [
            ...processedQuery.dataTableProperties,
            ...processedQuery.columnProperties
        ];
        const projections = propertiesToQuery
            .map(property => DataTableProjectionLabelLookup[property].projection);
        const projectionExcludingId = projections
            .filter(projection => projection !== DataTableProjections.Id);

        const tables = await this.queryTables(
            queryOptions.filter ?? processedQuery.dataTableFilter ?? '',
            processedQuery.take,
            projectionExcludingId,
            queryOptions.substitutions.length ? queryOptions.substitutions : undefined
        );
        const flattenedTablesWithColumns = this.flattenTablesWithColumns(tables);
        const workspaces = await this.loadWorkspaces();

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
    }
}
