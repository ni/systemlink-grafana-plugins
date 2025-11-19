import { DataFrameDTO, DataQueryRequest, DataSourceInstanceSettings, TestDataSourceResponse, LegacyMetricFindQueryOptions, MetricFindValue } from '@grafana/data';
import { BackendSrv, TemplateSrv, getBackendSrv, getTemplateSrv } from '@grafana/runtime';
import { DataSourceBase } from 'core/DataSourceBase';
import { AlarmsQuery, AlarmsVariableQuery, QueryType } from './types/types';
import { QUERY_ALARMS_RELATIVE_PATH } from './constants/QueryAlarms.constants';
import { ListAlarmsQueryHandler } from './query-type-handlers/list-alarms/ListAlarmsQueryHandler';
import { DEFAULT_QUERY_TYPE, defaultListAlarmsVariableQuery } from './constants/DefaultQueries.constants';
import { AlarmsTrendQueryHandler } from './query-type-handlers/alarms-trend/AlarmsTrendQueryHandler';

export class AlarmsDataSource extends DataSourceBase<AlarmsQuery> {
  public readonly defaultQuery: Omit<AlarmsQuery, 'refId'>;

  private readonly _listAlarmsQueryHandler: ListAlarmsQueryHandler;
  private readonly _alarmsTrendQueryHandler: AlarmsTrendQueryHandler;

  constructor(
    readonly instanceSettings: DataSourceInstanceSettings,
    readonly backendSrv: BackendSrv = getBackendSrv(),
    readonly templateSrv: TemplateSrv = getTemplateSrv()
  ) {
    super(instanceSettings, backendSrv, templateSrv);
    this._listAlarmsQueryHandler = new ListAlarmsQueryHandler(instanceSettings, backendSrv, templateSrv);
    this._alarmsTrendQueryHandler = new AlarmsTrendQueryHandler(instanceSettings, backendSrv, templateSrv);

    this.defaultQuery = this.getDefaultQueryBasedOnQueryType();
  }

  public async runQuery(query: AlarmsQuery, options: DataQueryRequest): Promise<DataFrameDTO> {
    switch (query.queryType) {
      case QueryType.ListAlarms:
        return this.listAlarmsQueryHandler.runQuery(query, options);
      case QueryType.AlarmsTrend:
        return this.alarmsTrendQueryHandler.runQuery(query, options);
      default:
        throw new Error('Invalid query type');
    }
  }

  public shouldRunQuery(query: AlarmsQuery): boolean {
    switch (query.queryType) {
      case QueryType.ListAlarms:
        return this.listAlarmsQueryHandler.shouldRunQuery(query);
      case QueryType.AlarmsTrend:
        return this.alarmsTrendQueryHandler.shouldRunQuery(query);
      default:
        return false;
    }
  }

  public get listAlarmsQueryHandler(): ListAlarmsQueryHandler {
    return this._listAlarmsQueryHandler;
  }

  public get alarmsTrendQueryHandler(): AlarmsTrendQueryHandler {
    return this._alarmsTrendQueryHandler;
  }

  public async metricFindQuery(query: AlarmsVariableQuery, options?: LegacyMetricFindQueryOptions): Promise<MetricFindValue[]> {
    const preparedQuery = this.prepareVariableQuery(query);
    return this._listAlarmsQueryHandler.metricFindQuery(preparedQuery, options);
  }

  public async testDatasource(): Promise<TestDataSourceResponse> {
    await this.post(`${this.instanceSettings.url}${QUERY_ALARMS_RELATIVE_PATH}`, { take: 1 });
    return { status: 'success', message: 'Data source connected and authentication successful!' };
  }

  public prepareVariableQuery(query: AlarmsVariableQuery): AlarmsVariableQuery {
    return {
      ...defaultListAlarmsVariableQuery,
      ...query,
    };
  }

  private getDefaultQueryBasedOnQueryType(): Omit<AlarmsQuery, 'refId'> {
    switch (DEFAULT_QUERY_TYPE) {
      case QueryType.ListAlarms:
        return this.listAlarmsQueryHandler.defaultQuery;
      case QueryType.AlarmsTrend:
        return this.alarmsTrendQueryHandler.defaultQuery;
      default:
        throw new Error('Invalid query type');
    }
  }
}
