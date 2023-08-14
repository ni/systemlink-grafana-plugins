import {
  DataFrameDTO,
  DataQueryRequest,
  DataQueryResponse,
  DataSourceApi,
  DataSourceInstanceSettings,
} from '@grafana/data';

import { BackendSrv, TestingStatus, getBackendSrv } from '@grafana/runtime';

import { TagQuery, TagsWithValues } from './types';
import { throwIfNullish } from 'core/utils';

export class TagDataSource extends DataSourceApi<TagQuery> {
  baseUrl: string;
  constructor(private instanceSettings: DataSourceInstanceSettings, private backendSrv: BackendSrv = getBackendSrv()) {
    super(instanceSettings);
    this.baseUrl = this.instanceSettings.url + '/nitag/v2';
  }

  async query(options: DataQueryRequest<TagQuery>): Promise<DataQueryResponse> {
    return { data: await Promise.all(options.targets.filter(this.shouldRunQuery).map(this.runQuery, this)) };
  }

  private async runQuery(query: TagQuery): Promise<DataFrameDTO> {
    const { tag, current } = await this.getLastUpdatedTag(query.path);

    return {
      refId: query.refId,
      name: tag.properties.displayName ?? tag.path,
      fields: [{ name: 'value', values: [current.value.value] }],
    };
  }

  private async getLastUpdatedTag(path: string) {
    const response = await this.backendSrv.post<TagsWithValues>(
      this.baseUrl + '/query-tags-with-values',
      {
        filter: `path = "${path}"`,
        take: 1,
        orderBy: 'TIMESTAMP',
        descending: true,
      }
    );

    return throwIfNullish(response.tagsWithValues[0], `No tags matched the path '${path}'`);
  }

  private shouldRunQuery(query: TagQuery): boolean {
    return Boolean(query.path);
  }

  getDefaultQuery(): Omit<TagQuery, 'refId'> {
    return {
      path: '',
    };
  }

  async testDatasource(): Promise<TestingStatus> {
    await this.backendSrv.get(this.baseUrl + '/tags-count');
    return { status: 'success', message: 'Data source connected and authentication successful!' };
  }
}
