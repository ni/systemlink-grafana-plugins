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
    Column
} from './types';
import { BackendSrv, getBackendSrv, TemplateSrv, getTemplateSrv } from '@grafana/runtime';

export abstract class DataFrameDataSourceBase<
    TQuery extends DataFrameQuery = DataFrameQuery,
    TOptions extends DataFrameDataSourceOptions = DataFrameDataSourceOptions
> extends DataSourceBase<TQuery, TOptions> {
    public baseUrl = this.instanceSettings.url + '/nidataframe/v1';

    public constructor(
        public readonly instanceSettings: DataSourceInstanceSettings<TOptions>,
        public readonly backendSrv: BackendSrv = getBackendSrv(),
        public readonly templateSrv: TemplateSrv = getTemplateSrv()
    ) {
        super(instanceSettings, backendSrv, templateSrv);
    }

    public abstract processQuery(query: TQuery): ValidDataFrameQuery;

    public abstract getTableProperties(id?: string): Promise<TableProperties>;

    public abstract getDecimatedTableData(
        query: TQuery,
        columns: Column[],
        timeRange: TimeRange,
        intervals?: number
    ): Promise<TableDataRows>;

    public abstract queryTables(query: string): Promise<TableProperties[]>;

    public async testDatasource(): Promise<TestDataSourceResponse> {
        await this.get(`${this.baseUrl}/tables`, { take: 1 });
        return { status: 'success', message: 'Data source connected and authentication successful!' };
    }
}
