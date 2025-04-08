import { DataFrameDTO, DataQueryRequest, DataSourceInstanceSettings, TestDataSourceResponse } from '@grafana/data';
import { BackendSrv, TemplateSrv, getBackendSrv, getTemplateSrv } from '@grafana/runtime';
import { DataSourceBase } from 'core/DataSourceBase';
import { QueryType, ResultsQuery } from './types/types';
import { QueryResultsDataSource } from './data-sources/query-results/QueryResultsDataSource';
import { QueryResults } from './types/QueryResults.types';
import { QuerySteps } from './types/QuerySteps.types';
import { QueryStepsDataSource } from './data-sources/query-steps/QueryStepsDataSource';

export class ResultsDataSource extends DataSourceBase<ResultsQuery> {
  public defaultQuery: Partial<ResultsQuery> & Omit<ResultsQuery, 'refId'>;

  private queryResultsDataSource: QueryResultsDataSource;
  private queryStepsDataSource: QueryStepsDataSource;
  
  constructor(
    readonly instanceSettings: DataSourceInstanceSettings,
    readonly backendSrv: BackendSrv = getBackendSrv(),
    readonly templateSrv: TemplateSrv = getTemplateSrv()
  ) {
    super(instanceSettings, backendSrv, templateSrv);
    this.queryResultsDataSource = new QueryResultsDataSource(instanceSettings, backendSrv, templateSrv);
    this.queryStepsDataSource = new QueryStepsDataSource(instanceSettings, backendSrv, templateSrv);
    this.defaultQuery = this.queryResultsDataSource.defaultQuery;
  }
  
  baseUrl = this.instanceSettings.url + '/nitestmonitor';

  async runQuery(query: ResultsQuery, options: DataQueryRequest): Promise<DataFrameDTO> {
    if(query.queryType === QueryType.Results) {
      return this.getResultsDataSource().runQuery(query as QueryResults, options);
    }
    if(query.queryType === QueryType.Steps) {
      return this.getStepsDataSource().runQuery(query as QuerySteps, options);
    }
    throw new Error('Invalid query type');
  }

  shouldRunQuery(query: ResultsQuery): boolean {
    if(query.queryType === QueryType.Results) {
      return this.getResultsDataSource().shouldRunQuery(query as QueryResults);
    }
    if(query.queryType === QueryType.Steps) {
      return this.getStepsDataSource().shouldRunQuery(query as QuerySteps);
    }
    return false;
  }

  getResultsDataSource(): QueryResultsDataSource {
    return this.queryResultsDataSource;
  }

  getStepsDataSource(): QueryStepsDataSource {
    return this.queryStepsDataSource;
  }

  async testDatasource(): Promise<TestDataSourceResponse> {
    await this.get(this.baseUrl + '/v2/results?take=1');
    return { status: 'success', message: 'Data source connected and authentication successful!' };
  }
}
