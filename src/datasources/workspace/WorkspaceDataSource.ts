import { DataFrame, DataQueryRequest, DataSourceInstanceSettings, toDataFrame } from '@grafana/data';
import { BackendSrv, TemplateSrv, TestingStatus, getBackendSrv, getTemplateSrv } from '@grafana/runtime';
import { DataSourceBase } from 'core/DataSourceBase';
import { Workspace } from 'core/types';
import { WorkspaceVariableSupport } from './variables';
import { WorkspaceQuery } from './types';

export class WorkspaceDataSource extends DataSourceBase<WorkspaceQuery> {
  constructor(
    readonly instanceSettings: DataSourceInstanceSettings,
    readonly backendSrv: BackendSrv = getBackendSrv(),
    readonly templateSrv: TemplateSrv = getTemplateSrv()
  ) {
    super(instanceSettings, backendSrv);

    this.variables = new WorkspaceVariableSupport();
  }

  baseUrl = this.instanceSettings.url + '/niuser/v1';

  defaultQuery = {};

  async runQuery(_query: WorkspaceQuery, { app }: DataQueryRequest): Promise<DataFrame> {
    return toDataFrame({ fields: this.workspaceToFields(app, await this.getWorkspaces()) });
  }

  shouldRunQuery(): boolean {
    return true;
  }

  async testDatasource(): Promise<TestingStatus> {
    await this.get(this.baseUrl + '/workspaces');
    return { status: 'success', message: 'Data source connected and authentication successful!' };
  }

  private workspaceToFields(app: string, workspaces: Workspace[]): Array<{ name: string, values: string[] }> {
    const ids: string[] = [];
    const names: string[] = [];
    const queryVariableEditor = app === 'dashboard';
    workspaces.forEach((workspace: Workspace) => {
      ids.push(workspace.id);
      names.push(workspace.name);
    });
    return [
      { name: queryVariableEditor ? 'value' : 'ID', values: ids },
      { name: queryVariableEditor ? 'text' : 'Name', values: names }
    ]
  }
}
