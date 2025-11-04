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
    DataTableProjections
} from './types';
import { BackendSrv, TemplateSrv } from '@grafana/runtime';
import { extractErrorInfo } from 'core/errors';
import { QueryBuilderOption, Workspace } from 'core/types';
import { WorkspaceUtils } from 'shared/workspace.utils';
import { getVariableOptions } from 'core/utils';

export abstract class DataFrameDataSourceBase<
    TQuery extends DataFrameQuery = DataFrameQuery,
> extends DataSourceBase<TQuery, DataFrameDataSourceOptions> {
    public baseUrl = this.instanceSettings.url + '/nidataframe/v1';
    public errorTitle = '';
    public errorDescription = '';

    public readonly globalVariableOptions = (): QueryBuilderOption[] => getVariableOptions(this);

    private readonly workspaceUtils: WorkspaceUtils;

    public constructor(
        public readonly instanceSettings: DataSourceInstanceSettings<DataFrameDataSourceOptions>,
        public readonly backendSrv: BackendSrv,
        public readonly templateSrv: TemplateSrv
    ) {
        super(instanceSettings, backendSrv, templateSrv);
        this.workspaceUtils = new WorkspaceUtils(this.instanceSettings, this.backendSrv);
    }

    public abstract processQuery(query: TQuery): ValidDataFrameQuery;

    public abstract getTableProperties(id?: string): Promise<TableProperties>;

    public abstract getDecimatedTableData(
        query: TQuery,
        columns: Column[],
        timeRange: TimeRange,
        intervals?: number
    ): Promise<TableDataRows>;

    public abstract queryTables(query: string, take?: number, projection?: DataTableProjections[], substitutions?: string[]): Promise<TableProperties[]>;

    public async testDatasource(): Promise<TestDataSourceResponse> {
        await this.get(`${this.baseUrl}/tables`, { take: 1 });
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
