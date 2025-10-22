import {
  DataFrameDTO,
  DataQueryRequest,
  DataQueryResponse,
  DataSourceApi,
  DataSourceInstanceSettings,
  DataSourceJsonData,
  EventBus,
} from '@grafana/data';
import { BackendSrv, BackendSrvRequest, TemplateSrv, getAppEvents } from '@grafana/runtime';
import { DataQuery } from '@grafana/schema';
import { QuerySystemsResponse, QuerySystemsRequest, Workspace } from './types';
import { get, post } from './utils';
import { ApiSessionUtils } from './api-session.utils';

export abstract class DataSourceBase<TQuery extends DataQuery, TOptions extends DataSourceJsonData = DataSourceJsonData> extends DataSourceApi<TQuery, TOptions> {
  appEvents: EventBus;
  apiSession: ApiSessionUtils;

  constructor(
    readonly instanceSettings: DataSourceInstanceSettings<TOptions>,
    readonly backendSrv: BackendSrv,
    readonly templateSrv: TemplateSrv
  ) {
    super(instanceSettings);
    this.appEvents = getAppEvents();
    this.apiSession = new ApiSessionUtils(instanceSettings, backendSrv);
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

  /**
   * Sends a GET request to the specified URL with optional query parameters.
   *
   * @template T - The expected response type.
   * @param url - The endpoint URL for the GET request.
   * @param params - Optional query parameters as a key-value map.
   * @param useApiIngress - If true, uses API ingress bypassing the UI ingress for the request.
   * @returns A promise resolving to the response of type `T`.
   */
  async get<T>(url: string, params?: Record<string, any>, useApiIngress = false) {
    if (useApiIngress) {
      const apiSession = await this.apiSession.createApiSession();
      if (apiSession) {
        url = apiSession.endpoint + url.replace(this.instanceSettings.url ?? '', '');
        params = {
          ...params,
          'x-ni-api-key': apiSession.sessionKey.secret,
        };
      }
    }

    return get<T>(this.backendSrv, url, params);
  }


  /**
   * Sends a POST request to the specified URL with the provided request body and options.
   *
   * @template T - The expected response type.
   * @param url - The endpoint URL to which the POST request is sent.
   * @param body - The request payload as a key-value map.
   * @param options - Optional configuration for the request. This can include:
   *   - `showingErrorAlert` (boolean): If true, displays an error alert on request failure.
   *   - Any other properties supported by {@link BackendSrvRequest}, such as headers, credentials, etc.
   * @param useApiIngress - If true, uses API ingress bypassing the UI ingress for the request.
   * @returns A promise resolving to the response of type `T`.
   */
  async post<T>(
    url: string,
    body: Record<string, any>,
    options: Partial<BackendSrvRequest> = {},
    useApiIngress = false
  ) {
    if (useApiIngress) {
      const apiSession = await this.apiSession.createApiSession();
      if (apiSession) {
        options = {
          ...options,
          headers: {
            ...options.headers,
            'x-ni-api-key': apiSession.sessionKey.secret,
          },
        };
        url = apiSession.endpoint + url.replace(this.instanceSettings.url ?? '', '');
      }
    }
    
    return post<T>(this.backendSrv, url, body, options);
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
