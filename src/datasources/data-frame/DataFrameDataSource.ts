import { DataFrameDTO, DataQueryRequest, DataSourceInstanceSettings, MetricFindValue, TimeRange } from "@grafana/data";
import { BackendSrv, getBackendSrv, TemplateSrv, getTemplateSrv } from "@grafana/runtime";
import { Column, DataFrameDataSourceOptions, DataFrameQuery, defaultQueryV1, TableDataRows, TableProperties, ValidDataFrameQuery } from "./types";
import { DataFrameDatasourceBase } from "./DataFrameDataSourceBase";
import { DataFrameDataSourceV1 } from "./datasources/v1-datasource/DataFrameDataSourceV1";
import { DataFrameDataSourceV2 } from "./datasources/v2-datasource/DataFrameDataSourceV2";

export class DataFrameDataSource extends DataFrameDatasourceBase {
  private queryByTablePropertiesFeatureEnabled = false;
  private datasource: DataFrameDataSourceV1 | DataFrameDataSourceV2;

  constructor(
    readonly instanceSettings: DataSourceInstanceSettings<DataFrameDataSourceOptions>,
    readonly backendSrv: BackendSrv = getBackendSrv(),
    readonly templateSrv: TemplateSrv = getTemplateSrv()
  ) {
    super(instanceSettings, backendSrv, templateSrv);
    this.queryByTablePropertiesFeatureEnabled = instanceSettings.jsonData?.featureToggles?.queryByDataTableProperties ?? false;
    if (this.queryByTablePropertiesFeatureEnabled) {
      this.datasource = new DataFrameDataSourceV2(instanceSettings, backendSrv, templateSrv);
    } else {
      this.datasource = new DataFrameDataSourceV1(instanceSettings, backendSrv, templateSrv);
    }
  }

  defaultQuery = defaultQueryV1;

  async runQuery(query: DataFrameQuery, options: DataQueryRequest<DataFrameQuery>): Promise<DataFrameDTO> {
    return this.datasource.runQuery(query, options);
  }

  shouldRunQuery(query: ValidDataFrameQuery): boolean {
    return this.datasource.shouldRunQuery(query as any);
  }

  metricFindQuery(query: DataFrameQuery): Promise<MetricFindValue[]> {
    return this.datasource.metricFindQuery(query);
  }

  async getTableProperties(id?: string): Promise<TableProperties> {
    return this.datasource.getTableProperties(id);
  }

  async getDecimatedTableData(
    query: DataFrameQuery,
    columns: Column[],
    timeRange: TimeRange,
    intervals?: number
  ): Promise<TableDataRows> {
    return this.datasource.getDecimatedTableData(query, columns, timeRange, intervals);
  }

  async queryTables(query: string): Promise<TableProperties[]> {
    return this.datasource.queryTables(query);
  }

  processQuery(query: DataFrameQuery): ValidDataFrameQuery {
    return this.datasource.processQuery(query);
  }

}
