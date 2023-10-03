import { DataFrameDTO, DataSourceInstanceSettings, MetricFindValue } from '@grafana/data';
import { BackendSrv, TemplateSrv, TestingStatus, getBackendSrv, getTemplateSrv } from '@grafana/runtime';
import { DataSourceBase } from 'core/DataSourceBase';
import { Workspace } from 'core/types';
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

  defaultQuery = {};

  async runQuery(_query: WorkspaceQuery): Promise<DataFrameDTO> {
    return { fields: this.workspacesToFields( await this.getWorkspaces()) };
  }

  shouldRunQuery(): boolean {
    return true;
  }

  async testDatasource(): Promise<TestingStatus> {
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
