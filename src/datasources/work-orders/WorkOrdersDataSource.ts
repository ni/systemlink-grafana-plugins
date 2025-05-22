import { DataFrameDTO, DataQueryRequest, DataSourceInstanceSettings, TestDataSourceResponse } from '@grafana/data';
import { BackendSrv, TemplateSrv, getBackendSrv, getTemplateSrv } from '@grafana/runtime';
import { DataSourceBase } from 'core/DataSourceBase';
import { OutputType, WorkOrdersQuery } from './types';
import { Workspace } from 'core/types';

export class WorkOrdersDataSource extends DataSourceBase<WorkOrdersQuery> {
  constructor(
    readonly instanceSettings: DataSourceInstanceSettings,
    readonly backendSrv: BackendSrv = getBackendSrv(),
    readonly templateSrv: TemplateSrv = getTemplateSrv()
  ) {
    super(instanceSettings, backendSrv, templateSrv);
    this.loadWorkspaces();
  }

  baseUrl = `${this.instanceSettings.url}/niworkorder/v1`;
  queryWorkOrdersUrl = `${this.baseUrl}/query-workorders`;

  defaultQuery = {
    outputType: OutputType.Properties
  };

  readonly workspacesCache = new Map<string, Workspace>([]);
  workspacesPromise: Promise<Map<string, Workspace>> | null = null;

  async runQuery(query: WorkOrdersQuery, options: DataQueryRequest): Promise<DataFrameDTO> {
    return {
      refId: query.refId,
      fields: [],
    };
  }

  shouldRunQuery(query: WorkOrdersQuery): boolean {
    return true;
  }

  async loadWorkspaces(): Promise<Map<string, Workspace>> {
    if (this.workspacesCache.size > 0) {
      return this.workspacesCache;
    }

    if (this.workspacesPromise) {
      return this.workspacesPromise;
    }

    this.workspacesPromise = this.getWorkspaces().then(workspaces => {
      if (workspaces) {
        workspaces.forEach(workspace => this.workspacesCache.set(workspace.id, workspace));
      }
      return this.workspacesCache;
    });

    return this.workspacesPromise;
  }

  async testDatasource(): Promise<TestDataSourceResponse> {
    await this.post(this.queryWorkOrdersUrl, { take: 1 });
    return { status: 'success', message: 'Data source connected and authentication successful!' };
  }
}
