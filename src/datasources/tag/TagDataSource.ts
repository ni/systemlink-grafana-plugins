import {
  DataFrameDTO,
  DataSourceInstanceSettings,
  dateTime,
  DataQueryRequest,
  TimeRange,
  FieldDTO,
  FieldType,
} from '@grafana/data';
import { BackendSrv, TemplateSrv, TestingStatus, getBackendSrv, getTemplateSrv } from '@grafana/runtime';
import { DataSourceBase } from 'core/DataSourceBase';
import { throwIfNullish } from 'core/utils';
import { TagHistoryResponse, TagQuery, TagQueryType, TagsWithValues } from './types';

export class TagDataSource extends DataSourceBase<TagQuery> {
  constructor(
    readonly instanceSettings: DataSourceInstanceSettings,
    readonly backendSrv: BackendSrv = getBackendSrv(),
    readonly templateSrv: TemplateSrv = getTemplateSrv()
  ) {
    super(instanceSettings, backendSrv);
  }

  tagUrl = this.instanceSettings.url + '/nitag/v2';
  tagHistoryUrl = this.instanceSettings.url + '/nitaghistorian/v2/tags';

  defaultQuery = {
    type: TagQueryType.Current,
    path: '',
    workspace: '',
    properties: false,
  };

  async runQuery(query: TagQuery, { range, maxDataPoints, scopedVars }: DataQueryRequest): Promise<DataFrameDTO> {
    const { tag, current } = await this.getLastUpdatedTag(
      this.templateSrv.replace(query.path, scopedVars),
      query.workspace
    );

    const name = tag.properties?.displayName ?? tag.path;
    const result: DataFrameDTO = { refId: query.refId, fields: [] };

    if (query.type === TagQueryType.Current) {
      result.fields = [
        { name, values: [this.convertTagValue(tag.datatype, current?.value.value)] },
        { name: 'updated', values: [current?.timestamp], type: FieldType.time, config: { unit: 'dateTimeFromNow' } },
      ];
    } else {
      const history = await this.getTagHistoryValues(tag.path, tag.workspace_id, range, maxDataPoints);
      result.fields = [
        { name: 'time', values: history.datetimes },
        { name, values: history.values },
      ];
    }

    if (query.properties) {
      result.fields = result.fields.concat(this.getPropertiesAsFields(tag.properties));
    }

    return result;
  }

  private async getLastUpdatedTag(path: string, workspace: string) {
    let filter = `path = "${path}"`;
    if (workspace) {
      filter += ` && workspace = "${workspace}"`;
    }

    const response = await this.post<TagsWithValues>(this.tagUrl + '/query-tags-with-values', {
      filter,
      take: 1,
      orderBy: 'TIMESTAMP',
      descending: true,
    });

    return throwIfNullish(response.tagsWithValues[0], `No tags matched the path '${path}'`);
  }

  private async getTagHistoryValues(path: string, workspace: string, range: TimeRange, intervals?: number) {
    const response = await this.post<TagHistoryResponse>(this.tagHistoryUrl + '/query-decimated-history', {
      paths: [path],
      workspace,
      startTime: range.from.toISOString(),
      endTime: range.to.toISOString(),
      decimation: intervals ? Math.min(intervals, 1000) : 500,
    });

    const { type, values } = response.results[path];
    return {
      datetimes: values.map(v => dateTime(v.timestamp).valueOf()),
      values: values.map(v => this.convertTagValue(type, v.value)),
    };
  }

  private convertTagValue(type: string, value?: string) {
    return value && ['DOUBLE', 'INT', 'U_INT64'].includes(type) ? Number(value) : value;
  }

  private getPropertiesAsFields(properties: Record<string, string> | null): FieldDTO[] {
    if (!properties) {
      return [];
    }

    return Object.keys(properties)
      .filter(name => !name.startsWith('nitag'))
      .map(name => ({ name, values: [properties[name]] }));
  }

  shouldRunQuery(query: TagQuery): boolean {
    return Boolean(query.path);
  }

  async testDatasource(): Promise<TestingStatus> {
    await this.get(this.tagUrl + '/tags-count');
    return { status: 'success', message: 'Data source connected and authentication successful!' };
  }
}
