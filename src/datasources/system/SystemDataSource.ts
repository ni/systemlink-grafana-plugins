import {
  DataQueryRequest,
  DataQueryResponse,
  DataSourceApi,
  DataSourceInstanceSettings,
  MutableDataFrame,
  FieldType,
  CoreApp,
  toDataFrame,
} from '@grafana/data';

import { TestingStatus, getBackendSrv } from '@grafana/runtime';

import { QueryType, SystemInfo, SystemQuery, SystemSummary } from './types';

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
        var metadataResponse = await getBackendSrv().post<{ data: SystemInfo[] }>(this.baseUrl + '/query-systems', { projection: "new(id, alias, connected.data.state, grains.data.minion_blackout as locked, grains.data.boottime as systemStartTime, grains.data.productname as model, grains.data.manufacturer as vendor, grains.data.osfullname as osFullName, grains.data.ip4_interfaces as ip4Interfaces, grains.data.ip6_interfaces as ip6Interfaces, workspace)" });
        return toDataFrame(metadataResponse.data);
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
