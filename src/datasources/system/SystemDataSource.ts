import { DataFrameDTO, DataQueryRequest, DataSourceInstanceSettings, MetricFindValue } from '@grafana/data';
import { BackendSrv, TemplateSrv, TestingStatus, getBackendSrv, getTemplateSrv } from '@grafana/runtime';
import { DataSourceBase } from 'core/DataSourceBase';
import { defaultOrderBy, defaultProjection } from './constants';
import { NetworkUtils } from './network-utils';
import { SystemMetadata, SystemQuery, SystemQueryType, SystemSummary, SystemVariableQuery } from './types';
import { getWorkspaceName } from 'core/utils';

export class SystemDataSource extends DataSourceBase<SystemQuery> {
  constructor(
    readonly instanceSettings: DataSourceInstanceSettings,
    readonly backendSrv: BackendSrv = getBackendSrv(),
    readonly templateSrv: TemplateSrv = getTemplateSrv()
  ) {
    super(instanceSettings, backendSrv, templateSrv);
  }

  baseUrl = this.instanceSettings.url + '/nisysmgmt/v1';

  defaultQuery = {
    queryKind: SystemQueryType.Summary,
    systemName: '',
    workspace: ''
  };

  async runQuery(query: SystemQuery, options: DataQueryRequest): Promise<DataFrameDTO> {
    if (query.queryKind === SystemQueryType.Summary) {
      const summary = await this.get<SystemSummary>(this.baseUrl + '/get-systems-summary');
      return {
        refId: query.refId,
        fields: [
          { name: 'Connected', values: [summary.connectedCount] },
          { name: 'Disconnected', values: [summary.disconnectedCount] },
        ],
      };
    } else {
      const metadata = await this.getSystemMetadata(
        this.templateSrv.replace(query.systemName, options.scopedVars),
        defaultProjection,
        this.templateSrv.replace(query.workspace, options.scopedVars)
      );
      const workspaces = await this.getWorkspaces();
      return {
        refId: query.refId,
        fields: [
          { name: 'id', values: metadata.map(m => m.id) },
          { name: 'alias', values: metadata.map(m => m.alias) },
          { name: 'connection status', values: metadata.map(m => m.state) },
          { name: 'locked status', values: metadata.map(m => m.locked) },
          { name: 'system start time', values: metadata.map(m => m.systemStartTime) },
          { name: 'model', values: metadata.map(m => m.model) },
          { name: 'vendor', values: metadata.map(m => m.vendor) },
          { name: 'operating system', values: metadata.map(m => m.osFullName) },
          {
            name: 'ip address',
            values: metadata.map(m => NetworkUtils.getIpAddressFromInterfaces(m.ip4Interfaces, m.ip6Interfaces)),
          },
          { name: 'workspace', values: metadata.map(m => getWorkspaceName(workspaces, m.workspace)) },
        ],
      };
    }
  }

  async getSystemMetadata(systemFilter: string, projection = defaultProjection, workspace?: string) {
    const filters = [
      systemFilter && `id = "${systemFilter}" || alias = "${systemFilter}"`,
      workspace && `workspace = "${workspace}"`,
    ];
    const response = await this.post<{ data: SystemMetadata[] }>(this.baseUrl + '/query-systems', {
      filter: filters.filter(Boolean).join(' '),
      projection: `new(${projection.join()})`,
      orderBy: defaultOrderBy,
    });
    return response.data;
  }

  async metricFindQuery({ workspace }: SystemVariableQuery): Promise<MetricFindValue[]> {
    const metadata = await this.getSystemMetadata('', ['id', 'alias'], workspace);
    return metadata.map(frame => ({ text: frame.alias, value: frame.id }));
  }

  shouldRunQuery(_: SystemQuery): boolean {
    return true;
  }

  async testDatasource(): Promise<TestingStatus> {
    await this.get(this.baseUrl + '/get-systems-summary');
    return { status: 'success', message: 'Data source connected and authentication successful!' };
  }
}
