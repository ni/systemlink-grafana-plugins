import { DataFrameDTO, DataQueryRequest, DataSourceInstanceSettings, LegacyMetricFindQueryOptions, MetricFindValue, TimeRange } from "@grafana/data";
import { BackendSrv, getBackendSrv, TemplateSrv, getTemplateSrv } from "@grafana/runtime";
import {
  Column,
  DataFrameDataQuery,
  DataFrameDataSourceOptions,
  DataFrameVariableQuery,
  DataTableProjections,
  TableDataRows,
  TableProperties,
  ValidDataFrameQuery,
  ValidDataFrameVariableQuery, DataFrameQuery,
  CombinedFilters,
  ColumnOptions
} from "./types";
import { DataFrameDataSourceBase } from "./DataFrameDataSourceBase";
import { DataFrameDataSourceV2 } from "./datasources/v2/DataFrameDataSourceV2";
import { Observable } from "rxjs";
import { DataQuery } from "@grafana/schema";
import _ from "lodash";

export class DataFrameDataSource extends DataFrameDataSourceBase {
  private datasource: DataFrameDataSourceBase;
  public variablesCache: Record<string, string> = {};

  constructor(
    public readonly instanceSettings: DataSourceInstanceSettings<DataFrameDataSourceOptions>,
    public readonly backendSrv: BackendSrv = getBackendSrv(),
    public readonly templateSrv: TemplateSrv = getTemplateSrv()
  ) {
    super(instanceSettings, backendSrv, templateSrv);

    const featureToggles = instanceSettings.jsonData?.featureToggles;

    this.datasource = new DataFrameDataSourceV2(
        instanceSettings,
        backendSrv,
        templateSrv,
        featureToggles
      );
  }

  public get defaultQuery(): Required<Omit<DataFrameQuery, keyof DataQuery>> {
    return this.datasource.defaultQuery;
  }

  public prepareQuery(query: DataFrameQuery): DataFrameQuery {
    return this.datasource.prepareQuery(query);
  }

  public runQuery(
    query: DataFrameDataQuery,
    options: DataQueryRequest<DataFrameDataQuery>
  ): Promise<DataFrameDTO> | Observable<DataFrameDTO> {
    const dashboardVariables = Object.fromEntries(
      this.templateSrv.getVariables()
        .map(variable => [
          variable.name,
          this.templateSrv.replace(`\$${variable.name}`)
      ])
    );

    if (!_.isEqual(this.variablesCache, dashboardVariables)) {
      this.variablesCache = dashboardVariables;
    }

    return this.datasource.runQuery(query, options);
  }

  public shouldRunQuery(query: ValidDataFrameQuery): boolean {
    return this.datasource.shouldRunQuery(query as any);
  }

  public metricFindQuery(
    query: DataFrameVariableQuery,
    options: LegacyMetricFindQueryOptions
  ): Promise<MetricFindValue[]> {
    if (!this.datasource.metricFindQuery) {
      return Promise.resolve([]);
    }

    return this.datasource.metricFindQuery(query, options);
  }

  public async getTableProperties(id?: string): Promise<TableProperties> {
    return this.datasource.getTableProperties(id);
  }

  public async getDecimatedTableData(
    query: DataFrameDataQuery,
    columns: Column[],
    timeRange: TimeRange,
    intervals?: number
  ): Promise<TableDataRows> {
    return this.datasource.getDecimatedTableData(query, columns, timeRange, intervals);
  }

  public queryTables$(
    filters: CombinedFilters,
    take?: number,
    projection?: DataTableProjections[]
  ): Observable<TableProperties[]> {
    return this.datasource.queryTables$(filters, take, projection);
  }

  public queryTables(
    query: string,
    take?: number,
    projection?: DataTableProjections[]
  ): Promise<TableProperties[]> {
    return this.datasource.queryTables(query, take, projection);
  }

  public processQuery(
    query: DataFrameDataQuery,
    queries: DataFrameDataQuery[] = []
  ): ValidDataFrameQuery {
    return this.datasource.processQuery(query, queries);
  }

  public processVariableQuery(query: DataFrameVariableQuery): ValidDataFrameVariableQuery {
    return this.datasource.processVariableQuery(query);
  }

  public async getColumnOptionsWithVariables(filters: CombinedFilters): Promise<ColumnOptions> {
    return this.datasource.getColumnOptionsWithVariables(filters);
  }

  public transformDataTableQuery(query: string) {
    return this.datasource.transformDataTableQuery(query);
  }

  public transformResultQuery(query: string): string {
    return this.datasource.transformResultQuery(query);
  }

  public transformColumnQuery(query: string): string {
    return this.datasource.transformColumnQuery(query);
  }

  public parseColumnIdentifier(
    columnIdentifier: string
  ): { columnName: string, transformedDataType: string } {
    return this.datasource.parseColumnIdentifier(columnIdentifier);
  }

  public hasRequiredFilters(query: ValidDataFrameQuery): boolean {
    return this.datasource.hasRequiredFilters(query);
  }
}
