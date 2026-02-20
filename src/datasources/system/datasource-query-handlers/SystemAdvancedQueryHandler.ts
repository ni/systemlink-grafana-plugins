import { DataFrameDTO, DataQueryRequest, MetricFindValue } from '@grafana/data';
import { from, map, Observable, switchMap } from 'rxjs';
import { transformComputedFieldsQuery } from 'core/query-builder.utils';
import { QuerySystemsResponse } from 'core/types';
import { SystemQuery, SystemQueryType, SystemProperties, SystemVariableQuery } from '../types';
import { defaultOrderBy, defaultProjection, SystemBackendFieldNames } from '../SystemsQueryBuilder.constants';
import { SystemDataSourceContext, SystemQueryHandlerBase } from './SystemQueryHandlerBase';

/**
 * Handles advanced query execution using the query builder feature.
 * Supports filter expressions and computed field transformations.
 */
export class SystemAdvancedQueryHandler extends SystemQueryHandlerBase {
  private dependenciesLoadedPromise: Promise<void>;

  constructor(dataSource: SystemDataSourceContext) {
    super(dataSource);
    this.dependenciesLoadedPromise = this.dataSource.loadDependencies();
  }

  prepareQuery(query: SystemQuery): SystemQuery {
    const prepared = {
      ...this.defaultQuery,
      ...query,
    };

    if ((prepared.systemName || prepared.workspace) && prepared.queryKind === SystemQueryType.Properties) {
      prepared.filter = this.buildBackwardCompatibilityFilter(prepared);
      prepared.systemName = '';
      prepared.workspace = '';
    }

    return prepared;
  }

  runQuery(query: SystemQuery, options: DataQueryRequest): Observable<DataFrameDTO> {
    return from(this.dependenciesLoadedPromise).pipe(
      switchMap(() => {
        if (query.queryKind === SystemQueryType.Summary) {
          return this.runSummaryQuery(query);
        }
        return this.runDataQueryWithFilter(query, options);
      })
    );
  }

  async metricFindQuery({ workspace, queryReturnType }: SystemVariableQuery): Promise<MetricFindValue[]> {
    await this.dependenciesLoadedPromise;

    let filter = '';
    if (workspace) {
      const resolvedWorkspace = this.dataSource.templateSrv.replace(workspace);
      filter = `workspace = "${resolvedWorkspace}"`;
    }

    const properties = await this.getSystemProperties(
      filter,
      [SystemBackendFieldNames.ID, SystemBackendFieldNames.ALIAS, SystemBackendFieldNames.SCAN_CODE]
    );
    return properties.map(system => this.getSystemNameForMetricQuery({ queryReturnType }, system));
  }

  private runDataQueryWithFilter(query: SystemQuery, options: DataQueryRequest): Observable<DataFrameDTO> {
    const processedFilter = query.filter ? this.processFilter(query.filter, options.scopedVars) : '';

    return this.dataSource.post$<QuerySystemsResponse>(
      this.dataSource.instanceSettingsUrl + '/nisysmgmt/v1/query-systems',
      {
        filter: processedFilter || '',
        projection: `new(${defaultProjection.join()})`,
        orderBy: defaultOrderBy,
      }
    ).pipe(
      map(response => {
        const properties = response.data;
        const workspaces = this.dataSource.getCachedWorkspaces();
        return this.buildPropertiesDataFrame(query.refId, properties, workspaces);
      })
    );
  }

  private processFilter(filter: string, scopedVars: any): string {
    let tempFilter = this.dataSource.templateSrv.replace(filter, scopedVars);
    return transformComputedFieldsQuery(tempFilter, this.dataSource.systemsComputedDataFields);
  }

  private async getSystemProperties(filter?: string, projection = defaultProjection): Promise<SystemProperties[]> {
    const response = await this.dataSource.getSystems({
      filter: filter || '',
      projection: `new(${projection.join()})`,
      orderBy: defaultOrderBy,
    });
    return response.data;
  }

  private buildBackwardCompatibilityFilter(query: SystemQuery): string {
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
}
