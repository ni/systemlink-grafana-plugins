import { DataFrameDTO, DataSourceInstanceSettings, dateTime, DataQueryRequest, TimeRange } from '@grafana/data';
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
    super(instanceSettings);
  }

  tagUrl = this.instanceSettings.url + '/nitag/v2';
  tagHistoryUrl = this.instanceSettings.url + '/nitaghistorian/v2/tags';

  defaultQuery = {
    type: TagQueryType.Current,
    path: '',
    workspace: '',
  };

  async runQuery(query: TagQuery, { range, maxDataPoints, scopedVars }: DataQueryRequest): Promise<DataFrameDTO> {
    const { tag, current } = await this.getLastUpdatedTag(
      this.templateSrv.replace(query.path, scopedVars),
      query.workspace
    );

    const name = tag.properties?.displayName ?? tag.path;

    if (query.type === TagQueryType.Current) {
      return {
        refId: query.refId,
        name,
        fields: [{ name: 'value', values: [current.value.value] }],
      };
    }

    const history = await this.getTagHistoryValues(tag.path, tag.workspace_id, range, maxDataPoints);
    return {
      refId: query.refId,
      name,
      fields: [
        { name: 'time', values: history.datetimes },
        { name: 'value', values: history.values },
      ],
    };
  }

  private async getLastUpdatedTag(path: string, workspace: string) {
    let filter = `path = "${path}"`;
    if (workspace) {
      filter += ` && workspace = "${workspace}"`;
    }

    const response = await this.backendSrv.post<TagsWithValues>(this.tagUrl + '/query-tags-with-values', {
      filter,
      take: 1,
      orderBy: 'TIMESTAMP',
      descending: true,
    });

    return throwIfNullish(response.tagsWithValues[0], `No tags matched the path '${path}'`);
  }

  private async getTagHistoryValues(path: string, workspace: string, range: TimeRange, intervals?: number) {
    const response = await this.backendSrv.post<TagHistoryResponse>(this.tagHistoryUrl + '/query-decimated-history', {
      paths: [path],
      workspace,
      startTime: range.from.toISOString(),
      endTime: range.to.toISOString(),
      decimation: intervals ? Math.min(intervals, 1000) : 500,
    });

    const { type, values } = response.results[path];
    return {
      datetimes: values.map(v => dateTime(v.timestamp).valueOf()),
      values: values.map(v => this.convertTagValue(v.value, type)),
    };
  }

  private convertTagValue(value: string, type: string) {
    return type === 'DOUBLE' || type === 'INT' || type === 'U_INT64' ? Number(value) : value;
  }

  shouldRunQuery(query: TagQuery): boolean {
    return Boolean(query.path);
  }

  async testDatasource(): Promise<TestingStatus> {
    await this.backendSrv.get(this.tagUrl + '/tags-count');
    return { status: 'success', message: 'Data source connected and authentication successful!' };
  }
}
