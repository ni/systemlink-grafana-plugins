import {
  DataFrameDTO,
  DataQueryRequest,
  DataSourceInstanceSettings,
  MetricFindValue,
  TestDataSourceResponse
} from '@grafana/data';
import { BackendSrv, TemplateSrv, getBackendSrv, getTemplateSrv } from '@grafana/runtime';
import { defaultOrderBy, defaultProjection, systemFields } from './constants/constants';
import { NetworkUtils } from './network-utils';
import { SystemQuery, SystemQueryType, SystemSummary, SystemVariableQuery, SystemQueryReturnType, SystemProperties } from './types';
import { getWorkspaceName } from 'core/utils';
import { SystemsDataSourceBase } from './SystemsDataSourceBase';
import { transformComputedFieldsQuery } from 'core/query-builder.utils';
import { SystemFieldMapping } from './constants/SystemsQueryBuilder.constants';

export class SystemDataSource extends SystemsDataSourceBase {
  private dependenciesLoadedPromise: Promise<void>;

  constructor(
    readonly instanceSettings: DataSourceInstanceSettings,
    readonly backendSrv: BackendSrv = getBackendSrv(),
    readonly templateSrv: TemplateSrv = getTemplateSrv()
  ) {
    super(instanceSettings, backendSrv, templateSrv);
    this.dependenciesLoadedPromise = this.loadDependencies();
  }

  baseUrl = this.instanceSettings.url + '/nisysmgmt/v1';

  defaultQuery = {
    queryKind: SystemQueryType.Summary,
    systemName: '',
    workspace: ''
  };

  prepareQuery(query: SystemQuery): SystemQuery {
    const prepared = { ...query };

    if (!prepared.queryKind) {
      prepared.queryKind = this.defaultQuery.queryKind;
    }

    if ((prepared.systemName || prepared.workspace) && prepared.queryKind === SystemQueryType.Properties) {
      prepared.filter = this.backwardCompatibility(prepared);
      prepared.systemName = '';
      prepared.workspace = '';
    }

    return prepared;
  }

  private backwardCompatibility(query: SystemQuery): string {
    const parts: string[] = [];

    if (query.filter?.trim()) {
      parts.push(query.filter);
    }

    if (query.systemName?.trim()) {
      const systemPart = `(id = "${query.systemName}") `;
      parts.push(systemPart);
    }

    if (query.workspace?.trim() && !query.systemName) {
      const workspacePart = `workspace = "${query.workspace}"`;
      if (!query.filter?.includes('workspace =')) {
        parts.push(workspacePart);
      }
    }

    return parts.join(' && ');
  }

  async runQuery(query: SystemQuery, options: DataQueryRequest): Promise<DataFrameDTO> {
    await this.dependenciesLoadedPromise;

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
      let processedFilter = '';
      if (query.filter) {
        let tempFilter = this.templateSrv.replace(query.filter, options.scopedVars);
        tempFilter = this.mapUIFieldsToBackendFields(tempFilter);
        processedFilter = transformComputedFieldsQuery(
          tempFilter,
          this.systemsComputedDataFields
        );
      }
      const properties = await this.getSystemProperties(processedFilter, defaultProjection);
      const workspaces = this.getCachedWorkspaces();
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

  private mapUIFieldsToBackendFields(filter: string): string {
    let mappedFilter = filter;
    Object.entries(SystemFieldMapping).forEach(([uiField, backendField]) => {
      const regex = new RegExp(`\\b${uiField}\\b`, 'g');
      mappedFilter = mappedFilter.replace(regex, backendField);
    });

    return mappedFilter;
  }

  async getSystemProperties(filter?: string, projection = defaultProjection) {
    const response = await this.getSystems({
      filter: filter || '',
      projection: `new(${projection.join()})`,
      orderBy: defaultOrderBy,
    });
    return response.data;
  }

  async metricFindQuery({ queryReturnType, workspace }: SystemVariableQuery): Promise<MetricFindValue[]> {
    await this.dependenciesLoadedPromise;

    let filter = '';
    if (workspace) {
      const resolvedWorkspace = this.templateSrv.replace(workspace);
      filter = `workspace = "${resolvedWorkspace}"`;
    }

    const properties = await this.getSystemProperties(filter, [systemFields.ID, systemFields.ALIAS, systemFields.SCAN_CODE]);
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
