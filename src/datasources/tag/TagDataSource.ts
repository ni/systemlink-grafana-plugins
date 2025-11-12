import {
  DataFrameDTO,
  DataSourceInstanceSettings,
  DataQueryRequest,
  TestDataSourceResponse,
} from '@grafana/data';
import { BackendSrv, TemplateSrv, getBackendSrv, getTemplateSrv } from '@grafana/runtime';
import { DataSourceBase } from 'core/DataSourceBase';
import {
  TagDataSourceOptions,
  TagQuery,
  TagQueryType,
  TagsWithValues,
  TagWithValue,
} from './types';
import { Throw } from 'core/utils';
import { expandMultipleValueVariable } from "./utils";
import { QueryHandlerFactory } from './QueryHandlerFactory';
import { forkJoin, map, Observable, switchMap } from 'rxjs';

export class TagDataSource extends DataSourceBase<TagQuery, TagDataSourceOptions> {
  public defaultQuery: Omit<TagQuery, 'refId'> = {
    type: TagQueryType.Current,
    path: '',
    workspace: '',
    properties: false,
  };

  private readonly tagUrl = this.instanceSettings.url + '/nitag/v2';
  private readonly queryHandlerFactory = new QueryHandlerFactory(this.post$.bind(this), this.instanceSettings.url);

  constructor(
    readonly instanceSettings: DataSourceInstanceSettings<TagDataSourceOptions>,
    readonly backendSrv: BackendSrv = getBackendSrv(),
    readonly templateSrv: TemplateSrv = getTemplateSrv()
  ) {
    super(instanceSettings, backendSrv, templateSrv);
  }

  runQuery(query: TagQuery, { range, maxDataPoints, scopedVars }: DataQueryRequest): Observable<DataFrameDTO> {
    const tagsWithValues$ = this.getMostRecentTagsByMultiplePaths$(
      this.generatePathsFromTemplate(query, scopedVars),
      this.templateSrv.replace(query.workspace, scopedVars)
    );
    const workspacesPromise = this.getWorkspaces();

    return forkJoin([
      tagsWithValues$,
      workspacesPromise
    ]).pipe(
      switchMap(([tagsWithValues, workspaces]) => {
        const result: DataFrameDTO = { refId: query.refId, fields: [] };

        return this.queryHandlerFactory.createQueryHandler(query.type).handleQuery(tagsWithValues, result, workspaces, range, maxDataPoints, query.properties);
      }
      ))
  }

  /**
   * Generates paths from the template string. If the path contains a template variable, it expands it into multiple paths.
   * @param query - The query object containing the path to be expanded, multiple values are separated by commas. (ex: 0,1,2)
   * @returns An array of paths generated from the template string.
   **/
  private generatePathsFromTemplate(query: TagQuery, scopedVars: Record<string, any>): string[] {
    let paths: string[] = [query.path];

    const replacedPath = this.templateSrv.replace(
      query.path,
      scopedVars,
      (v: string | string[]): string => `{${v}}`
    );

    paths = expandMultipleValueVariable(replacedPath);

    return paths;
  }

  private getMostRecentTagsByMultiplePaths$(paths: string[], workspace: string): Observable<TagWithValue[]> {
    const workspaceQuery = [workspace || "*"];
    const response = this.post$<TagsWithValues>(`${this.tagUrl}/fetch-tags-with-values`, {
      paths: paths,
      workspaces: workspaceQuery,
      take: 100,
    }).pipe(
      map((res: TagsWithValues) => {
        return res.tagsWithValues.length ? res.tagsWithValues : Throw(`No tags matched the path '${paths}'`);
      })
    );

    return response;
  }

  shouldRunQuery(query: TagQuery): boolean {
    return !query.hide && Boolean(query.path);
  }

  async testDatasource(): Promise<TestDataSourceResponse> {
    await this.get(this.tagUrl + '/tags-count');
    return { status: 'success', message: 'Data source connected and authentication successful!' };
  }
}
