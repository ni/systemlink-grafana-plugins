import {
    DataSourceInstanceSettings,
    TestDataSourceResponse,
    TimeRange,
} from '@grafana/data';
import { DataSourceBase } from 'core/DataSourceBase';
import {
    DataFrameQuery,
    DataFrameDataSourceOptions,
    ValidDataFrameQuery,
    TableProperties,
    TableDataRows,
    Column,
    DataTableProjections,
    ValidDataFrameVariableQuery,
    DataFrameDataQuery,
    DataFrameVariableQuery,
    CombinedFilters,
    ColumnOptions,
    ColumnFilter
} from './types';
import { BackendSrv, TemplateSrv } from '@grafana/runtime';
import { extractErrorInfo } from 'core/errors';
import { QueryBuilderOption, Workspace } from 'core/types';
import { WorkspaceUtils } from 'shared/workspace.utils';
import { Observable } from 'rxjs';
import { NUMERIC_DATA_TYPES, PART_NUMBER_FIELD } from './constants';

export abstract class DataFrameDataSourceBase<
    TQuery extends DataFrameQuery = DataFrameQuery,
> extends DataSourceBase<TQuery, DataFrameDataSourceOptions> {
    public baseUrl = this.instanceSettings.url + '/nidataframe/v1';
    public queryResultValuesUrl = this.instanceSettings.url + '/nitestmonitor/v2/query-result-values';
    public errorTitle = '';
    public errorDescription = '';

    public readonly globalVariableOptions = (): QueryBuilderOption[] => this.getVariableOptions();

    private readonly workspaceUtils: WorkspaceUtils;
    static _partNumbersCache: Promise<string[]>;

    public constructor(
        public readonly instanceSettings: DataSourceInstanceSettings<DataFrameDataSourceOptions>,
        public readonly backendSrv: BackendSrv,
        public readonly templateSrv: TemplateSrv
    ) {
        super(instanceSettings, backendSrv, templateSrv);
        this.workspaceUtils = new WorkspaceUtils(this.instanceSettings, this.backendSrv);
    }

    public abstract processQuery(query: DataFrameDataQuery): ValidDataFrameQuery;

    public processVariableQuery(query: DataFrameVariableQuery): ValidDataFrameVariableQuery {
        return query as ValidDataFrameVariableQuery;
    }

    public abstract getTableProperties(id?: string): Promise<TableProperties>;

    public abstract getDecimatedTableData(
        query: DataFrameDataQuery,
        columns: Column[],
        timeRange: TimeRange,
        intervals?: number
    ): Promise<TableDataRows>;

    public abstract queryTables$(
        filters: CombinedFilters,
        take?: number,
        projection?: DataTableProjections[]
    ): Observable<TableProperties[]>;

    public abstract queryTables(
        query: string,
        take?: number,
        projection?: DataTableProjections[]
    ): Promise<TableProperties[]>;

    public async testDatasource(): Promise<TestDataSourceResponse> {
        await this.get(`${this.baseUrl}/tables`, { params: { take: 1 } });
        return { status: 'success', message: 'Data source connected and authentication successful!' };
    }

    public async loadWorkspaces(): Promise<Map<string, Workspace>> {
        try {
            return await this.workspaceUtils.getWorkspaces();
        } catch (error) {
            if (!this.errorTitle) {
                this.handleDependenciesError(error);
            }
            return new Map<string, Workspace>();
        }
    }

    public async getColumnOptionsWithVariables(filters: CombinedFilters): Promise<ColumnOptions> {
        return Promise.resolve({ uniqueColumnsAcrossTables: [], commonColumnsAcrossTables: [] });
    }

    public async loadPartNumbers(): Promise<string[]> {
        if (!DataFrameDataSourceBase._partNumbersCache) {
            DataFrameDataSourceBase._partNumbersCache = this.queryResultsValues(
                PART_NUMBER_FIELD,
                undefined
            ).catch((error) => {
                if (!this.errorTitle) {
                    this.handleDependenciesError(error);
                }
                return [];
            });
        }

        return DataFrameDataSourceBase._partNumbersCache;
    }

    public transformDataTableQuery(query: string) {
        return this.templateSrv.replace(query);
    }

    public transformResultQuery(filter: string) {
        return this.templateSrv.replace(filter);
    }

    public transformColumnQuery(filter: string) {
        return this.templateSrv.replace(filter);
    }

    public parseColumnIdentifier(
        _columnIdentifier: string
    ): { columnName: string, transformedDataType: string } {
        return {
            columnName: '',
            transformedDataType: ''
        };
    }

    public hasRequiredFilters(_query: ValidDataFrameQuery): boolean {
        return false;
    }

    protected constructNullFilters(columns: Column[]): ColumnFilter[] {
        return columns.flatMap(({ name, columnType, dataType }) => {
            const filters: ColumnFilter[] = [];

            if (columnType === 'NULLABLE') {
                filters.push({ column: name, operation: 'NOT_EQUALS', value: null });
            }
            if (dataType === 'FLOAT32' || dataType === 'FLOAT64') {
                filters.push({ column: name, operation: 'NOT_EQUALS', value: 'NaN' });
            }
            return filters;
        });
    }

    protected getNumericColumns(columns: Column[]): Column[] {
        return columns.filter(this.isColumnNumeric);
    }

    private isColumnNumeric(column: Column): boolean {
        if (
            NUMERIC_DATA_TYPES.includes(column.dataType)
            || column.dataType === 'TIMESTAMP'
        ) {
            return true;
        }
        return false;
    }

    private async queryResultsValues(fieldName: string, filter?: string): Promise<string[]> {
        return this.post<string[]>(
            this.queryResultValuesUrl,
            {
                field: fieldName,
                filter,
            },
            { showErrorAlert: false } // suppress default error alert since we handle errors manually
        );
    }

    private handleDependenciesError(error: unknown): void {
        const errorDetails = extractErrorInfo((error as Error).message);
        this.errorTitle = 'Warning during dataframe query';
        switch (errorDetails.statusCode) {
            case '404':
                this.errorDescription = 'The query builder lookups failed because the requested resource was not found. Please check the query parameters and try again.';
                break;
            case '429':
                this.errorDescription = 'The query builder lookups failed due to too many requests. Please try again later.';
                break;
            case '504':
                this.errorDescription = `The query builder lookups experienced a timeout error. Some values might not be available. Narrow your query with a more specific filter and try again.`;
                break;
            default:
                this.errorDescription = errorDetails.message
                    ? `Some values may not be available in the query builder lookups due to the following error: ${errorDetails.message}.`
                    : 'Some values may not be available in the query builder lookups due to an unknown error.';
                break;
        }
    }
}
