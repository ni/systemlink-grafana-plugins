import { DataFrameDTO, DataQueryRequest, DataSourceInstanceSettings, TestDataSourceResponse } from '@grafana/data';
import { BackendSrv, TemplateSrv, getBackendSrv, getTemplateSrv } from '@grafana/runtime';
import { DataSourceBase } from 'core/DataSourceBase';
import { AlarmsQuery, QueryType } from './types/types';
import { AlarmsCountDataSource } from './query-type-handlers/alarms-count/AlarmsCountDataSource';

export class AlarmsDataSource extends DataSourceBase<AlarmsQuery> {
  public defaultQuery: Omit<AlarmsQuery, 'refId'>;

  private _alarmsCountDataSource: AlarmsCountDataSource;

  constructor(
    readonly instanceSettings: DataSourceInstanceSettings,
    readonly backendSrv: BackendSrv = getBackendSrv(),
    readonly templateSrv: TemplateSrv = getTemplateSrv()
  ) {
    super(instanceSettings, backendSrv, templateSrv);
    this._alarmsCountDataSource = new AlarmsCountDataSource(instanceSettings, backendSrv, templateSrv);
    // AB#3064461 - Update defaultQuery to use list alarms defaults when supported
    this.defaultQuery = this._alarmsCountDataSource.defaultQuery;
  }

  baseUrl = `${this.instanceSettings.url}/nialarm/v1`;
  queryAlarmsUrl = `${this.baseUrl}/query-instances-with-filter`;

  async runQuery(query: AlarmsQuery, _: DataQueryRequest): Promise<DataFrameDTO> {
    switch (query.queryType) {
      case QueryType.AlarmsCount:
        return this.alarmsCountDataSource.runQuery(query, _);
      default:
        throw new Error('Invalid query type');
    }
  }

  shouldRunQuery(query: AlarmsQuery): boolean {
    switch (query.queryType) {
      case QueryType.AlarmsCount:
        return this.alarmsCountDataSource.shouldRunQuery(query);
      default:
        return false;
    }
  }

  get alarmsCountDataSource(): AlarmsCountDataSource {
    return this._alarmsCountDataSource;
  }

  async testDatasource(): Promise<TestDataSourceResponse> {
    await this.post(this.queryAlarmsUrl, { take: 1 });
    return { status: 'success', message: 'Data source connected and authentication successful!' };
  }
}
