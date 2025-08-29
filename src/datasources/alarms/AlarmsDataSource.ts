import { DataFrameDTO, DataQueryRequest, DataSourceInstanceSettings, TestDataSourceResponse } from '@grafana/data';
import { BackendSrv, TemplateSrv, getBackendSrv, getTemplateSrv } from '@grafana/runtime';
import { DataSourceBase } from 'core/DataSourceBase';
import { AlarmsQuery } from './types/types';
import { AlarmsCountDataSource } from './data-sources/alarms-count/AlarmsCountDataSource';

export class AlarmsDataSource extends DataSourceBase<AlarmsQuery> {
  private _alarmsCountDataSource: AlarmsCountDataSource;

  constructor(
    readonly instanceSettings: DataSourceInstanceSettings,
    readonly backendSrv: BackendSrv = getBackendSrv(),
    readonly templateSrv: TemplateSrv = getTemplateSrv()
  ) {
    super(instanceSettings, backendSrv, templateSrv);
    this._alarmsCountDataSource = new AlarmsCountDataSource(instanceSettings, backendSrv, templateSrv);
  }
  baseUrl = `${this.instanceSettings.url}/nialarm/v1`;
  queryAlarmsUrl = `${this.baseUrl}/query-instances-with-filter`;
  
  defaultQuery = {};

  async runQuery(query: AlarmsQuery, _: DataQueryRequest): Promise<DataFrameDTO> {
    return this.alarmsCountDataSource.runQuery(query, _);
  }

  shouldRunQuery(): boolean {
    return this.alarmsCountDataSource.shouldRunQuery();
  }

  get alarmsCountDataSource(): AlarmsCountDataSource {
    return this._alarmsCountDataSource;
  }

  async testDatasource(): Promise<TestDataSourceResponse> {
    await this.post(this.queryAlarmsUrl, { take: 1 });
    return { status: 'success', message: 'Data source connected and authentication successful!' };
  }
}
