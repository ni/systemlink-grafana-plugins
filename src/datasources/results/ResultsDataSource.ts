import { DataFrameDTO, DataQueryRequest, DataSourceInstanceSettings, LegacyMetricFindQueryOptions, MetricFindValue, TestDataSourceResponse } from '@grafana/data';
import { BackendSrv, TemplateSrv, getBackendSrv, getTemplateSrv } from '@grafana/runtime';
import { DataSourceBase } from 'core/DataSourceBase';
import { QueryType, ResultsDataSourceOptions, ResultsQuery } from './types/types';
import { QueryResultsDataSource } from './query-handlers/query-results/QueryResultsDataSource';
import { QueryResults, ResultsVariableQuery } from './types/QueryResults.types';
import { QuerySteps } from './types/QuerySteps.types';
import { QueryStepsDataSource } from './query-handlers/query-steps/QueryStepsDataSource';

export class ResultsDataSource extends DataSourceBase<ResultsQuery, ResultsDataSourceOptions> {
  public defaultQuery: Partial<ResultsQuery> & Omit<ResultsQuery, 'refId'>;

  private _queryResultsDataSource: QueryResultsDataSource;
  private _queryStepsDataSource: QueryStepsDataSource;

  constructor(
    readonly instanceSettings: DataSourceInstanceSettings<ResultsDataSourceOptions>,
    readonly backendSrv: BackendSrv = getBackendSrv(),
    readonly templateSrv: TemplateSrv = getTemplateSrv()
  ) {
    super(instanceSettings, backendSrv, templateSrv);
    this._queryResultsDataSource = new QueryResultsDataSource(instanceSettings, backendSrv, templateSrv);
    this._queryStepsDataSource = new QueryStepsDataSource(instanceSettings, backendSrv, templateSrv);
    this.defaultQuery = this.queryResultsDataSource.defaultQuery;
  }

  baseUrl = this.instanceSettings.url + '/nitestmonitor';

  async runQuery(query: ResultsQuery, options: DataQueryRequest): Promise<DataFrameDTO> {
    if (query.queryType === QueryType.Results) {
      return this.queryResultsDataSource.runQuery(query as QueryResults, options);
    } else if (query.queryType === QueryType.Steps) {
      return this.queryStepsDataSource.runQuery(query as QuerySteps, options);
    }
    throw new Error('Invalid query type');
  }

  shouldRunQuery(query: ResultsQuery): boolean {
    if (query.queryType === QueryType.Results) {
      return this.queryResultsDataSource.shouldRunQuery(query as QueryResults);
    } else if (query.queryType === QueryType.Steps) {
      return this.queryStepsDataSource.shouldRunQuery(query as QuerySteps);
    }
    return false;
  }

  async metricFindQuery(query: ResultsVariableQuery, options?: LegacyMetricFindQueryOptions): Promise<MetricFindValue[]> {
    return this.queryResultsDataSource.metricFindQuery(query as ResultsVariableQuery, options);
  }

  get queryResultsDataSource(): QueryResultsDataSource {
    return this._queryResultsDataSource;
  }

  get queryStepsDataSource(): QueryStepsDataSource {
    return this._queryStepsDataSource;
  }

  async testDatasource(): Promise<TestDataSourceResponse> {
    await this.get(this.baseUrl + '/v2/results?take=1');
    return { status: 'success', message: 'Data source connected and authentication successful!' };
  }
}
