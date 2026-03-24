import { DataFrameDTO, DataQueryRequest, DataSourceInstanceSettings, LegacyMetricFindQueryOptions, MetricFindValue } from "@grafana/data";
import { BackendSrv, getBackendSrv, TemplateSrv, getTemplateSrv } from "@grafana/runtime";
import {
  DataFrameDataQuery,
  DataFrameDataSourceOptions,
  DataFrameVariableQuery,
  DataTableProjections,
  TableProperties,
  ValidDataFrameQuery,
  ValidDataFrameVariableQuery, DataFrameQuery,
  CombinedFilters,
  ColumnOptions,
  CustomPropertyOptions
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

    this.datasource = new DataFrameDataSourceV2(
        instanceSettings,
        backendSrv,
        templateSrv
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

  public queryTables$(
    filters: CombinedFilters,
    take?: number,
    projection?: DataTableProjections[]
  ): Observable<TableProperties[]> {
    return this.datasource.queryTables$(filters, take, projection);
  }

  public processQuery(
    query: DataFrameDataQuery,
  ): ValidDataFrameQuery {
    return this.datasource.processQuery(query);
  }

  public processVariableQuery(query: DataFrameVariableQuery): ValidDataFrameVariableQuery {
    return this.datasource.processVariableQuery(query);
  }

  public async getColumnOptionsWithVariables(filters: CombinedFilters): Promise<ColumnOptions> {
    return this.datasource.getColumnOptionsWithVariables(filters);
  }

  public async getCustomPropertyOptions(
    filters: CombinedFilters,
    take: number
  ): Promise<CustomPropertyOptions> {
    return this.datasource.getCustomPropertyOptions(filters, take);
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
