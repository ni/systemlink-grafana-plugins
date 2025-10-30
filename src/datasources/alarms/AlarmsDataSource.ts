import { DataFrameDTO, DataQueryRequest, DataSourceInstanceSettings, TestDataSourceResponse, LegacyMetricFindQueryOptions, MetricFindValue } from '@grafana/data';
import { BackendSrv, TemplateSrv, getBackendSrv, getTemplateSrv } from '@grafana/runtime';
import { DataSourceBase } from 'core/DataSourceBase';
import { AlarmsQuery, AlarmsVariableQuery, QueryType } from './types/types';
import { AlarmsCountQueryHandler } from './query-type-handlers/alarms-count/AlarmsCountQueryHandler';
import { QUERY_ALARMS_RELATIVE_PATH } from './constants/QueryAlarms.constants';
import { ListAlarmsQueryHandler } from './query-type-handlers/list-alarms/ListAlarmsQueryHandler';
import { DEFAULT_QUERY_TYPE } from './constants/DefaultQueries.constants';

export class AlarmsDataSource extends DataSourceBase<AlarmsQuery> {
  public readonly defaultQuery: Omit<AlarmsQuery, 'refId'>;

  private readonly _alarmsCountQueryHandler: AlarmsCountQueryHandler;
  private readonly _listAlarmsQueryHandler: ListAlarmsQueryHandler;

  constructor(
    readonly instanceSettings: DataSourceInstanceSettings,
    readonly backendSrv: BackendSrv = getBackendSrv(),
    readonly templateSrv: TemplateSrv = getTemplateSrv()
  ) {
    super(instanceSettings, backendSrv, templateSrv);
    this._alarmsCountQueryHandler = new AlarmsCountQueryHandler(instanceSettings, backendSrv, templateSrv);
    this._listAlarmsQueryHandler = new ListAlarmsQueryHandler(instanceSettings, backendSrv, templateSrv);

    this.defaultQuery = this.getDefaultQueryBasedOnQueryType();
  }

  public async runQuery(query: AlarmsQuery, options: DataQueryRequest): Promise<DataFrameDTO> {
    switch (query.queryType) {
      case QueryType.AlarmsCount:
        return this.alarmsCountQueryHandler.runQuery(query, options);
      default:
        throw new Error('Invalid query type');
    }
  }

  public shouldRunQuery(query: AlarmsQuery): boolean {
    switch (query.queryType) {
      case QueryType.AlarmsCount:
        return this.alarmsCountQueryHandler.shouldRunQuery(query);
      default:
        return false;
    }
  }

  public get alarmsCountQueryHandler(): AlarmsCountQueryHandler {
    return this._alarmsCountQueryHandler;
  }

  public get listAlarmsQueryHandler(): ListAlarmsQueryHandler {
    return this._listAlarmsQueryHandler;
  }

  public async metricFindQuery(query: AlarmsVariableQuery, options?: LegacyMetricFindQueryOptions): Promise<MetricFindValue[]> {
    return this._listAlarmsQueryHandler.metricFindQuery(query, options);
  }

  public async testDatasource(): Promise<TestDataSourceResponse> {
    await this.post(`${this.instanceSettings.url}${QUERY_ALARMS_RELATIVE_PATH}`, { take: 1 });
    return { status: 'success', message: 'Data source connected and authentication successful!' };
  }

  private getDefaultQueryBasedOnQueryType(): Omit<AlarmsQuery, 'refId'> {
    switch (DEFAULT_QUERY_TYPE) {
      case QueryType.ListAlarms:
        return this.listAlarmsQueryHandler.defaultQuery;
      case QueryType.AlarmsCount:
        return this.alarmsCountQueryHandler.defaultQuery;
      default:
        throw new Error('Invalid query type');
    }
  }
}
