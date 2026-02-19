import {
  DataFrameDTO,
  DataQueryRequest,
  DataSourceInstanceSettings,
  MetricFindValue,
  TestDataSourceResponse
} from '@grafana/data';
import { BackendSrv, TemplateSrv, getBackendSrv, getTemplateSrv } from '@grafana/runtime';
import { NetworkUtils } from './network-utils';
import { SystemQuery, SystemQueryType, SystemSummary, SystemVariableQuery, SystemQueryReturnType, SystemProperties, SystemDataSourceOptions, SystemFeatureTogglesDefaults, systemFields } from './types';
import { getWorkspaceName } from 'core/utils';
import { SystemsDataSourceBase } from './SystemsDataSourceBase';
import { transformComputedFieldsQuery } from 'core/query-builder.utils';
import { defaultOrderBy, defaultProjection, SystemBackendFieldNames } from './SystemsQueryBuilder.constants';
import { from, map, Observable, switchMap } from 'rxjs';
import { QuerySystemsResponse } from 'core/types';

export class SystemDataSource extends SystemsDataSourceBase {
  private dependenciesLoadedPromise?: Promise<void>;

  constructor(
    readonly instanceSettings: DataSourceInstanceSettings<SystemDataSourceOptions>,
    readonly backendSrv: BackendSrv = getBackendSrv(),
    readonly templateSrv: TemplateSrv = getTemplateSrv()
  ) {
    super(instanceSettings, backendSrv, templateSrv);
    if (this.isQueryBuilderActive()) {
      this.dependenciesLoadedPromise = this.loadDependencies();
    }
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

    if (this.isQueryBuilderActive() && (prepared.systemName || prepared.workspace) && prepared.queryKind === SystemQueryType.Properties) {
      prepared.filter = this.backwardCompatibility(prepared);
      prepared.systemName = '';
      prepared.workspace = '';
    }

    return prepared;
  }

  runQuery(query: SystemQuery, options: DataQueryRequest): Observable<DataFrameDTO> {
    if (this.isQueryBuilderActive() && this.dependenciesLoadedPromise) {
      return from(this.dependenciesLoadedPromise).pipe(
        switchMap(() => {
          if (query.queryKind === SystemQueryType.Summary) {
            return this.runSummaryQuery(query);
          } else {
            return this.runDataQueryWithFilter(query, options);
          }
        })
      );
    }

    if (query.queryKind === SystemQueryType.Summary) {
      return this.runSummaryQuery(query);
    } else {
      return from(this.runQueryLegacy(query, options));
    }
  }

  private async runQueryLegacy(query: SystemQuery, options: DataQueryRequest): Promise<DataFrameDTO> {
    const properties = await this.getSystemPropertiesLegacy(
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

  private async getSystemPropertiesLegacy(systemFilter: string, projection = defaultProjection, workspace?: string) {
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

  shouldRunQuery(query: SystemQuery): boolean {
    return !query.hide;
  }

  async testDatasource(): Promise<TestDataSourceResponse> {
    await this.get(this.baseUrl + '/get-systems-summary');
    return { status: 'success', message: 'Data source connected and authentication successful!' };
  }

  async metricFindQuery({ queryReturnType, workspace }: SystemVariableQuery): Promise<MetricFindValue[]> {
    if (this.isQueryBuilderActive() && this.dependenciesLoadedPromise) {
      await this.dependenciesLoadedPromise;

      let filter = '';
      if (workspace) {
        const resolvedWorkspace = this.templateSrv.replace(workspace);
        filter = `workspace = "${resolvedWorkspace}"`;
      }

      const properties = await this.getSystemProperties(filter, [SystemBackendFieldNames.ID, SystemBackendFieldNames.ALIAS, SystemBackendFieldNames.SCAN_CODE]);
      return properties.map(system => this.getSystemNameForMetricQuery({ queryReturnType }, system));
    }

    const properties = await this.getSystemPropertiesLegacy('', [systemFields.ID, systemFields.ALIAS, systemFields.SCAN_CODE], this.templateSrv.replace(workspace));
    return properties.map(system => this.getSystemNameForMetricQuery({ queryReturnType }, system));
  }

  private runSummaryQuery(query: SystemQuery): Observable<DataFrameDTO> {
    return this.get$<SystemSummary>(this.baseUrl + '/get-systems-summary').pipe(
      map(summary => ({
        refId: query.refId,
        fields: [
          { name: 'Connected', values: [summary.connectedCount] },
          { name: 'Disconnected', values: [summary.disconnectedCount] },
        ],
      }))
    );
  }

  private runDataQueryWithFilter(query: SystemQuery, options: DataQueryRequest): Observable<DataFrameDTO> {
    const processedFilter = query.filter ? this.processFilter(query.filter, options.scopedVars) : '';

    return this.post$<QuerySystemsResponse>(
      this.instanceSettings.url + '/nisysmgmt/v1/query-systems',
      {
        filter: processedFilter || '',
        projection: `new(${defaultProjection.join()})`,
        orderBy: defaultOrderBy,
      }
    ).pipe(
      map(response => {
        const properties = response.data;
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
      })
    );
  }

  private processFilter(filter: string, scopedVars: any): string {
    let tempFilter = this.templateSrv.replace(filter, scopedVars);
    return transformComputedFieldsQuery(tempFilter, this.systemsComputedDataFields);
  }

  async getSystemProperties(filter?: string, projection = defaultProjection): Promise<SystemProperties[]> {
    const response = await this.getSystems({
      filter: filter || '',
      projection: `new(${projection.join()})`,
      orderBy: defaultOrderBy,
    });
    return response.data;
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

  private backwardCompatibility(query: SystemQuery): string {
    const parts: string[] = [];

    if (query.filter?.trim()) {
      parts.push(query.filter);
    }

    if (query.systemName?.trim()) {
      const idPart = `id = "${query.systemName}"`;
      const aliasPart = `alias = "${query.systemName}"`;
      parts.push(`(${idPart} || ${aliasPart})`);
    }

    if (query.workspace?.trim() && !query.systemName) {
      const workspacePart = `workspace = "${query.workspace}"`;
      if (!query.filter?.includes('workspace =')) {
        parts.push(workspacePart);
      }
    }

    return parts.join(' && ');
  }

  isQueryBuilderActive(): boolean {
    return (
      this.instanceSettings.jsonData?.featureToggles?.systemQueryBuilder ??
      SystemFeatureTogglesDefaults.systemQueryBuilder ??
      false
    );
  }
}
