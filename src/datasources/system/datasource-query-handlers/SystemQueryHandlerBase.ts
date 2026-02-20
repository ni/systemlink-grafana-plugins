import { DataFrameDTO, MetricFindValue } from '@grafana/data';
import { TemplateSrv } from '@grafana/runtime';
import { map, Observable } from 'rxjs';
import { getWorkspaceName } from 'core/utils';
import { ExpressionTransformFunction } from 'core/query-builder.utils';
import { QuerySystemsRequest, QuerySystemsResponse, Workspace } from 'core/types';
import { NetworkUtils } from '../network-utils';
import { SystemQuery, SystemQueryType, SystemProperties, SystemQueryReturnType, SystemSummary } from '../types';

/**
 * Interface defining the data source context required by query handlers.
 */
export interface SystemDataSourceContext {
  readonly baseUrl: string;
  readonly templateSrv: TemplateSrv;
  readonly instanceSettingsUrl: string;
  getSystems(body: QuerySystemsRequest): Promise<QuerySystemsResponse>;
  getWorkspaces(): Promise<Workspace[]>;
  getCachedWorkspaces(): Workspace[];
  loadDependencies(): Promise<void>;
  get$<T>(url: string): Observable<T>;
  post$<T>(url: string, body: Record<string, any>): Observable<T>;
  readonly systemsComputedDataFields: Map<string, ExpressionTransformFunction>;
}

/**
 * Base class containing common functionality for system query handlers.
 * Provides shared implementations for building data frames and metric queries.
 */
export abstract class SystemQueryHandlerBase {
  protected readonly defaultQuery: Partial<SystemQuery> = {
    queryKind: SystemQueryType.Summary,
    systemName: '',
    workspace: ''
  };

  constructor(protected readonly dataSource: SystemDataSourceContext) {}

  abstract prepareQuery(query: SystemQuery): SystemQuery;
  abstract runQuery(query: SystemQuery, options: any): Observable<DataFrameDTO>;
  abstract metricFindQuery(query: any): Promise<MetricFindValue[]>;

  protected runSummaryQuery(query: SystemQuery): Observable<DataFrameDTO> {
    return this.dataSource.get$<SystemSummary>(this.dataSource.baseUrl + '/get-systems-summary').pipe(
      map(summary => ({
        refId: query.refId,
        fields: [
          { name: 'Connected', values: [summary.connectedCount] },
          { name: 'Disconnected', values: [summary.disconnectedCount] },
        ],
      }))
    );
  }

  protected buildPropertiesDataFrame(refId: string, properties: SystemProperties[], workspaces: Workspace[]): DataFrameDTO {
    return {
      refId,
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

  protected getSystemNameForMetricQuery(
    query: { queryReturnType?: SystemQueryReturnType },
    system: SystemProperties
  ): MetricFindValue {
    const displayName = system.alias ?? system.id;
    let systemValue: string;

    if (query.queryReturnType === SystemQueryReturnType.ScanCode) {
      systemValue = system.scanCode!;
    } else {
      systemValue = system.id;
    }

    return { text: displayName, value: systemValue };
  }
}
