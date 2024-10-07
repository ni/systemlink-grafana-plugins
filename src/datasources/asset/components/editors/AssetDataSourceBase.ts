import { DataFrameDTO, DataQueryRequest, TestDataSourceResponse } from "@grafana/data";
import { AssetQuery } from "../../types/types";
import { DataSourceBase } from "../../../../core/DataSourceBase";

export abstract class AssetDataSourceBase extends DataSourceBase<AssetQuery> {

  abstract runQuery(query: AssetQuery, options: DataQueryRequest): Promise<DataFrameDTO>;

  abstract shouldRunQuery(query: AssetQuery): boolean;

  testDatasource(): Promise<TestDataSourceResponse> {
    throw new Error("Method not implemented.");
  }
}
