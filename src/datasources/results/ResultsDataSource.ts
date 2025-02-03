import { DataFrameDTO, DataQueryRequest, DataSourceInstanceSettings, TestDataSourceResponse } from '@grafana/data';
import { BackendSrv, TemplateSrv, getBackendSrv, getTemplateSrv } from '@grafana/runtime';
import { DataSourceBase } from 'core/DataSourceBase';
import { OutputType, ResultsQuery } from './types';
import { QueryResultsDataSource } from './datasources/query-results/QueryResultsDataSource';

export class ResultsDataSource extends DataSourceBase<ResultsQuery> {
  private queryResultsDataSource: QueryResultsDataSource;

  constructor(
    readonly instanceSettings: DataSourceInstanceSettings,
    readonly backendSrv: BackendSrv = getBackendSrv(),
    readonly templateSrv: TemplateSrv = getTemplateSrv()
  ) {
    super(instanceSettings, backendSrv, templateSrv);
    this.queryResultsDataSource = new QueryResultsDataSource(instanceSettings, backendSrv, templateSrv);
  }

  baseUrl = this.instanceSettings.url + '/nitestmonitor';
  queryResultsUrl = this.baseUrl + '/v2/query-results';

  error = '';

  defaultQuery = {
    outputType: OutputType.Data
  }

  async runQuery(query: ResultsQuery, options: DataQueryRequest): Promise<DataFrameDTO> {
    return this.getQueryResultsDataSource().runQuery(query as ResultsQuery, options);
  }

  shouldRunQuery(query: ResultsQuery): boolean {
    return this.getQueryResultsDataSource().shouldRunQuery(query as ResultsQuery);
  }

  getQueryResultsDataSource(): QueryResultsDataSource {
    return this.queryResultsDataSource;
  }

  async testDatasource(): Promise<TestDataSourceResponse> {
    await this.get(this.baseUrl + '/v2/results?take=1');
    return { status: 'success', message: 'Data source connected and authentication successful!' };
  }
}
