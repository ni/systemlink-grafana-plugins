import { DataSourceBase } from "core/DataSourceBase";
import { ResultsQuery } from "../types";
import { DataQueryRequest, DataFrameDTO, TestDataSourceResponse } from "@grafana/data";

export abstract class ResultsDataSourceBase extends DataSourceBase<ResultsQuery> {
  baseUrl = this.instanceSettings.url + '/nitestmonitor';

  abstract runQuery(query: ResultsQuery, options: DataQueryRequest): Promise<DataFrameDTO>;

  shouldRunQuery(_: ResultsQuery): boolean {
    return true;
  }

  async testDatasource(): Promise<TestDataSourceResponse> {
    await this.get(this.baseUrl + '/v2/results?take=1');
    return { status: 'success', message: 'Data source connected and authentication successful!' };
  }
}
