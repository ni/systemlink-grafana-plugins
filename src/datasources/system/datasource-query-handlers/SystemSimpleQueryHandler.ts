import { DataFrameDTO, DataQueryRequest, MetricFindValue } from '@grafana/data';
import { from, Observable } from 'rxjs';
import { SystemQuery, SystemQueryType, SystemProperties, SystemVariableQuery } from '../types';
import { defaultOrderBy, defaultProjection, systemFields } from '../SystemsQueryBuilder.constants';
import { SystemDataSourceContext, SystemQueryHandlerBase } from './SystemQueryHandlerBase';

/**
 * Handles simple (legacy) query execution without the query builder feature.
 * Uses the original query approach with systemName and workspace filters.
 */
export class SystemSimpleQueryHandler extends SystemQueryHandlerBase {
  constructor(dataSource: SystemDataSourceContext) {
    super(dataSource);
  }

  prepareQuery(query: SystemQuery): SystemQuery {
    return {
      ...this.defaultQuery,
      ...query,
    };
  }

  runQuery(query: SystemQuery, options: DataQueryRequest): Observable<DataFrameDTO> {
    if (query.queryKind === SystemQueryType.Summary) {
      return this.runSummaryQuery(query);
    }
    return from(this.runPropertiesQuery(query, options));
  }

  async metricFindQuery({ workspace, queryReturnType }: SystemVariableQuery): Promise<MetricFindValue[]> {
    const properties = await this.getSystemProperties(
      '',
      [systemFields.ID, systemFields.ALIAS, systemFields.SCAN_CODE],
      this.dataSource.templateSrv.replace(workspace)
    );
    return properties.map(system => this.getSystemNameForMetricQuery({ queryReturnType }, system));
  }

  private async runPropertiesQuery(query: SystemQuery, options: DataQueryRequest): Promise<DataFrameDTO> {
    const properties = await this.getSystemProperties(
      this.dataSource.templateSrv.replace(query.systemName, options.scopedVars),
      defaultProjection,
      this.dataSource.templateSrv.replace(query.workspace, options.scopedVars)
    );
    const workspaces = await this.dataSource.getWorkspaces();
    return this.buildPropertiesDataFrame(query.refId, properties, workspaces);
  }

  private async getSystemProperties(systemFilter: string, projection = defaultProjection, workspace?: string): Promise<SystemProperties[]> {
    const filters = [
      systemFilter && `id = "${systemFilter}" || alias = "${systemFilter}"`,
      workspace && !systemFilter && `workspace = "${workspace}"`,
    ];
    const response = await this.dataSource.getSystems({
      filter: filters.filter(Boolean).join(' '),
      projection: `new(${projection.join()})`,
      orderBy: defaultOrderBy,
    });
    return response.data;
  }
}
