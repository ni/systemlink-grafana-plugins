import { DataFrameDTO, DataQueryRequest, DataSourceInstanceSettings, TestDataSourceResponse } from '@grafana/data';
import { BackendSrv, TemplateSrv, getBackendSrv, getTemplateSrv } from '@grafana/runtime';
import { DataSourceBase } from 'core/DataSourceBase';
import { QueryType, ResultsQuery } from './types/types';
import { QueryResultsDataSource } from './query-handlers/query-results/QueryResultsDataSource';
import { QueryResults } from './types/QueryResults.types';
import { QueryStepsDataSource } from './query-handlers/query-steps/QueryStepsDataSource';
import { QuerySteps } from './types/QuerySteps.types';

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
      return this.queryResultsDataSource.runQuery(query as QueryResults, options);
    } else if(query.queryType === QueryType.Steps) {
      return this.queryStepsDataSource.runQuery(query as QuerySteps, options);
    }
    throw new Error('Invalid query type');
  }

  shouldRunQuery(query: ResultsQuery): boolean {
    if(query.queryType === QueryType.Results) {
      return this.queryResultsDataSource.shouldRunQuery(query as QueryResults);
    } else if(query.queryType === QueryType.Steps) {
      return this.queryStepsDataSource.shouldRunQuery(query as QuerySteps);
    }
    return false;
  }

  async testDatasource(): Promise<TestDataSourceResponse> {
    await this.get(this.baseUrl + '/v2/results?take=1');
    return { status: 'success', message: 'Data source connected and authentication successful!' };
  }
}
