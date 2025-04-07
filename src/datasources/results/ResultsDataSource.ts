import { DataFrameDTO, DataQueryRequest, DataSourceInstanceSettings, TestDataSourceResponse } from '@grafana/data';
import { BackendSrv, TemplateSrv, getBackendSrv, getTemplateSrv } from '@grafana/runtime';
import { DataSourceBase } from 'core/DataSourceBase';
import { ResultsQuery } from './types/types';
import { QueryResultsDataSource } from './data-sources/query-results/QueryResultsDataSource';
import { QueryResults } from './types/QueryResults.types';

export class ResultsDataSource extends DataSourceBase<ResultsQuery> {
  public defaultQuery: Partial<ResultsQuery> & Omit<ResultsQuery, 'refId'>;

  private queryResultsDataSource: QueryResultsDataSource;
  
  constructor(
    readonly instanceSettings: DataSourceInstanceSettings,
    readonly backendSrv: BackendSrv = getBackendSrv(),
    readonly templateSrv: TemplateSrv = getTemplateSrv()
  ) {
    super(instanceSettings, backendSrv, templateSrv);
    this.queryResultsDataSource = new QueryResultsDataSource(instanceSettings, backendSrv, templateSrv);
    this.defaultQuery = this.queryResultsDataSource.defaultQuery;
  }
  
  baseUrl = this.instanceSettings.url + '/nitestmonitor';

  async runQuery(query: ResultsQuery, options: DataQueryRequest): Promise<DataFrameDTO> {
    return this.queryResultsDataSource.runQuery(query as QueryResults, options);
  }

  shouldRunQuery(query: ResultsQuery): boolean {
    return this.queryResultsDataSource.shouldRunQuery(query as ResultsQuery);
  }

  async testDatasource(): Promise<TestDataSourceResponse> {
    await this.get(this.baseUrl + '/v2/results?take=1');
    return { status: 'success', message: 'Data source connected and authentication successful!' };
  }
}
