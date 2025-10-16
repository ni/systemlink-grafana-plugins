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

export abstract class DataFrameDataSourceBase extends DataSourceBase<DataFrameQuery, DataFrameDataSourceOptions> {
    baseUrl = this.instanceSettings.url + '/nidataframe/v1';

    public constructor(
        readonly instanceSettings: DataSourceInstanceSettings<DataFrameDataSourceOptions>,
        readonly backendSrv: BackendSrv = getBackendSrv(),
        readonly templateSrv: TemplateSrv = getTemplateSrv()
    ) {
        super(instanceSettings, backendSrv, templateSrv);
    }

    abstract processQuery(query: DataFrameQuery): ValidDataFrameQuery;

    abstract getTableProperties(id?: string): Promise<TableProperties>;

    abstract getDecimatedTableData(
        query: DataFrameQuery,
        columns: Column[],
        timeRange: TimeRange,
        intervals?: number
    ): Promise<TableDataRows>;

    abstract queryTables(query: string): Promise<TableProperties[]>;

    async testDatasource(): Promise<TestDataSourceResponse> {
        await this.get(`${this.baseUrl}/tables`, { take: 1 });
        return { status: 'success', message: 'Data source connected and authentication successful!' };
    }
}
