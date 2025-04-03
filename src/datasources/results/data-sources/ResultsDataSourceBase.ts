import { DataSourceBase } from "core/DataSourceBase";
import { ResultsQuery } from "../types";
import { DataQueryRequest, DataFrameDTO, TestDataSourceResponse } from "@grafana/data";

export abstract class ResultsDataSourceBase extends DataSourceBase<ResultsQuery> {
  baseUrl = this.instanceSettings.url + '/nitestmonitor';

  abstract runQuery(query: ResultsQuery, options: DataQueryRequest): Promise<DataFrameDTO>;

  testDatasource(): Promise<TestDataSourceResponse> {
    throw new Error("Method not implemented.");
  }
  
  shouldRunQuery(_: ResultsQuery): boolean {
    return true;
  }
}
