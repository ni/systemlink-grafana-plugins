import {
  DataQueryRequest,
  DataQueryResponse,
  DataSourceApi,
  DataSourceInstanceSettings,
  MutableDataFrame,
  FieldType,
} from '@grafana/data';

import { TestingStatus, getBackendSrv } from '@grafana/runtime';

import { TagQuery } from './types';

export class TagDataSource extends DataSourceApi<TagQuery> {
  baseUrl: string;
  constructor(private instanceSettings: DataSourceInstanceSettings) {
    super(instanceSettings);
    // TODO: set base path of the service
    this.baseUrl = this.instanceSettings.url + '/nifoo/v2';
  }

  async query(options: DataQueryRequest<TagQuery>): Promise<DataQueryResponse> {
    const { range } = options;
    const from = range!.from.valueOf();
    const to = range!.to.valueOf();

    // Return a constant for each query.
    const data = options.targets.map((target) => {
      return new MutableDataFrame({
        refId: target.refId,
        fields: [
          { name: 'Time', values: [from, to], type: FieldType.time },
          { name: 'Value', values: [target.constant, target.constant], type: FieldType.number },
        ],
      });
    });

    return { data };
  }

  async testDatasource(): Promise<TestingStatus> {
    // TODO: Implement a health and authentication check
    await getBackendSrv().get(this.baseUrl + '/bar');
    return { status: 'success', message: 'Data source connected and authentication successful!' };
  }
}
