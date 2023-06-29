import {
  DataQueryRequest,
  DataQueryResponse,
  DataSourceApi,
  DataSourceInstanceSettings,
  MutableDataFrame,
  FieldType,
} from '@grafana/data';

import { TestingStatus, getBackendSrv } from '@grafana/runtime';

import { MyQuery } from './types';

export class TagDataSource extends DataSourceApi<MyQuery> {
  tagBaseUrl: string;
  constructor(private instanceSettings: DataSourceInstanceSettings) {
    super(instanceSettings);
    this.tagBaseUrl = this.instanceSettings.url + '/nitag/v2';
  }

  async query(options: DataQueryRequest<MyQuery>): Promise<DataQueryResponse> {
    const { range } = options;
    const from = range!.from.valueOf();
    const to = range!.to.valueOf();

    // Return a constant for each query.
    const data = await Promise.all(
      options.targets.map(async (target) => {
        return new MutableDataFrame({
          refId: target.refId,
          fields: [
            { name: 'Time', values: [from, to], type: FieldType.time },
            { name: 'Value', values: [target.constant, target.constant], type: FieldType.number },
          ],
        });
      })
    );

    return { data };
  }

  async testDatasource(): Promise<TestingStatus> {
    await getBackendSrv().get(this.tagBaseUrl + '/tags', { take: 1 });
    return { status: 'success', message: 'Data source connected and authentication successful!' };
  }
}
