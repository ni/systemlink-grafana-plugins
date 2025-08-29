import { DataFrameDTO, DataQueryRequest, DataSourceInstanceSettings, TestDataSourceResponse } from '@grafana/data';
import { BackendSrv, TemplateSrv, getBackendSrv, getTemplateSrv } from '@grafana/runtime';
import { DataSourceBase } from 'core/DataSourceBase';
import { AlarmsQuery } from './types/types';
import { AlarmsCountDataSource } from './data-sources/alarms-count/AlarmsCountDataSource';

export class AlarmsDataSource extends DataSourceBase<AlarmsQuery> {
  public defaultQuery: Partial<AlarmsQuery> & Omit<AlarmsQuery, 'refId'>;

  private _alarmsCountDataSource: AlarmsCountDataSource;

  constructor(
    readonly instanceSettings: DataSourceInstanceSettings,
    readonly backendSrv: BackendSrv = getBackendSrv(),
    readonly templateSrv: TemplateSrv = getTemplateSrv()
  ) {
    super(instanceSettings, backendSrv, templateSrv);
    this._alarmsCountDataSource = new AlarmsCountDataSource(instanceSettings, backendSrv, templateSrv);
    this.defaultQuery = this._alarmsCountDataSource.defaultQuery;
  }

  baseUrl = `${this.instanceSettings.url}/nialarm/v1`;
  queryAlarmsUrl = `${this.baseUrl}/query-instances-with-filter`;

  async runQuery(query: AlarmsQuery, _: DataQueryRequest): Promise<DataFrameDTO> {
    return this._alarmsCountDataSource.runQuery(query, _);
  }

  shouldRunQuery(query: AlarmsQuery): boolean {
    return this._alarmsCountDataSource.shouldRunQuery(query);
  }

  async testDatasource(): Promise<TestDataSourceResponse> {
    await this.post(this.queryAlarmsUrl, { take: 1 });
    return { status: 'success', message: 'Data source connected and authentication successful!' };
  }
}
