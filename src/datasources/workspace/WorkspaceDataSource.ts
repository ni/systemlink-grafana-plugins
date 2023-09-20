import { DataFrameDTO, DataQueryRequest, DataSourceInstanceSettings, FieldType } from '@grafana/data';
import { BackendSrv, TemplateSrv, TestingStatus, getBackendSrv, getTemplateSrv } from '@grafana/runtime';
import { DataSourceBase } from 'core/DataSourceBase';
import { WorkspaceQuery } from './types';

export class WorkspaceDataSource extends DataSourceBase<WorkspaceQuery> {
  constructor(
    readonly instanceSettings: DataSourceInstanceSettings,
    readonly backendSrv: BackendSrv = getBackendSrv(),
    readonly templateSrv: TemplateSrv = getTemplateSrv()
  ) {
    super(instanceSettings, backendSrv);
  }

  baseUrl = this.instanceSettings.url + '/niuser/v1';

  defaultQuery = {
    constant: 3.14,
  };

  async runQuery(query: WorkspaceQuery, { range }: DataQueryRequest): Promise<DataFrameDTO> {
    return {
      refId: query.refId,
      fields: [
        { name: 'Time', values: [range.from.valueOf(), range.to.valueOf()], type: FieldType.time },
        { name: 'Value', values: [query.constant, query.constant], type: FieldType.number },
      ],
    };
  }

  shouldRunQuery(query: WorkspaceQuery): boolean {
    return true;
  }

  async testDatasource(): Promise<TestingStatus> {
    await this.get(this.baseUrl + '/workspaces');
    return { status: 'success', message: 'Data source connected and authentication successful!' };
  }
}
