import { DataFrameDTO, DataQueryRequest, TestDataSourceResponse } from "@grafana/data";
import { AssetDataSourceOptions, AssetQuery } from "../../types/types";
import { DataSourceBase } from "../../../../core/DataSourceBase";

export abstract class AssetDataSourceBase extends DataSourceBase<AssetQuery, AssetDataSourceOptions> {

  abstract runQuery(query: AssetQuery, options: DataQueryRequest): Promise<DataFrameDTO>;

  abstract shouldRunQuery(query: AssetQuery): boolean;

  testDatasource(): Promise<TestDataSourceResponse> {
    throw new Error("Method not implemented.");
  }
}
