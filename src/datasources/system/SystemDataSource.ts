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
import { catchError, forkJoin, map, Observable, throwError } from 'rxjs';

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

  runQuery(query: SystemQuery, options: DataQueryRequest): Observable<DataFrameDTO> {
    if (query.queryKind === SystemQueryType.Summary) {
      return this.get$<SystemSummary>(this.baseUrl + '/get-systems-summary').pipe(
        map(summary => ({
          refId: query.refId,
          fields: [
            { name: 'Connected', values: [summary.connectedCount] },
            { name: 'Disconnected', values: [summary.disconnectedCount] },
          ]
        }))
      );
    } else {
      const systemFilter = this.templateSrv.replace(query.systemName, options.scopedVars);
      const workspace = this.templateSrv.replace(query.workspace, options.scopedVars);

      return forkJoin({
        properties: this.getSystemProperties$(systemFilter, defaultProjection, workspace),
        workspaces: this.getWorkspaces$()
      }).pipe(
        map(({ properties, workspaces }) => ({
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
        }))
      );
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

  getSystemProperties$(systemFilter: string, projection = defaultProjection, workspace?: string): Observable<any[]> {
    const filters = [
      systemFilter && `id = "${systemFilter}" || alias = "${systemFilter}"`,
      workspace && !systemFilter && `workspace = "${workspace}"`,
    ];

    return this.post$<any>(
      this.instanceSettings.url + '/nisysmgmt/v1/query-systems',
      {
        filter: filters.filter(Boolean).join(' '),
        projection: `new(${projection.join()})`,
        orderBy: defaultOrderBy,
      }
    ).pipe(
      map(response => response.data),
      catchError(error => {
        console.error('Error querying systems:', error);
        return throwError(() => error);
      })
    );
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
