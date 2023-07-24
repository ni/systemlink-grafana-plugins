import {
  DataQueryRequest,
  DataQueryResponse,
  DataSourceApi,
  DataSourceInstanceSettings,
  MutableDataFrame,
  FieldType,
} from '@grafana/data';

import { TestingStatus, getBackendSrv } from '@grafana/runtime';

import { QueryType, SystemQuery, SystemSummary } from './types';

export class SystemDataSource extends DataSourceApi<SystemQuery> {
  baseUrl: string;
  constructor(private instanceSettings: DataSourceInstanceSettings) {
    super(instanceSettings);
    this.baseUrl = this.instanceSettings.url + '/nisysmgmt/v1';
  }

  // async query(options: DataQueryRequest<SystemQuery>): Promise<DataQueryResponse> {
  //   const { range } = options;
  //   const from = range!.from.valueOf();
  //   const to = range!.to.valueOf();

  //   // Return a constant for each query.
  //   const data = options.targets.map((target) => {
  //     return new MutableDataFrame({
  //       refId: target.refId,
  //       fields: [
  //         { name: 'Time', values: [from, to], type: FieldType.time },
  //         { name: 'Value', values: [1, 2], type: FieldType.number },
  //       ],
  //     });
  //   });

  //   return { data };
  // }

  async query(options: DataQueryRequest<SystemQuery>): Promise<DataQueryResponse> {
    const { range } = options;
    const from = range!.from.valueOf();
    const to = range!.to.valueOf();

    // Return a constant for each query.
    const data = await Promise.all(options.targets.map(async (target) => {
      if (target.queryClass === QueryType.Summary) {
        var summaryResponse = await getBackendSrv().get<SystemSummary>(this.baseUrl + '/get-systems-summary');
        return new MutableDataFrame({
          refId: target.refId,
          fields: [
            { name: 'Connected Count', values: [summaryResponse.connectedCount], type: FieldType.number },
            { name: 'Disconnected Count', values: [summaryResponse.disconnectedCount], type: FieldType.number },
          ],
        });
      } else {
        return new MutableDataFrame({
          refId: target.refId,
          fields: [
            { name: 'Time', values: [from, to], type: FieldType.time },
            { name: 'Value', values: [1, 2], type: FieldType.number },
          ],
        });
      }
    }));

    return { data };
  }

  async testDatasource(): Promise<TestingStatus> {
    await getBackendSrv().get(this.baseUrl + '/get-systems-summary');
    return { status: 'success', message: 'Data source connected and authentication successful!' };
  }
}
