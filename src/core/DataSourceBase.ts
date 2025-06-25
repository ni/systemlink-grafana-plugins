import {
  DataFrameDTO,
  DataQueryRequest,
  DataQueryResponse,
  DataSourceApi,
  DataSourceInstanceSettings,
  DataSourceJsonData,
  EventBus,
} from '@grafana/data';
import { BackendSrv, BackendSrvRequest, FetchError, TemplateSrv, getAppEvents, isFetchError } from '@grafana/runtime';
import { DataQuery } from '@grafana/schema';
import { QuerySystemsResponse, QuerySystemsRequest, Workspace } from './types';
import { sleep } from './utils';
import { lastValueFrom } from 'rxjs';

export abstract class DataSourceBase<TQuery extends DataQuery, TOptions extends DataSourceJsonData = DataSourceJsonData> extends DataSourceApi<TQuery, TOptions> {
  appEvents: EventBus;

  constructor(
    readonly instanceSettings: DataSourceInstanceSettings<TOptions>,
    readonly backendSrv: BackendSrv,
    readonly templateSrv: TemplateSrv
  ) {
    super(instanceSettings);
    this.appEvents = getAppEvents();
  }

  abstract defaultQuery: Partial<TQuery> & Omit<TQuery, 'refId'>;

  abstract runQuery(query: TQuery, options: DataQueryRequest): Promise<DataFrameDTO>;

  abstract shouldRunQuery(query: TQuery): boolean;

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

  private async fetch<T>(options: BackendSrvRequest, retries = 0): Promise<T> {
    try {
      return (await lastValueFrom(this.backendSrv.fetch<T>(options))).data;
    } catch (error) {
      if (isFetchError(error) && error.status === 429 && retries < 3) {
        await sleep(Math.random() * 1000 * 2 ** retries);
        return this.fetch(options, retries + 1);
      }
      if (isFetchError(error)) {
        const fetchError = error as FetchError;
        const statusCode = fetchError.status;
        const genericErrorMessage = `Request to url "${options.url}" failed with status code: ${statusCode}.`;
        if (statusCode === 504) {
          throw new Error(genericErrorMessage);
        } else {
          const data = fetchError.data;
          const errorMessage = data.error?.message || JSON.stringify(data);
          throw new Error(`${genericErrorMessage} Error message: ${errorMessage}`);
        }
      }
      throw error;
    }
  }

  get<T>(url: string, params?: Record<string, any>) {
    return this.fetch<T>({ method: 'GET', url, params });
  }

  post<T>(url: string, body: Record<string, any>, showErrorAlert = true) {
    return this.fetch<T>({ method: 'POST', url, data: body, showErrorAlert });
  }

  static Workspaces: Workspace[];

  async getWorkspaces(): Promise<Workspace[]> {
    if (DataSourceBase.Workspaces) {
      return DataSourceBase.Workspaces;
    }

    const response = await this.backendSrv.get<{ workspaces: Workspace[] }>(
      this.instanceSettings.url + '/niauth/v1/user'
    );

    return (DataSourceBase.Workspaces = response.workspaces);
  }

  async getSystems(body: QuerySystemsRequest): Promise<QuerySystemsResponse> {
    return await this.post<QuerySystemsResponse>(
      this.instanceSettings.url + '/nisysmgmt/v1/query-systems', body
    )
  }
}
