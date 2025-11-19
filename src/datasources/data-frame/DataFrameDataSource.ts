import { DataFrameDTO, DataQueryRequest, DataSourceInstanceSettings, LegacyMetricFindQueryOptions, MetricFindValue, TimeRange } from "@grafana/data";
import { BackendSrv, getBackendSrv, TemplateSrv, getTemplateSrv } from "@grafana/runtime";
import { Column, Option, DataFrameDataQuery, DataFrameDataSourceOptions, DataFrameFeatureTogglesDefaults, DataFrameVariableQuery, DataTableProjections, TableDataRows, TableProperties, ValidDataFrameQuery, ValidDataFrameVariableQuery } from "./types";
import { DataFrameDataSourceBase } from "./DataFrameDataSourceBase";
import { DataFrameDataSourceV1 } from "./datasources/v1/DataFrameDataSourceV1";
import { DataFrameDataSourceV2 } from "./datasources/v2/DataFrameDataSourceV2";
import { Observable } from "rxjs";
import { areRecordsIdentical } from "./utils";

export class DataFrameDataSource extends DataFrameDataSourceBase {
  private queryByTablePropertiesFeatureEnabled = false;
  private datasource: DataFrameDataSourceV1 | DataFrameDataSourceV2;
  public defaultQuery: ValidDataFrameQuery;
  public variablesCache: Record<string, string> = {};

  constructor(
    public readonly instanceSettings: DataSourceInstanceSettings<DataFrameDataSourceOptions>,
    public readonly backendSrv: BackendSrv = getBackendSrv(),
    public readonly templateSrv: TemplateSrv = getTemplateSrv()
  ) {
    super(instanceSettings, backendSrv, templateSrv);

    const featureToggles = instanceSettings.jsonData?.featureToggles;
    this.queryByTablePropertiesFeatureEnabled = featureToggles?.queryByDataTableProperties ?? DataFrameFeatureTogglesDefaults.queryByDataTableProperties;

    if (this.queryByTablePropertiesFeatureEnabled) {
      this.datasource = new DataFrameDataSourceV2(instanceSettings, backendSrv, templateSrv);
    } else {
      this.datasource = new DataFrameDataSourceV1(instanceSettings, backendSrv, templateSrv);
    }
    this.defaultQuery = { ...this.datasource.defaultQuery, refId: 'A' };
  }

  public runQuery(
    query: DataFrameDataQuery,
    options: DataQueryRequest<DataFrameDataQuery>
  ): Promise<DataFrameDTO> | Observable<DataFrameDTO> {
    const dashboardVariables = Object.fromEntries(
      this.templateSrv.getVariables().map(variable => [
      variable.name,
      (variable as any).current?.value ?? ''
      ])
    );

    if (!areRecordsIdentical(this.variablesCache, dashboardVariables)) {
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
    query: string,
    take?: number,
    projection?: DataTableProjections[]
  ): Observable<TableProperties[]> {
    return this.datasource.queryTables$(query, take, projection);
  }

  public queryTables(
    query: string,
    take?: number,
    projection?: DataTableProjections[]
  ): Promise<TableProperties[]> {
    return this.datasource.queryTables(query, take, projection);
  }

  public processQuery(query: DataFrameDataQuery): ValidDataFrameQuery {
    return this.datasource.processQuery(query);
  }

  public processVariableQuery(query: DataFrameVariableQuery): ValidDataFrameVariableQuery {
    return this.datasource.processVariableQuery(query);
  }

  public async getColumnOptions(filter: string): Promise<Option[]> {
    return this.datasource.getColumnOptions(filter);
  }
}
