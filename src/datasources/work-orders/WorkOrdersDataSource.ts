import { DataFrameDTO, DataQueryRequest, DataSourceInstanceSettings, TestDataSourceResponse } from '@grafana/data';
import { BackendSrv, TemplateSrv, getBackendSrv, getTemplateSrv } from '@grafana/runtime';
import { DataSourceBase } from 'core/DataSourceBase';
import { WorkOrdersQuery } from './types';

export class WorkOrdersDataSource extends DataSourceBase<WorkOrdersQuery> {
  constructor(
    readonly instanceSettings: DataSourceInstanceSettings,
    readonly backendSrv: BackendSrv = getBackendSrv(),
    readonly templateSrv: TemplateSrv = getTemplateSrv()
  ) {
    super(instanceSettings, backendSrv, templateSrv);
  }

  baseUrl = this.instanceSettings.url + '/niworkorder/v1';

  defaultQuery = {};

  async runQuery(query: WorkOrdersQuery, options: DataQueryRequest): Promise<DataFrameDTO> {
    return {
      refId: query.refId,
      fields: [],
    };
  }

  shouldRunQuery(query: WorkOrdersQuery): boolean {
    return true;
  }

  async testDatasource(): Promise<TestDataSourceResponse> {
    await this.backendSrv.get(this.baseUrl);
    return { status: 'success', message: 'Data source connected and authentication successful!' };
  }
}
