import {
  DataFrameDTO,
  DataSourceInstanceSettings,
  DataQueryRequest,
  TimeRange,
  FieldConfig,
  FieldType,
  MetricFindValue,
  TestDataSourceResponse,
} from '@grafana/data';
import { BackendSrv, TemplateSrv, getBackendSrv, getTemplateSrv } from '@grafana/runtime';
import { DataSourceBase } from 'core/DataSourceBase';
import { expandMultipleValueVariableAfterReplace, Throw } from 'core/utils';
import {
  TimeAndTagTypeValues,
  TagDataType,
  TagHistoryResponse,
  TagQuery,
  TagQueryType,
  TagsWithValues,
  TagVariableQuery,
  TagWithValue,
  TypeAndValues
} from './types';

export class TagDataSource extends DataSourceBase<TagQuery> {
  constructor(
    readonly instanceSettings: DataSourceInstanceSettings,
    readonly backendSrv: BackendSrv = getBackendSrv(),
    readonly templateSrv: TemplateSrv = getTemplateSrv()
  ) {
    super(instanceSettings, backendSrv, templateSrv);
  }

  tagUrl = this.instanceSettings.url + '/nitag/v2';
  tagHistoryUrl = this.instanceSettings.url + '/nitaghistorian/v2/tags';

  defaultQuery: Omit<TagQuery, 'refId'> = {
    type: TagQueryType.Current,
    path: '',
    workspace: '',
    properties: false,
  };

  async runQuery(query: TagQuery, { range, maxDataPoints, scopedVars }: DataQueryRequest): Promise<DataFrameDTO> {
    let paths: string[] = [query.path];
    if (this.templateSrv.containsTemplate(query.path)) {
      // wrap replaced variable in extra curly braces, protecting original {} in tag path from misinterpretation.
      const replacedPath = this.templateSrv.replace(
        query.path,
        {},
        (v: string | string[]): string => `{{${v}}}`
      );
      paths = expandMultipleValueVariableAfterReplace(replacedPath);
    }
    const workspace = this.templateSrv.replace(query.workspace, scopedVars);
    const tagsLastUpdates: TagWithValue[] = await this.getLastUpdatedTag(paths, workspace);
    const result: DataFrameDTO = { refId: query.refId, fields: [] };

    if (query.type === TagQueryType.Current) {
      const allPossibleProps = this.getAllProperties(tagsLastUpdates);
      result.fields = [
        {
          name: 'name',
          values: tagsLastUpdates.map((tag: TagWithValue) => tag.tag.properties?.displayName || tag.tag.path)
        },
        {
          name: 'currentValue',
          values: tagsLastUpdates.map((tag: TagWithValue) => this.convertTagValue(tag.tag.type ?? tag.tag.datatype, tag.current?.value.value)),
        },
        {
          name: 'updated',
          values: tagsLastUpdates.map((tag: TagWithValue) => tag.current?.timestamp),
          type: FieldType.time,
          config: { unit: 'dateTimeFromNow' }
        }
      ]
      if (query.properties) {
        allPossibleProps.forEach((prop) => {
          result.fields.push(
            {
              name: prop,
              values: tagsLastUpdates.map((tag: TagWithValue) => tag.tag.properties ? tag.tag.properties[prop] : '')
            }
          );
        });
      }

      return result
    } else {
      const tagPropertiesMap: Record<string, Record<string, string> | null> = {};
      tagsLastUpdates.forEach((tag: TagWithValue) => {
        tagPropertiesMap[tag.tag.path] = tag.tag.properties
      });
      const workspaceFromResponse = tagsLastUpdates[0].tag.workspace ?? tagsLastUpdates[0].tag.workspace_id;
      const tagHistoryResponse = await this.getTagHistoryWithChunks(Object.keys(tagPropertiesMap), workspaceFromResponse, range, maxDataPoints);
      const mergedTagValuesWithType = this.mergeTagsHistoryValues(tagHistoryResponse.results);
      result.fields.push({
        name: 'time', 'values': mergedTagValuesWithType.timestamps, type: FieldType.time
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

      return result
    }
  }

  private async getLastUpdatedTag(paths: string[], workspace: string) {
    let filter = '';
    const pathsFilter: string[] = [];
    paths.forEach((path: string) => {
      pathsFilter.push(`path = "${path}"`);
    })
    const pathsFilterStr = pathsFilter.join(' OR ');
    filter += `(${pathsFilter.join(' OR ')})`;
    if (workspace) {
      filter += ` AND workspace = "${workspace}"`;
    }
    const response = await this.post<TagsWithValues>(this.tagUrl + '/query-tags-with-values', {
      filter,
      take: 100,
      orderBy: 'TIMESTAMP',
      descending: true,
    });

    return response.tagsWithValues.length ? response.tagsWithValues : Throw(`No tags matched the path '${pathsFilterStr}'`)
  }

  private async getTagHistoryWithChunks(paths: string[], workspace: string, range: TimeRange, intervals?: number): Promise<TagHistoryResponse> {
    const pathChunks: string[][] = [];
    for (let i = 0; i < paths.length; i += 10) {
      pathChunks.push(paths.slice(i, i + 10));
    }
    // Fetch and aggregate the data from each chunk
    const aggregatedResults: TagHistoryResponse = { results: {} };
    for (const chunk of pathChunks) {
      const chunkResult = await this.getTagHistoryValues(chunk, workspace, range, intervals);
      // Merge the results from the current chunk with the aggregated results
      for (const [path, data] of Object.entries(chunkResult.results)) {
        if (!aggregatedResults.results[path]) {
          aggregatedResults.results[path] = data;
        } else {
          aggregatedResults.results[path].values = aggregatedResults.results[path].values.concat(data.values);
        }
      }
    }

    return aggregatedResults;
  }

  getTagHistoryValues = async (paths: string[], workspace: string, range: TimeRange, intervals?: number): Promise<TagHistoryResponse> => {
    return this.post<TagHistoryResponse>(`${this.tagHistoryUrl}/query-decimated-history`, {
      paths: paths,
      workspace: workspace,
      startTime: range.from.toISOString(),
      endTime: range.to.toISOString(),
      decimation: intervals ? Math.min(intervals, 1000) : 500,
    });
  };

  private convertTagValue(type: TagDataType, value?: string) {
    return value && [TagDataType.DOUBLE, TagDataType.INT, TagDataType.U_INT64].includes(type) ? Number(value) : value;
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

  async metricFindQuery({ workspace, path }: TagVariableQuery): Promise<MetricFindValue[]> {
    // Skip querying when no paths are provided
    if (!path) {
      return []
    }
    let paths: string[] = [path];
    // wrap replaced variable in extra curly braces, protecting original {} tags from misinterpretation.
    const parsedWorkspace = this.templateSrv.replace(workspace);
    if (this.templateSrv.containsTemplate(path)) {
      const replacedPath = this.templateSrv.replace(
        path,
        {},
        (v: string | string[]): string => `{{${v}}}`
      );
      paths = expandMultipleValueVariableAfterReplace(replacedPath);
    }
    const metadata = await this.getLastUpdatedTag(paths, parsedWorkspace);
    return metadata.map((frame) => {
      return {
        text: frame.tag.properties?.displayName ? frame.tag.properties['displayName'] : frame.tag.path,
        value: frame.tag.path
      }
    });
  }

  async testDatasource(): Promise<TestDataSourceResponse> {
    await this.get(this.tagUrl + '/tags-count');
    return { status: 'success', message: 'Data source connected and authentication successful!' };
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
    //uniq timestamps from history data
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
}
