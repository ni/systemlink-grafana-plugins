import {
  DataFrameDTO,
  DataQueryRequest,
  DataQueryResponse,
  DataSourceApi
} from '@grafana/data';
import { TestingStatus } from '@grafana/runtime';
import { DataQuery } from '@grafana/schema';

export abstract class DataSourceBase<TQuery extends DataQuery> extends DataSourceApi<TQuery> {
  query(request: DataQueryRequest<TQuery>): Promise<DataQueryResponse> {
    const promises = request.targets
      .map(this.prepareQuery, this)
      .filter(this.shouldRunQuery, this)
      .map(q => this.runQuery(q, request), this);

    return Promise.all(promises).then(data => ({ data }));
  }

  prepareQuery(query: TQuery): TQuery {
    return { ...this.defaultQuery, ...query };
  }

  abstract defaultQuery: Partial<TQuery> & Omit<TQuery, 'refId'>;
  abstract runQuery(query: TQuery, options: DataQueryRequest): Promise<DataFrameDTO>;
  abstract shouldRunQuery(query: TQuery): boolean;
  abstract testDatasource(): Promise<TestingStatus>;
}
