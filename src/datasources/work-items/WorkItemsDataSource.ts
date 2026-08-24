import {
  DataFrameDTO,
  DataQueryRequest,
  DataSourceInstanceSettings,
  TestDataSourceResponse,
} from '@grafana/data';
import { BackendSrv, TemplateSrv, getBackendSrv, getTemplateSrv } from '@grafana/runtime';
import { DataSourceBase } from 'core/DataSourceBase';
import { WorkItemsQuery } from './types';

export class WorkItemsDataSource extends DataSourceBase<WorkItemsQuery> {
  constructor(
    readonly instanceSettings: DataSourceInstanceSettings,
    readonly backendSrv: BackendSrv = getBackendSrv(),
    readonly templateSrv: TemplateSrv = getTemplateSrv()
  ) {
    super(instanceSettings, backendSrv, templateSrv);
  }

  baseUrl = `${this.instanceSettings.url}/niworkitem/v1`;
  queryWorkItemsUrl = `${this.baseUrl}/query-workitems`;

  defaultQuery = {};

  async runQuery(query: WorkItemsQuery, _options: DataQueryRequest<WorkItemsQuery>): Promise<DataFrameDTO> {
    return {
      refId: query.refId,
      name: query.refId,
      fields: [],
    };
  }

  shouldRunQuery(query: WorkItemsQuery): boolean {
    return !query.hide;
  }

  async testDatasource(): Promise<TestDataSourceResponse> {
    await this.post(this.queryWorkItemsUrl, { take: 1 }, { showErrorAlert: false });
    return { status: 'success', message: 'Data source connected and authentication successful!' };
  }
}
