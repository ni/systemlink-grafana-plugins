import {
  DataQueryRequest,
  DataQueryResponse,
  DataSourceApi,
  DataSourceInstanceSettings,
  MutableDataFrame,
  FieldType,
  CoreApp,
} from '@grafana/data';

import { TestingStatus, getBackendSrv } from '@grafana/runtime';

import { QueryType, SystemQuery, SystemSummary } from './types';

export class SystemDataSource extends DataSourceApi<SystemQuery> {
  baseUrl: string;
  constructor(private instanceSettings: DataSourceInstanceSettings) {
    super(instanceSettings);
    this.baseUrl = this.instanceSettings.url + '/nisysmgmt/v1';
  }

  async query(options: DataQueryRequest<SystemQuery>): Promise<DataQueryResponse> {
    // Return a constant for each query.
    const data = await Promise.all(options.targets.map(async (target) => {
      if (target.queryKind === QueryType.Summary) {
        let summaryResponse = await getBackendSrv().get<SystemSummary>(this.baseUrl + '/get-systems-summary');
        return new MutableDataFrame({
          refId: target.refId,
          fields: [
            { name: 'Connected', values: [summaryResponse.connectedCount], type: FieldType.number },
            { name: 'Disconnected', values: [summaryResponse.disconnectedCount], type: FieldType.number },
          ],
        });
      } else {
        throw Error("Not implemented");
      }
    }));

    return { data };
  }

  getDefaultQuery(_core: CoreApp): Partial<SystemQuery> {
    return {
      queryKind: QueryType.Summary,
    };
  }

  async testDatasource(): Promise<TestingStatus> {
    await getBackendSrv().get(this.baseUrl + '/get-systems-summary');
    return { status: 'success', message: 'Data source connected and authentication successful!' };
  }
}
