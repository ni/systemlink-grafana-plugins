import {
  DataQueryRequest,
  DataQueryResponse,
  DataSourceApi,
  DataSourceInstanceSettings,
  MutableDataFrame,
  FieldType,
} from '@grafana/data';

import { TestingStatus, getBackendSrv } from '@grafana/runtime';

import { JobQuery, JobSummary, QueryType } from './types';

export class JobDataSource extends DataSourceApi<JobQuery> {
  baseUrl: string;
  constructor(private instanceSettings: DataSourceInstanceSettings) {
    super(instanceSettings);
    this.baseUrl = this.instanceSettings.url + '/nisysmgmt/v1';
  }

  async query(options: DataQueryRequest<JobQuery>): Promise<DataQueryResponse> {
    const { range } = options;
    const from = range!.from.valueOf();
    const to = range!.to.valueOf();

    // Return a constant for each query.
    const data = await Promise.all(options.targets.map(async (target) => {
      if (target.type === QueryType.Summmary) {
        var response = await getBackendSrv().get<JobSummary>(this.baseUrl + '/get-jobs-summary');
        return new MutableDataFrame({
          refId: target.refId,
          fields: [
            { name: 'Active Count', values: [response.activeCount], type: FieldType.number },
            { name: 'Failed Count', values: [response.failedCount], type: FieldType.number },
            { name: 'Succeeded Count', values: [response.succeededCount], type: FieldType.number },
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
    await getBackendSrv().get(this.baseUrl + '/jobs', { take: 1 });
    return { status: 'success', message: 'Data source connected and authentication successful!' };
  }
}
