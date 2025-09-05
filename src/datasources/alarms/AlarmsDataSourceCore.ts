import { DataSourceBase } from "core/DataSourceBase";
import { DataQueryRequest, DataFrameDTO, TestDataSourceResponse } from "@grafana/data";
import { AlarmsQuery } from "./types/types";

export abstract class AlarmsDataSourceCore extends DataSourceBase<AlarmsQuery> {
  abstract runQuery(query: AlarmsQuery, options: DataQueryRequest): Promise<DataFrameDTO>;

  abstract shouldRunQuery(query: AlarmsQuery): boolean;

  testDatasource(): Promise<TestDataSourceResponse> {
    throw new Error("Method not implemented.");
  }
}
