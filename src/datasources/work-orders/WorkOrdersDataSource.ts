import { DataFrameDTO, DataQueryRequest, DataSourceInstanceSettings, TestDataSourceResponse } from '@grafana/data';
import { BackendSrv, TemplateSrv, getBackendSrv, getTemplateSrv } from '@grafana/runtime';
import { DataSourceBase } from 'core/DataSourceBase';
import { OutputType, WorkOrderProperties, WorkOrderPropertiesOptions, WorkOrdersQuery } from './types';

export class WorkOrdersDataSource extends DataSourceBase<WorkOrdersQuery> {
  constructor(
    readonly instanceSettings: DataSourceInstanceSettings,
    readonly backendSrv: BackendSrv = getBackendSrv(),
    readonly templateSrv: TemplateSrv = getTemplateSrv()
  ) {
    super(instanceSettings, backendSrv, templateSrv);
  }

  baseUrl = `${this.instanceSettings.url}/niworkorder/v1`;
  queryWorkOrdersUrl = `${this.baseUrl}/query-workorders`;

  defaultQuery = {
    outputType: OutputType.Properties,
    properties: [
      WorkOrderPropertiesOptions.NAME,
      WorkOrderPropertiesOptions.STATE,
      WorkOrderPropertiesOptions.REQUESTED_BY,
      WorkOrderPropertiesOptions.ASSIGNED_TO,
      WorkOrderPropertiesOptions.EARLIEST_START_DATE,
      WorkOrderPropertiesOptions.DUE_DATE,
      WorkOrderPropertiesOptions.UPDATED_AT,
    ] as WorkOrderProperties[],
  };

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
    await this.post(this.queryWorkOrdersUrl, { take: 1 });
    return { status: 'success', message: 'Data source connected and authentication successful!' };
  }
}
