import {
  DataFrameDTO,
  DataSourceInstanceSettings,
  DataQueryRequest,
  TimeRange,
  FieldType,
  TestDataSourceResponse,
  FieldConfig,
  dateTime,
} from '@grafana/data';
import { BackendSrv, TemplateSrv, getBackendSrv, getTemplateSrv } from '@grafana/runtime';
import { DataSourceBase } from 'core/DataSourceBase';
import {
  TagDataSourceOptions,
  TagHistoryResponse,
  TagQuery,
  TagQueryType,
  TagsWithValues,
  TagWithValue,
  TimeAndTagTypeValues,
  TypeAndValues,
} from './types';
import { Throw, getWorkspaceName } from 'core/utils';
import { expandMultipleValueVariable } from "./utils";

export class TagDataSource extends DataSourceBase<TagQuery, TagDataSourceOptions> {
  public defaultQuery: Omit<TagQuery, 'refId'> = {
    type: TagQueryType.Current,
    path: '',
    workspace: '',
    properties: false,
  };

  private readonly tagUrl = this.instanceSettings.url + '/nitag/v2';
  private readonly tagHistoryUrl = this.instanceSettings.url + '/nitaghistorian/v2/tags';

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

    if (query.type === TagQueryType.Current) {
      return this.handleCurrentQuery(query.properties, tagsWithValues, result);
    } else {
      return this.handleHistoricalQuery(tagsWithValues, workspaces, range, maxDataPoints, result);
    }
  }

  private handleCurrentQuery(queryProperties: boolean, tagsWithValues: TagWithValue[], result: DataFrameDTO): DataFrameDTO {
    const allPossibleProps = this.getAllProperties(tagsWithValues);
    result.fields = [
      {
        name: 'name',
        values: tagsWithValues.map(({ tag }: TagWithValue) => tag.properties?.displayName || tag.path)
      },
      {
        name: 'value',
        values: tagsWithValues.map(({ tag, current }: TagWithValue) => this.convertTagValue(tag.type ?? tag.datatype, current?.value.value)),
      },
      {
        name: 'updated',
        values: tagsWithValues.map(({ current }: TagWithValue) => current?.timestamp),
        type: FieldType.time,
        config: { unit: 'dateTimeFromNow' }
      }
    ];

    if (queryProperties) {
      allPossibleProps.forEach((prop) => {
        result.fields.push(
          {
            name: prop,
            values: tagsWithValues.map(({ tag }: TagWithValue) => tag.properties && tag.properties[prop] ? tag.properties[prop] : '')
          }
        );
      });
    }

    return result;
  }

  private async handleHistoricalQuery(
    tagsWithValues: TagWithValue[],
    workspaces: any,
    range: TimeRange,
    maxDataPoints: number | undefined,
    result: DataFrameDTO
  ): Promise<DataFrameDTO> {
    const workspaceTagMap: Record<string, TagWithValue[]> = {};
    const tagPropertiesMap: Record<string, Record<string, string> | null> = {};

    // Identify tags that exist in more than one workspace
    const tagPathCount: Record<string, number> = {};
    for (const tagWithValue of tagsWithValues) {
      tagPathCount[tagWithValue.tag.path] = (tagPathCount[tagWithValue.tag.path] || 0) + 1;
    }

    for (const tagWithValue of tagsWithValues) {
      const workspace = tagWithValue.tag.workspace ?? tagWithValue.tag.workspace_id;
      if (!workspaceTagMap[workspace]) {
        workspaceTagMap[workspace] = [];
      }
      workspaceTagMap[workspace].push(tagWithValue);
      const prefixedPath = tagPathCount[tagWithValue.tag.path] > 1
        ? `${getWorkspaceName(workspaces, workspace)}.${tagWithValue.tag.path}`
        : tagWithValue.tag.path;
      tagPropertiesMap[prefixedPath] = tagWithValue.tag.properties;
    }

    let tagsDecimatedHistory: { [key: string]: TypeAndValues } = {};
    for (const workspace in workspaceTagMap) {
      const tagHistoryResponse = await this.getTagHistoryWithChunks(
        workspaceTagMap[workspace],
        workspace,
        range,
        maxDataPoints
      )
      for (const path in tagHistoryResponse.results) {
        const prefixedPath = tagPathCount[path] > 1
          ? `${getWorkspaceName(workspaces, workspace)}.${path}`
          : path;
        tagsDecimatedHistory[prefixedPath] = tagHistoryResponse.results[path];
      }
    }

    const mergedTagValuesWithType = this.mergeTagsHistoryValues(tagsDecimatedHistory);
    result.fields.push({
      name: 'time', values: mergedTagValuesWithType.timestamps.map(v => dateTime(v).valueOf()), type: FieldType.time
    });

    for (const path in mergedTagValuesWithType.values) {
      const config: FieldConfig = {};
      const tagProps = tagPropertiesMap[path]
      if (tagProps?.units) {
        config.unit = tagProps.units
      }
      if (tagProps?.displayName) {
        config.displayName = tagProps.displayName
        config.displayNameFromDS = tagProps.displayName
      }
      result.fields.push({
        name: path,
        values: mergedTagValuesWithType.values[path].values.map((value) => {
          return this.convertTagValue(mergedTagValuesWithType.values[path].type, value)
        }),
        config
      });
    }

    return result;
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
    let filter = `(${paths.map(path => `path = "${path}"`).join(' or ')})`;
    if (workspace) {
      filter += ` && workspace = "${workspace}"`;
    }
    const response = await this.post<TagsWithValues>(this.tagUrl + '/query-tags-with-values', {
      filter,
      take: 100,
      orderBy: 'TIMESTAMP',
      descending: true,
    });

    return response.tagsWithValues.length ? response.tagsWithValues : Throw(`No tags matched the path '${paths}'`)
  }

  private async getTagHistoryWithChunks(paths: TagWithValue[], workspace: string, range: TimeRange, intervals?: number): Promise<TagHistoryResponse> {
    const chunkSize = 10;
    const pathChunks: TagWithValue[][] = [];
    for (let i = 0; i < paths.length; i += chunkSize) {
      pathChunks.push(paths.slice(i, i + chunkSize));
    }

    const aggregatedResults: TagHistoryResponse = { results: {} };

    // Fetch and aggregate the data from each chunk in parallel
    const chunkResults = await Promise.all(
      pathChunks.map((chunk) => this.getTagHistoryValues(chunk.map(({ tag }) => tag.path), workspace, range, intervals))
    );

    // Merge the results from all chunks
    for (const chunkResult of chunkResults) {
      for (const [path, data] of Object.entries(chunkResult.results)) {
        if (!aggregatedResults.results[path]) {
          aggregatedResults.results[path] = data;
        } else {
          aggregatedResults.results[path].values.push(...data.values);
        }
      }
    }

    return aggregatedResults;
  }

  private async getTagHistoryValues(paths: string[], workspace: string, range: TimeRange, intervals?: number): Promise<TagHistoryResponse> {
    return await this.post<TagHistoryResponse>(`${this.tagHistoryUrl}/query-decimated-history`, {
      paths,
      workspace,
      startTime: range.from.toISOString(),
      endTime: range.to.toISOString(),
      decimation: intervals ? Math.min(intervals, 1000) : 500,
    });
  };

  private convertTagValue(type: string, value?: string) {
    return value && ['DOUBLE', 'INT', 'U_INT64'].includes(type) ? Number(value) : value;
  }

  private getAllProperties(data: TagWithValue[]) {
    const props: Set<string> = new Set();
    data.forEach((tag) => {
      if (tag.tag.properties) {
        Object.keys(tag.tag.properties)
          .filter(name => !name.startsWith('nitag'))
          .forEach((name) => {
            props.add(name)
          })
      }
    })

    return props
  }

  shouldRunQuery(query: TagQuery): boolean {
    return Boolean(query.path);
  }

  mergeTagsHistoryValues = (history: Record<string, TypeAndValues>): TimeAndTagTypeValues => {
    const timestampsSet: Set<string> = new Set();
    const values: TimeAndTagTypeValues = {
      timestamps: [],
      values: {}
    };
    for (const path in history) {
      for (const { timestamp } of history[path].values) {
        timestampsSet.add(timestamp);
      }
    }
    // Uniq timestamps from history data
    const timestamps = [...timestampsSet];
    // Sort timestamps to ensure a consistent order
    timestamps.sort();
    values.timestamps = timestamps;

    // Initialize arrays for each key
    for (const path in history) {
      values.values[path] = { 'type': history[path].type, 'values': new Array(timestamps.length).fill(null) };
    }
    // Populate the values arrays
    for (const path in history) {
      for (const historicalValue of history[path].values) {
        const index = timestamps.indexOf(historicalValue.timestamp);
        values.values[path]['values'][index] = historicalValue.value;
      }
    }

    return values;
  }

  async testDatasource(): Promise<TestDataSourceResponse> {
    await this.get(this.tagUrl + '/tags-count');
    return { status: 'success', message: 'Data source connected and authentication successful!' };
  }
}
