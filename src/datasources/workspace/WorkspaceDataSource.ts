import { DataFrameDTO, DataSourceInstanceSettings, DataSourceJsonData,  MetricFindValue, TestDataSourceResponse, toDataFrame } from '@grafana/data';
import { BackendSrv, TemplateSrv, getBackendSrv, getTemplateSrv } from '@grafana/runtime';
import { DataSourceBase } from 'core/DataSourceBase';
import { Workspace } from 'core/types';
import { WorkspaceQuery, WorkspaceDataSourceVariable } from './types';

export class WorkspaceDataSource extends DataSourceBase<WorkspaceQuery, DataSourceJsonData> {

  constructor(
    readonly instanceSettings: DataSourceInstanceSettings,
    readonly backendSrv: BackendSrv = getBackendSrv(),
    readonly templateSrv: TemplateSrv = getTemplateSrv()
  ) {
    super(instanceSettings, backendSrv, templateSrv);
    instanceSettings.type = 'datasource';
    this.variables = new WorkspaceDataSourceVariable();
  }

  baseUrl = this.instanceSettings.url + '/niuser/v1';

  defaultQuery = { key: 'default' };
 
  async runQuery(_query: WorkspaceQuery): Promise<DataFrameDTO> {
    return toDataFrame({ fields: this.workspacesToFields( await this.getWorkspaces()) });
  }

  shouldRunQuery(): boolean {
    return true;
  }

  async testDatasource(): Promise<TestDataSourceResponse> {
    await this.get(this.baseUrl + '/workspaces');
    return { status: 'success', message: 'Data source connected and authentication successful!' };
  }

  async metricFindQuery(): Promise<MetricFindValue[]> {
    const workspaces = await this.getWorkspaces();
    return workspaces.map(ws => ({ text: ws.name, value: ws.id }));
  }

  private workspacesToFields(workspaces: Workspace[]): Array<{ name: string, values: string[] }> {
    return [
      { name: 'name', values: workspaces.map((workspace: Workspace) => workspace.name) }
    ]
  }
}
