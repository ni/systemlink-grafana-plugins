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

import { TestingStatus, getBackendSrv, getTemplateSrv } from '@grafana/runtime';

import { QueryType, SystemMetadata, SystemQuery, SystemSummary, VariableQuery } from './types';
import { defaultProjection } from './constants';
import { NetworkUtils } from './network-utils';

export class SystemDataSource extends DataSourceApi<SystemQuery> {
  baseUrl: string;
  constructor(private instanceSettings: DataSourceInstanceSettings) {
    super(instanceSettings);
    this.baseUrl = this.instanceSettings.url + '/nisysmgmt/v1';
  }

  transformProjection(projections: string[]): string {
    let result = "new(";

    projections.forEach(function (field) {
      if (field === "workspace") {
        result = result.concat(field, ")");
      } else {
        result = result.concat(field, ", ");
      }
    });

    return result;
  }

  private getIpAddress(ip4Interface: Record<string, string[]>, ip6Interface: Record<string, string[]>): string | null {
    return NetworkUtils.getIpAddressFromInterfaces(ip4Interface) || NetworkUtils.getIpAddressFromInterfaces(ip6Interface);
  }

  async metricFindQuery(query: VariableQuery, options?: any) {
    const response = await getBackendSrv().post<{ data: VariableQuery[] }>(this.baseUrl + '/query-systems', { projection: "new(id, alias)" });
    const values = response.data.map(frame => ({ text: frame.alias, value: frame.id }));

    return values;
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
        const resolvedId = getTemplateSrv().replace(target.systemId);
        const postBody = {
          filter: resolvedId ? `id = "${resolvedId}"` : '',
          projection: this.transformProjection(defaultProjection)
        };
        let metadataResponse = await getBackendSrv().post<{ data: SystemMetadata[] }>(this.baseUrl + '/query-systems', postBody);
        return toDataFrame({
          fields: [
            { name: 'id', values: metadataResponse.data.map(m => m.id) },
            { name: 'alias', values: metadataResponse.data.map(m => m.alias) },
            { name: 'connection status', values: metadataResponse.data.map(m => m.state) },
            { name: 'locked status', values: metadataResponse.data.map(m => m.locked) },
            { name: 'system start time', values: metadataResponse.data.map(m => m.systemStartTime) },
            { name: 'model', values: metadataResponse.data.map(m => m.model) },
            { name: 'vendor', values: metadataResponse.data.map(m => m.vendor) },
            { name: 'operating system', values: metadataResponse.data.map(m => m.osFullName) },
            { name: 'ip address', values: metadataResponse.data.map(m => this.getIpAddress(m.ip4Interfaces, m.ip6Interfaces)) },
            { name: 'workspace', values: metadataResponse.data.map(m => m.workspace) },
          ]
        });
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
