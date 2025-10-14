import {
    DataQueryRequest,
    DataSourceInstanceSettings,
    DataFrameDTO,
    MetricFindValue,
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

export abstract class DataFrameDatasourceBase extends DataSourceBase<DataFrameQuery, DataFrameDataSourceOptions> {
    constructor(
        readonly instanceSettings: DataSourceInstanceSettings<DataFrameDataSourceOptions>,
        readonly backendSrv: BackendSrv = getBackendSrv(),
        readonly templateSrv: TemplateSrv = getTemplateSrv()
    ) {
        super(instanceSettings, backendSrv, templateSrv);
    }

    baseUrl = this.instanceSettings.url + '/nidataframe/v1';

    abstract runQuery(
        query: DataFrameQuery,
        options: DataQueryRequest<DataFrameQuery>
    ): Promise<DataFrameDTO>;

    abstract shouldRunQuery(query: ValidDataFrameQuery): boolean;

    abstract getTableProperties(id?: string): Promise<TableProperties>;

    abstract getDecimatedTableData(
        query: DataFrameQuery,
        columns: Column[],
        timeRange: TimeRange,
        intervals?: number
    ): Promise<TableDataRows>;

    abstract queryTables(query: string): Promise<TableProperties[]>;

    abstract processQuery(query: DataFrameQuery): ValidDataFrameQuery;

    abstract metricFindQuery(query: DataFrameQuery): Promise<MetricFindValue[]>;

    async testDatasource(): Promise<TestDataSourceResponse> {
        await this.get(`${this.baseUrl}/tables`, { take: 1 });
        return { status: 'success', message: 'Data source connected and authentication successful!' };
    }
}
