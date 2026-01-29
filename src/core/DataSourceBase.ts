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
import { get, get$, post, post$ } from './utils';
import { firstValueFrom, forkJoin, from, map, Observable, of, switchMap } from 'rxjs';
import { ApiSessionUtils } from '../shared/api-session.utils';

/**
 * Represents the options for making a backend service request.
 * Extends {@link BackendSrvRequest} with optional properties, allowing for partial specification.
 *
 * @property useApiIngress - If set to `true`, the request will be routed through the API ingress.
 */
interface RequestOptions extends Partial<BackendSrvRequest> {
  useApiIngress?: boolean;
}

export abstract class DataSourceBase<TQuery extends DataQuery, TOptions extends DataSourceJsonData = DataSourceJsonData> extends DataSourceApi<TQuery, TOptions> {
  private readonly apiKeyHeader = 'x-ni-api-key';
  protected appEvents: EventBus;
  private apiSessionUtils: ApiSessionUtils;

  protected constructor(
    protected readonly instanceSettings: DataSourceInstanceSettings<TOptions>,
    protected readonly backendSrv: BackendSrv,
    protected readonly templateSrv: TemplateSrv
  ) {
    super(instanceSettings);
    this.appEvents = getAppEvents();
    this.apiSessionUtils = new ApiSessionUtils(instanceSettings, backendSrv, this.appEvents);
  }

  public abstract defaultQuery: Partial<TQuery> & Omit<TQuery, 'refId'>;

  // TODO: AB#3442981 - Make this return type Observable
  public abstract runQuery(
    query: TQuery,
    options: DataQueryRequest
  ): Promise<DataFrameDTO> | Observable<DataFrameDTO>;

  public abstract shouldRunQuery(query: TQuery): boolean;

  public query(request: DataQueryRequest<TQuery>): Observable<DataQueryResponse> {
    const queries$ = request.targets
      .map(this.prepareQuery, this)
      .filter(this.shouldRunQuery, this)
      .map(q => this.runQuery(q, request), this);

    if (queries$.length === 0) {
      return of({ data: [] });
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
   * @param options - Optional configurations for the request.
   * @returns A promise resolving to the response of type `T`.
   */
  public async get<T>(url: string, options: RequestOptions = {}) {
    [url, options] = await this.buildApiRequestConfig(url, options, 'GET');
    return get<T>(this.backendSrv, url, options);
  }

  /**
   * Sends a GET request to the specified URL with the provided parameters.
   *
   * @template T - The expected response type.
   * @param url - The endpoint URL to which the GET request is sent.
   * @param options - Optional configurations for the request.
   * @returns An observable emitting the response of type `T`.
   */
  public get$<T>(url: string, options: RequestOptions = {}) {
    return from(this.buildApiRequestConfig(url, options, 'GET')).pipe(
      switchMap(([updatedUrl, updatedOptions]) =>
        get$<T>(this.backendSrv, updatedUrl, updatedOptions)
      )
    );
  }

  /**
   * Sends a POST request to the specified URL with the provided request body and options.
   *
   * @template T - The expected response type.
   * @param url - The endpoint URL to which the POST request is sent.
   * @param body - The request payload as a key-value map.
   * @param options - Optional configurations for the request.
   * @returns A promise resolving to the response of type `T`.
   */
  public async post<T>(
    url: string,
    body: Record<string, any>,
    options: RequestOptions = {},
  ) {
    [url, options] = await this.buildApiRequestConfig(url, options, 'POST');
    return post<T>(this.backendSrv, url, body, options);
  }

  /**
   * Sends a POST request to the specified URL with the provided request body and options.
   *
   * @template T - The expected response type.
   * @param url - The endpoint URL to which the POST request is sent.
   * @param body - The request payload as a key-value map.
   * @param options - Optional configurations for the request.
   * @returns An observable emitting the response of type `T`.
   */
  public post$<T>(
    url: string,
    body: Record<string, any>,
    options: RequestOptions = {}
  ) {
    return from(this.buildApiRequestConfig(url, options, 'POST')).pipe(
      switchMap(([updatedUrl, updatedOptions]) =>
        post$<T>(this.backendSrv, updatedUrl, body, updatedOptions)
      )
    );
  }

  /**
   * Retrieves a list of variable options from the template service.
   * Each option is an object containing a `label` and `value` property,
   * both formatted as `'$' + variable.name`.
   *
   * @returns An array of objects representing the available variables,
   *          each with `label` and `value` properties.
   */
  public getVariableOptions() {
    return this.templateSrv
      .getVariables()
      .map(variable => ({ label: '$' + variable.name, value: '$' + variable.name }));
  }

  private static Workspaces: Workspace[];

  public async getWorkspaces(): Promise<Workspace[]> {
    return await firstValueFrom(this.getWorkspaces$());
  }

  public getWorkspaces$(): Observable<Workspace[]> {
    if (DataSourceBase.Workspaces) {
      return of(DataSourceBase.Workspaces);
    }

    return this.get$<{ workspaces: Workspace[] }>(
      this.instanceSettings.url + '/niauth/v1/user'
    ).pipe(
        map(response => {
            DataSourceBase.Workspaces = response.workspaces;
            return DataSourceBase.Workspaces;
        })
    );
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
    options: RequestOptions,
    method: 'GET' | 'POST'
  ): Promise<[string, Partial<BackendSrvRequest>]> {
    const { useApiIngress, ...remainingOptions } = options;
    if (!useApiIngress) {
      return [url, remainingOptions];
    }

    const apiSession = await this.apiSessionUtils.createApiSession();
    url = this.constructApiUrl(apiSession.endpoint, url);

    let requestOptions;

    switch (method) {
      case 'POST':
        requestOptions = {
          ...remainingOptions,
          headers: {
            ...remainingOptions.headers,
            [this.apiKeyHeader]: apiSession.sessionKey.secret,
          },
        };
        break;
      case 'GET':
        requestOptions = {
          ...remainingOptions,
          params: {
            ...remainingOptions.params,
            [this.apiKeyHeader]: apiSession.sessionKey.secret,
          }
        };
        break;
      default:
        requestOptions = { ...remainingOptions };
        break;
    }
    return [url, requestOptions];
  }
}
