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
import { forkJoin, map, Observable, of } from 'rxjs';

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

  abstract runQuery(query: TQuery, options: DataQueryRequest): Promise<DataFrameDTO> | Observable<DataFrameDTO>;

  abstract shouldRunQuery(query: TQuery): boolean;

  query(request: DataQueryRequest<TQuery>): Observable<DataQueryResponse> {
    const perTarget$ = request.targets
      .map(this.prepareQuery, this)
      .filter(this.shouldRunQuery, this)
      .map(q => this.runQuery(q, request), this);
    
    if (perTarget$.length === 0) {
      return of({ data: [] }); // emit empty response immediately
    }
    
    return forkJoin(perTarget$).pipe(
      map((data) => ({ data } as DataQueryResponse)),
    );
  }

  prepareQuery(query: TQuery): TQuery {
    return { ...this.defaultQuery, ...query };
  }

  get<T>(url: string, params?: Record<string, any>) {
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
   * @returns A promise resolving to the response of type `T`.
   */
  post<T>(url: string, body: Record<string, any>, options: Partial<BackendSrvRequest> = {}) {
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
