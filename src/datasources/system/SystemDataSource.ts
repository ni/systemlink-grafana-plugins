import {
  DataFrameDTO,
  DataQueryRequest,
  DataSourceInstanceSettings,
  DataSourceJsonData,
  MetricFindValue,
  TestDataSourceResponse
} from '@grafana/data';
import { BackendSrv, TemplateSrv, getBackendSrv, getTemplateSrv } from '@grafana/runtime';
import { DataSourceBase } from 'core/DataSourceBase';
import { defaultOrderBy, defaultProjection, systemFields } from './constants';
import { NetworkUtils } from './network-utils';
import { SystemQuery, SystemQueryType, SystemSummary, SystemVariableQuery, SystemQueryReturnType, SystemProperties } from './types';
import { getWorkspaceName } from 'core/utils';

export class SystemDataSource extends DataSourceBase<SystemQuery, DataSourceJsonData> {
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
      const properties = await this.getSystemProperties(
        this.templateSrv.replace(query.systemName, options.scopedVars),
        defaultProjection,
        this.templateSrv.replace(query.workspace, options.scopedVars)
      );
      const workspaces = await this.getWorkspaces();
      return {
        refId: query.refId,
        fields: [
          { name: 'id', values: properties.map(m => m.id) },
          { name: 'alias', values: properties.map(m => m.alias) },
          { name: 'connection status', values: properties.map(m => m.state) },
          { name: 'locked status', values: properties.map(m => m.locked) },
          { name: 'system start time', values: properties.map(m => m.systemStartTime) },
          { name: 'model', values: properties.map(m => m.model) },
          { name: 'vendor', values: properties.map(m => m.vendor) },
          { name: 'operating system', values: properties.map(m => m.osFullName) },
          {
            name: 'ip address',
            values: properties.map(m => NetworkUtils.getIpAddressFromInterfaces(m.ip4Interfaces, m.ip6Interfaces)),
          },
          { name: 'workspace', values: properties.map(m => getWorkspaceName(workspaces, m.workspace)) },
          { name: 'scan code', values: properties.map(m => m.scanCode) }
        ],
      };
    }
  }

  async getSystemProperties(systemFilter: string, projection = defaultProjection, workspace?: string) {
    const filters = [
      systemFilter && `id = "${systemFilter}" || alias = "${systemFilter}"`,
      workspace && !systemFilter && `workspace = "${workspace}"`,
    ];
    const response = await this.getSystems({
      filter: filters.filter(Boolean).join(' '),
      projection: `new(${projection.join()})`,
      orderBy: defaultOrderBy,
    });
    return response.data;
  }

  async metricFindQuery({ workspace, queryReturnType }: SystemVariableQuery): Promise<MetricFindValue[]> {
    const properties = await this.getSystemProperties('', [systemFields.ID, systemFields.ALIAS, systemFields.SCAN_CODE], this.templateSrv.replace(workspace));
    return properties.map(system => this.getSystemNameForMetricQuery({ queryReturnType }, system));
  }

  private getSystemNameForMetricQuery(query: { queryReturnType?: SystemQueryReturnType }, system: SystemProperties): MetricFindValue {
    const displayName = system.alias ?? system.id;
    let systemValue: string;

    if (query.queryReturnType === SystemQueryReturnType.ScanCode) {
      systemValue = system.scanCode!;
    } else {
      systemValue = system.id;
    }

    return { text: displayName, value: systemValue };
  }

  shouldRunQuery(query: SystemQuery): boolean {
    return !query.hide;
  }

  async testDatasource(): Promise<TestDataSourceResponse> {
    await this.get(this.baseUrl + '/get-systems-summary');
    return { status: 'success', message: 'Data source connected and authentication successful!' };
  }
}
