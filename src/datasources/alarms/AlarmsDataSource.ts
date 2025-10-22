import { DataFrameDTO, DataQueryRequest, DataSourceInstanceSettings, TestDataSourceResponse } from '@grafana/data';
import { BackendSrv, TemplateSrv, getBackendSrv, getTemplateSrv } from '@grafana/runtime';
import { DataSourceBase } from 'core/DataSourceBase';
import { AlarmsQuery, QueryType } from './types/types';
import { AlarmsCountQueryHandler } from './query-type-handlers/alarms-count/AlarmsCountQueryHandler';
import { QUERY_ALARMS_RELATIVE_PATH } from './constants/QueryAlarms.constants';
import { ListAlarmsDataSource } from './query-type-handlers/list-alarms/ListAlarmsDataSource';

export class AlarmsDataSource extends DataSourceBase<AlarmsQuery> {
  public readonly defaultQuery: Omit<AlarmsQuery, 'refId'>;

  private readonly _alarmsCountQueryHandler: AlarmsCountQueryHandler;
  private readonly _listAlarmsDataSource: ListAlarmsDataSource;

  constructor(
    readonly instanceSettings: DataSourceInstanceSettings,
    readonly backendSrv: BackendSrv = getBackendSrv(),
    readonly templateSrv: TemplateSrv = getTemplateSrv()
  ) {
    super(instanceSettings, backendSrv, templateSrv);
    this._alarmsCountDataSource = new AlarmsCountDataSource(instanceSettings, backendSrv, templateSrv);
    this._listAlarmsDataSource = new ListAlarmsDataSource(instanceSettings, backendSrv, templateSrv);
    this.defaultQuery = this._listAlarmsDataSource.defaultQuery;
  }

  public async runQuery(query: AlarmsQuery, options: DataQueryRequest): Promise<DataFrameDTO> {
    switch (query.queryType) {
      case QueryType.AlarmsCount:
        return this.alarmsCountQueryHandler.runQuery(query, options);
      case QueryType.ListAlarms:
        return this.listAlarmsDataSource.runQuery(query, options);
      default:
        throw new Error('Invalid query type');
    }
  }

  public shouldRunQuery(query: AlarmsQuery): boolean {
    switch (query.queryType) {
      case QueryType.AlarmsCount:
        return this.alarmsCountQueryHandler.shouldRunQuery(query);
      case QueryType.ListAlarms:
        return this.listAlarmsDataSource.shouldRunQuery(query);
      default:
        return false;
    }
  }

  public get alarmsCountQueryHandler(): AlarmsCountQueryHandler {
    return this._alarmsCountQueryHandler;
  }

  public get listAlarmsDataSource(): ListAlarmsDataSource {
    return this._listAlarmsDataSource;
  }

  public async testDatasource(): Promise<TestDataSourceResponse> {
    await this.post(`${this.instanceSettings.url}${QUERY_ALARMS_RELATIVE_PATH}`, { take: 1 });
    return { status: 'success', message: 'Data source connected and authentication successful!' };
  }
}
