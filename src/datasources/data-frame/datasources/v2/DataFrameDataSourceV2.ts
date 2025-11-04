import { DataFrameDTO, DataQueryRequest, DataSourceInstanceSettings, MetricFindValue, TimeRange } from "@grafana/data";
import { DataFrameDataSourceBase } from "../../DataFrameDataSourceBase";
import { BackendSrv, getBackendSrv, TemplateSrv, getTemplateSrv } from "@grafana/runtime";
import { Column, DataFrameDataSourceOptions, DataFrameQuery, DataFrameQueryV2, DataTableProjections, defaultQueryV2, QueryResultsRequest, QueryResultsResponse, TableDataRows, TableProperties, TablePropertiesList, ValidDataFrameQueryV2 } from "../../types";
import { TAKE_LIMIT } from "datasources/data-frame/constants";
import { buildCombinedFilter } from "./utils";

export class DataFrameDataSourceV2 extends DataFrameDataSourceBase<DataFrameQueryV2> {
    defaultQuery = defaultQueryV2;
    public resultsBaseUrl = this.instanceSettings.url + '/nitestmonitor/v2';

    public constructor(
        public readonly instanceSettings: DataSourceInstanceSettings<DataFrameDataSourceOptions>,
        public readonly backendSrv: BackendSrv = getBackendSrv(),
        public readonly templateSrv: TemplateSrv = getTemplateSrv()
    ) {
        super(instanceSettings, backendSrv, templateSrv);
    }

    /**
     * Query test results based on filter and return result IDs
     * @param filter - LINQ filter expression for querying results
     * @param take - Maximum number of results to return (default: 1001 to detect if more than 1000 exist)
     * @returns Array of result IDs
     */
    async queryResults(filter?: string, take = 1001): Promise<string[]> {
        if (!filter || filter.trim() === '') {
            return [];
        }

        try {
            const requestBody: QueryResultsRequest = {
                filter,
                orderBy: 'UPDATED_AT',
                descending: true,
                take,
                projection: ['ID']
            };

            const response = await this.post<QueryResultsResponse>(
                `${this.resultsBaseUrl}/query-results`,
                requestBody,
                {},
            );

            const resultIds = response.results.map(result => result.id);
            
            // Return only first 1000 if we got 1001 (indicating more exist)
            if (resultIds.length > 1000) {
                return resultIds.slice(0, 1000);
            }

            return resultIds;
        } catch (error) {
            console.error('Error querying results:', error);
            this.handleQueryResultsError(error);
            return [];
        }
    }

    private handleQueryResultsError(error: unknown): void {
        const errorDetails = this.extractErrorDetails(error);
        this.errorTitle = 'Error querying test results';
        
        switch (errorDetails.statusCode) {
            case '404':
                this.errorDescription = 'The query-results API endpoint was not found. Please verify the SystemLink server configuration.';
                break;
            case '429':
                this.errorDescription = 'Too many requests to the query-results API. Please try again later.';
                break;
            case '504':
                this.errorDescription = 'The query-results request timed out. Please narrow your filter criteria and try again.';
                break;
            default:
                this.errorDescription = errorDetails.message
                    ? `Failed to query test results: ${errorDetails.message}`
                    : 'Failed to query test results due to an unknown error.';
                break;
        }
    }

    private extractErrorDetails(error: unknown): { statusCode: string; message: string } {
        if (error && typeof error === 'object') {
            const err = error as any;
            return {
                statusCode: err.status?.toString() || err.statusCode?.toString() || '',
                message: err.message || err.data?.message || ''
            };
        }
        return { statusCode: '', message: '' };
    }

    async runQuery(query: DataFrameQueryV2, _options: DataQueryRequest<DataFrameQueryV2>): Promise<DataFrameDTO> {
        // TODO: Implement logic to fetch and return DataFrameDTO based on the query and options.
        
        // Step 1: Get result IDs if resultsFilter is present
        let resultIds: string[] = [];
        if (query.resultsFilter && query.resultsFilter.trim() !== '') {
            resultIds = await this.queryResults(query.resultsFilter);
        }

        // Step 2: Build combined filter
        const combinedFilterResult = buildCombinedFilter(
            resultIds,
            query.dataTableFilter,
            query.columnsFilter
        );

        if (!combinedFilterResult.isValid) {
            console.error('Invalid combined filter:', combinedFilterResult.errorMessage);
            this.errorTitle = 'Invalid filter';
            this.errorDescription = combinedFilterResult.errorMessage || 'Failed to build combined filter';
            return { fields: [] };
        }

        // Step 3: Query tables with combined filter if filter is not empty
        if (combinedFilterResult.filter && combinedFilterResult.filter.trim() !== '') {
            await this.queryTables(
                combinedFilterResult.filter,
                query.take,
                undefined,
                combinedFilterResult.substitutions
            );
        }

        return { fields: [] };
    }

    async metricFindQuery(query: DataFrameQueryV2): Promise<MetricFindValue[]> {
        // TODO: Implement logic to fetch and return metric find values based on the query.
        
        // Step 1: Get result IDs if resultsFilter is present
        let resultIds: string[] = [];
        if (query.resultsFilter && query.resultsFilter.trim() !== '') {
            resultIds = await this.queryResults(query.resultsFilter);
        }

        // Step 2: Build combined filter
        const combinedFilterResult = buildCombinedFilter(
            resultIds,
            query.dataTableFilter,
            query.columnsFilter
        );

        if (!combinedFilterResult.isValid) {
            console.error('Invalid combined filter:', combinedFilterResult.errorMessage);
            return [];
        }

        // Step 3: Query tables with combined filter if filter is not empty
        if (combinedFilterResult.filter && combinedFilterResult.filter.trim() !== '') {
            const tables = await this.queryTables(
                combinedFilterResult.filter,
                TAKE_LIMIT,
                undefined,
                combinedFilterResult.substitutions
            );
            
            // Return table names or IDs as metric find values
            return tables.map(table => ({
                text: table.name,
                value: table.id
            }));
        }

        return [];
    }

    shouldRunQuery(_query: ValidDataFrameQueryV2): boolean {
        // TODO: Implement logic to determine if the query should run. Currently always returns false.
        return true;
    }

    processQuery(query: DataFrameQuery): ValidDataFrameQueryV2 {
        // TODO: #3259801 - Implement Migration of DataFrameQueryV1 to ValidDataFrameQueryV2.
        return {
            ...defaultQueryV2,
            ...query
        } as ValidDataFrameQueryV2;
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

    async queryTables(filter: string, take = TAKE_LIMIT, projection?: DataTableProjections[], substitutions?: string[]): Promise<TableProperties[]> {
        try {
            // Validate filter length
            const FILTER_MAX_LENGTH = 20000;
            if (filter.length > FILTER_MAX_LENGTH) {
                this.errorTitle = 'Filter string too long';
                this.errorDescription = `The combined filter exceeds the maximum length of ${FILTER_MAX_LENGTH} characters (current: ${filter.length}). Please reduce the number of filters or result IDs.`;
                return [];
            }

            const requestBody: any = {
                filter,
                take,
                interactive: true,
                orderBy: 'ROWS_MODIFIED_AT',
                orderByDescending: true
            };

            if (projection && projection.length > 0) {
                requestBody.projection = projection;
            }

            if (substitutions && substitutions.length > 0) {
                requestBody.substitutions = substitutions;
            }

            const response = await this.post<TablePropertiesList>(
                `${this.baseUrl}/query-tables`,
                requestBody,
                {},
                true
            );
            return response.tables;
        } catch (error) {
            console.error('Error querying tables:', error);
            this.handleQueryTablesError(error);
            return [];
        }
    }

    private handleQueryTablesError(error: unknown): void {
        const errorDetails = this.extractErrorDetails(error);
        this.errorTitle = 'Error querying data tables';
        
        switch (errorDetails.statusCode) {
            case '400':
                this.errorDescription = 'Invalid filter expression. Please check your query builder filters and try again.';
                break;
            case '404':
                this.errorDescription = 'The query-tables API endpoint was not found. Please verify the SystemLink server configuration.';
                break;
            case '429':
                this.errorDescription = 'Too many requests to the query-tables API. Please try again later.';
                break;
            case '504':
                this.errorDescription = 'The query-tables request timed out. Please narrow your filter criteria and try again.';
                break;
            default:
                this.errorDescription = errorDetails.message
                    ? `Failed to query data tables: ${errorDetails.message}`
                    : 'Failed to query data tables due to an unknown error.';
                break;
        }
    }
}
