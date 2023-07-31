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

import { QueryType, SystemMetadata, SystemQuery, SystemSummary } from './types';
import { defaultProjection } from './constants';

export class SystemDataSource extends DataSourceApi<SystemQuery> {
  baseUrl: string;
  constructor(private instanceSettings: DataSourceInstanceSettings) {
    super(instanceSettings);
    this.baseUrl = this.instanceSettings.url + '/nisysmgmt/v1';
  }

  projectionTransformer (projections: string[]): string { // GYC: why can't i write "function"
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
        let metadataResponse = await getBackendSrv().post<{ data: SystemMetadata[] }>(this.baseUrl + '/query-systems', { projection: this.projectionTransformer(defaultProjection) });
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
