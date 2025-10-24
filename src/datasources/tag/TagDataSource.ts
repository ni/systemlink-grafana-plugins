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
} from './types';
import { Throw } from 'core/utils';
import { expandMultipleValueVariable } from "./utils";
import { QueryHandlerFactory } from './QueryHandlerFactory';

export class TagDataSource extends DataSourceBase<TagQuery, TagDataSourceOptions> {
  public defaultQuery: Omit<TagQuery, 'refId'> = {
    type: TagQueryType.Current,
    path: '',
    workspace: '',
    properties: false,
  };

  private readonly tagUrl = this.instanceSettings.url + '/nitag/v2';
  private readonly queryHandlerFactory = new QueryHandlerFactory(this.post.bind(this), this.instanceSettings.url);

  constructor(
    readonly instanceSettings: DataSourceInstanceSettings<TagDataSourceOptions>,
    readonly backendSrv: BackendSrv = getBackendSrv(),
    readonly templateSrv: TemplateSrv = getTemplateSrv()
  ) {
    super(instanceSettings, backendSrv, templateSrv);
  }

  async runQuery(query: TagQuery, { range, maxDataPoints, scopedVars }: DataQueryRequest): Promise<DataFrameDTO> {
    const tagsWithValues = await this.getMostRecentTagsByMultiplePaths(
      this.generatePathsFromTemplate(query),
      this.templateSrv.replace(query.workspace, scopedVars)
    );

    const workspaces = await this.getWorkspaces();
    const result: DataFrameDTO = { refId: query.refId, fields: [] };

    return this.queryHandlerFactory.createQueryHandler(query.type).handleQuery(tagsWithValues, result, workspaces, range, maxDataPoints, query.properties);
  }

  /**
   * Generates paths from the template string. If the path contains a template variable, it expands it into multiple paths.
   * @param query - The query object containing the path to be expanded, multiple values are separated by commas. (ex: 0,1,2)
   * @returns An array of paths generated from the template string.
   **/
  private generatePathsFromTemplate(query: TagQuery) {
    let paths: string[] = [query.path];
    if (this.templateSrv.containsTemplate(query.path)) {
      const replacedPath = this.templateSrv.replace(
        query.path,
        undefined,
        (v: string | string[]): string => `{${v}}`
      );
      paths = expandMultipleValueVariable(replacedPath);
    }
    return paths;
  }

  private async getMostRecentTagsByMultiplePaths(paths: string[], workspace: string) {
    const workspaceQuery = [workspace || "*"];
    const response = await this.post<TagsWithValues>(`${this.tagUrl}/fetch-tags-with-values`, {
      paths: paths,
      workspaces: workspaceQuery,
      take: 100,
    });

    return response.tagsWithValues.length ? response.tagsWithValues : Throw(`No tags matched the path '${paths}'`)
  }

  shouldRunQuery(query: TagQuery): boolean {
    return !query.hide && Boolean(query.path);
  }

  async testDatasource(): Promise<TestDataSourceResponse> {
    await this.get(this.tagUrl + '/tags-count');
    return { status: 'success', message: 'Data source connected and authentication successful!' };
  }
}
