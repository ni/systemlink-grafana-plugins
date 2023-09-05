import {
  DataFrameDTO,
  DataQueryRequest,
  DataQueryResponse,
  DataSourceApi,
  DataSourceInstanceSettings,
} from '@grafana/data';
import { BackendSrv, TestingStatus } from '@grafana/runtime';
import { DataQuery } from '@grafana/schema';
import { Workspace } from './types';

export abstract class DataSourceBase<TQuery extends DataQuery> extends DataSourceApi<TQuery> {
  constructor(readonly instanceSettings: DataSourceInstanceSettings, readonly backendSrv: BackendSrv) {
    super(instanceSettings);
  }

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

  static Workspaces: Workspace[];

  async getWorkspaces() {
    if (DataSourceBase.Workspaces) {
      return DataSourceBase.Workspaces;
    }

    const response = await this.backendSrv.get<{ workspaces: Workspace[] }>(
      this.instanceSettings.url + '/niauth/v1/user'
    );

    return (DataSourceBase.Workspaces = response.workspaces);
  }

  abstract defaultQuery: Partial<TQuery> & Omit<TQuery, 'refId'>;
  abstract runQuery(query: TQuery, options: DataQueryRequest): Promise<DataFrameDTO>;
  abstract shouldRunQuery(query: TQuery): boolean;
  abstract testDatasource(): Promise<TestingStatus>;
}
