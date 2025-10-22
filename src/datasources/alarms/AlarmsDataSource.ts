import { DataFrameDTO, DataQueryRequest, DataSourceInstanceSettings, TestDataSourceResponse, LegacyMetricFindQueryOptions, MetricFindValue } from '@grafana/data';
import { BackendSrv, TemplateSrv, getBackendSrv, getTemplateSrv } from '@grafana/runtime';
import { DataSourceBase } from 'core/DataSourceBase';
import { AlarmsQuery, AlarmsVariableQuery, QueryType } from './types/types';
import { AlarmsCountDataSource } from './query-type-handlers/alarms-count/AlarmsCountDataSource';
import { QUERY_ALARMS_RELATIVE_PATH } from './constants/QueryAlarms.constants';

export class AlarmsDataSource extends DataSourceBase<AlarmsQuery> {
  public readonly defaultQuery: Omit<AlarmsQuery, 'refId'>;

  private readonly _alarmsCountDataSource: AlarmsCountDataSource;

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

  public async runQuery(query: AlarmsQuery, _: DataQueryRequest): Promise<DataFrameDTO> {
    switch (query.queryType) {
      case QueryType.AlarmsCount:
        return this.alarmsCountDataSource.runQuery(query, _);
      default:
        throw new Error('Invalid query type');
    }
  }

  public shouldRunQuery(query: AlarmsQuery): boolean {
    switch (query.queryType) {
      case QueryType.AlarmsCount:
        return this.alarmsCountDataSource.shouldRunQuery(query);
      default:
        return false;
    }
  }

  public get alarmsCountDataSource(): AlarmsCountDataSource {
    return this._alarmsCountDataSource;
  }

  public async metricFindQuery(query: AlarmsVariableQuery, options?: LegacyMetricFindQueryOptions): Promise<MetricFindValue[]> {
    // TODO: Update references from AlarmsCountDataSource to AlarmsListDataSource when implemented
    return this.alarmsCountDataSource.metricFindQuery(query, options);
  }

  public async testDatasource(): Promise<TestDataSourceResponse> {
    await this.post(`${this.instanceSettings.url}${QUERY_ALARMS_RELATIVE_PATH}`, { take: 1 });
    return { status: 'success', message: 'Data source connected and authentication successful!' };
  }
}
