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
import { fetchDataAsObservable, get, post } from './utils';
import { forkJoin, from, map, Observable, of, switchMap } from 'rxjs';
import { ApiSessionUtils } from '../shared/api-session.utils';

export abstract class DataSourceBase<TQuery extends DataQuery, TOptions extends DataSourceJsonData = DataSourceJsonData> extends DataSourceApi<TQuery, TOptions> {
  public readonly apiKeyHeader = 'x-ni-api-key';
  public appEvents: EventBus;
  public apiSessionUtils: ApiSessionUtils;

  public constructor(
    public readonly instanceSettings: DataSourceInstanceSettings<TOptions>,
    public readonly backendSrv: BackendSrv,
    public readonly templateSrv: TemplateSrv
  ) {
    super(instanceSettings);
    this.appEvents = getAppEvents();
    this.apiSessionUtils = new ApiSessionUtils(instanceSettings, backendSrv, this.appEvents);
  }

  public abstract defaultQuery: Partial<TQuery> & Omit<TQuery, 'refId'>;

  // TODO: AB#3442981 - Make this return type Observable
  abstract runQuery(query: TQuery, options: DataQueryRequest): Promise<DataFrameDTO> | Observable<DataFrameDTO>;

  public abstract shouldRunQuery(query: TQuery): boolean;

  query(request: DataQueryRequest<TQuery>): Observable<DataQueryResponse> {
    const queries$ = request.targets
      .map(this.prepareQuery, this)
      .filter(this.shouldRunQuery, this)
      .map(q => this.runQuery(q, request), this);
    
    if (queries$.length === 0) {
      return of({ data: [] }); // emit empty response immediately
    }
    
    return forkJoin(queries$).pipe(
      map((data) => ({ data })),
    );
  }

  public prepareQuery(query: TQuery): TQuery {
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
  public async get<T>(url: string, params?: Record<string, any>, useApiIngress = false) {
    if (useApiIngress) {
      [url, params] = await this.buildApiRequestConfig(url, params ?? {}, 'GET');
    }

    return get<T>(this.backendSrv, url, params);
  }
 
  /**
   * Sends a GET request to the specified URL with the provided parameters.
   *
   * @template T - The expected response type.
   * @param backendSrv - The Backend Service instance {@link BackendSrv} used to make the request.
   * @param url - The endpoint URL to which the GET request is sent.
   * @param params - The query parameters to be included in the request.
   * @param useApiIngress - If true, uses API ingress bypassing the UI ingress for the request.
   * @returns An observable emitting the response of type `T`.
   */
  public get$<T>(backendSrv: BackendSrv, url: string, params?: Record<string, any>, useApiIngress = false) {
    if (!useApiIngress) {
      return fetchDataAsObservable<T>(backendSrv, { method: 'GET', url, params });
    }
  
    return from(this.buildApiRequestConfig(url, params ?? {}, 'GET')).pipe(
      switchMap(([url, params]) =>
        fetchDataAsObservable<T>(backendSrv, { method: 'GET', url, params })
      )
    );
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
  public async post<T>(
    url: string,
    body: Record<string, any>,
    options: Partial<BackendSrvRequest> = {},
    useApiIngress = false
  ) {
    if (useApiIngress) {
      [url, options] = await this.buildApiRequestConfig(url, options, 'POST');
    }

    return post<T>(this.backendSrv, url, body, options);
  }

  /**
   * Sends a POST request to the specified URL with the provided request body and options.
   *
   * @template T - The expected response type.
   * @param backendSrv - The Backend Service instance {@link BackendSrv} used to make the request.
   * @param url - The endpoint URL to which the POST request is sent.
   * @param body - The request payload as a key-value map.
   * @param options - Optional configuration for the request. This can include:
   *   - `showingErrorAlert` (boolean): If true, displays an error alert on request failure.
   *   - Any other properties supported by {@link BackendSrvRequest}, such as headers, credentials, etc.
   * @param useApiIngress - If true, uses API ingress bypassing the UI ingress for the request.
   * @returns An observable emitting the response of type `T`.
   */
  public post$<T>(backendSrv: BackendSrv, url: string, body: Record<string, any>, options: Partial<BackendSrvRequest> = {}, useApiIngress = false) {
    if (!useApiIngress) {
      return fetchDataAsObservable<T>(backendSrv, { method: 'POST', url, data: body, ...options });
    
    }
  
    return from(this.buildApiRequestConfig(url, options, 'POST')).pipe(
      switchMap(([url, newOptions]) =>
        fetchDataAsObservable<T>(backendSrv, { method: 'POST', url, data: body, ...newOptions })
      )
    );
  }

  private static Workspaces: Workspace[];

  public async getWorkspaces(): Promise<Workspace[]> {
    if (DataSourceBase.Workspaces) {
      return DataSourceBase.Workspaces;
    }

    const response = await this.backendSrv.get<{ workspaces: Workspace[] }>(
      this.instanceSettings.url + '/niauth/v1/user'
    );

    return (DataSourceBase.Workspaces = response.workspaces);
  }

  public async getSystems(body: QuerySystemsRequest): Promise<QuerySystemsResponse> {
    return await this.post<QuerySystemsResponse>(
      this.instanceSettings.url + '/nisysmgmt/v1/query-systems', body
    )
  }

  private constructApiUrl(apiEndpoint: string, url: string): string {
    const webserverUrl = this.instanceSettings.url ?? '';
    return apiEndpoint + url.replace(webserverUrl, '');
  }

  private async buildApiRequestConfig(
    url: string,
    options: Partial<BackendSrvRequest>,
    method: 'GET' | 'POST'
  ): Promise<[string, Partial<BackendSrvRequest>]> {
    let updatedOptions: Partial<BackendSrvRequest> | Record<string, any>;

    const apiSession = await this.apiSessionUtils.createApiSession();
    url = this.constructApiUrl(apiSession.endpoint, url);

    if (method === 'POST') {
      updatedOptions = {
        ...options,
        headers: {
          ...options.headers,
          [this.apiKeyHeader]: apiSession.sessionKey.secret,
        },
      };
    } else {
      updatedOptions = {
        ...options,
        [this.apiKeyHeader]: apiSession.sessionKey.secret,
      };
    }
    return [url, updatedOptions];
  }
}
