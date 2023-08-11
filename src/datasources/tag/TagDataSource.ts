import {
  DataQueryRequest,
  DataQueryResponse,
  DataSourceApi,
  DataSourceInstanceSettings,
  toDataFrame,
} from '@grafana/data';

import { BackendSrv, TestingStatus, getBackendSrv } from '@grafana/runtime';

import { TagQuery, TagWithValue } from './types';
import { throwIfNullish } from 'core/utils';

export class TagDataSource extends DataSourceApi<TagQuery> {
  baseUrl: string;
  constructor(private instanceSettings: DataSourceInstanceSettings, private backendSrv: BackendSrv = getBackendSrv()) {
    super(instanceSettings);
    this.baseUrl = this.instanceSettings.url + '/nitag/v2';
  }

  async query(options: DataQueryRequest<TagQuery>): Promise<DataQueryResponse> {
    const promises = options.targets.map(async (target) => {
      const { tag, current } = await this.getLastUpdatedTag(target.path);

      return toDataFrame({
        name: tag.properties.displayName ?? tag.path,
        fields: [{ name: 'Value', values: [current.value.value] }],
      });
    });

    return Promise.all(promises).then((data) => ({ data }));
  }

  private async getLastUpdatedTag(path: string) {
    const response = await this.backendSrv.post<{ tagsWithValues: TagWithValue[] }>(
      this.baseUrl + '/query-tags-with-values',
      {
        filter: `path = "${path}"`,
        take: 1,
        orderBy: 'TIMESTAMP',
        descending: true,
      }
    );

    return throwIfNullish(response.tagsWithValues[0], '❌');
  }

  filterQuery(query: TagQuery): boolean {
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
