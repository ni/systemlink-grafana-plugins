import { DataFrameDTO, DataQueryRequest, DataSourceInstanceSettings, MetricFindValue, TimeRange } from "@grafana/data";
import { BackendSrv, getBackendSrv, TemplateSrv, getTemplateSrv } from "@grafana/runtime";
import { Column, DataFrameDataSourceOptions, DataFrameFeatureTogglesDefaults, DataFrameQuery, DataTableProjections, TableDataRows, TableProperties, ValidDataFrameQuery } from "./types";
import { DataFrameDataSourceBase } from "./DataFrameDataSourceBase";
import { DataFrameDataSourceV1 } from "./datasources/v1/DataFrameDataSourceV1";
import { DataFrameDataSourceV2 } from "./datasources/v2/DataFrameDataSourceV2";
import { ComboboxOption } from "@grafana/ui";

export class DataFrameDataSource extends DataFrameDataSourceBase {
  private queryByTablePropertiesFeatureEnabled = false;
  private datasource: DataFrameDataSourceV1 | DataFrameDataSourceV2;
  public defaultQuery: ValidDataFrameQuery;

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

  public async runQuery(query: DataFrameQuery, options: DataQueryRequest<DataFrameQuery>): Promise<DataFrameDTO> {
    return this.datasource.runQuery(query, options);
  }

  public shouldRunQuery(query: ValidDataFrameQuery): boolean {
    return this.datasource.shouldRunQuery(query as any);
  }

  public metricFindQuery(query: DataFrameQuery): Promise<MetricFindValue[]> {
    return this.datasource.metricFindQuery(query);
  }

  public async getTableProperties(id?: string): Promise<TableProperties> {
    return this.datasource.getTableProperties(id);
  }

  public async getDecimatedTableData(
    query: DataFrameQuery,
    columns: Column[],
    timeRange: TimeRange,
    intervals?: number
  ): Promise<TableDataRows> {
    return this.datasource.getDecimatedTableData(query, columns, timeRange, intervals);
  }

  public async queryTables(query: string, take?: number, projection?: DataTableProjections[]): Promise<TableProperties[]> {
    return this.datasource.queryTables(query, take, projection);
  }

  public processQuery(query: DataFrameQuery): ValidDataFrameQuery {
    return this.datasource.processQuery(query);
  }

  public async loadColumnOption(filter: string): Promise<ComboboxOption[]> {
    return this.datasource.loadColumnOption(filter);
  }
}
