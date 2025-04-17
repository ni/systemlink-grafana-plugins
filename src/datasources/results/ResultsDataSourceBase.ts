import { DataSourceBase } from "core/DataSourceBase";
import { DataQueryRequest, DataFrameDTO, TestDataSourceResponse } from "@grafana/data";
import { ResultsQuery } from "./types/types";
import { BatchQueryConfig, BatchQueryResponse } from "./types/QuerySteps.types";

export abstract class ResultsDataSourceBase extends DataSourceBase<ResultsQuery> {
  baseUrl = this.instanceSettings.url + '/nitestmonitor';

  private timeRange: { [key: string]: string } = {
    Started: 'startedAt',
    Updated: 'updatedAt',
  };

  private fromDateString = '${__from:date}';
  private toDateString = '${__to:date}';

  abstract runQuery(query: ResultsQuery, options: DataQueryRequest): Promise<DataFrameDTO>;

  abstract shouldRunQuery(query: ResultsQuery): boolean;

  getTimeRangeFilter(options: DataQueryRequest, useTimeRange?: boolean, useTimeRangeFor?: string): string | undefined {
    if (!useTimeRange || useTimeRangeFor === undefined) {
      return undefined;
    }

    const timeRangeField = this.timeRange[useTimeRangeFor];
    const timeRangeFilter = `(${timeRangeField} > "${this.fromDateString}" && ${timeRangeField} < "${this.toDateString}")`;

    return this.templateSrv.replace(timeRangeFilter, options.scopedVars);
  }

  async queryInBatches<T>(
    queryRecord: (take: number, continuationToken?: string) => Promise<BatchQueryResponse<T>>,
    config: BatchQueryConfig,
    take?: number,
  ): Promise<BatchQueryResponse<T>> {
    let response: T[] = [];
    let continuationToken: string | undefined = undefined;

    if (take === undefined || take <= config.maxTakePerRequest) {
      return await queryRecord(take || config.maxTakePerRequest, continuationToken);
    }

    const requestCount = Math.ceil(take / config.maxTakePerRequest);
    const batchCount = Math.ceil(requestCount / config.requestsPerSecond);

    for (let batch = 0; batch < batchCount; batch++) {
      const requestsThisBatch = Math.min(
        config.requestsPerSecond, 
        Math.ceil((take - response.length) / config.maxTakePerRequest)
      );
      for (let request = 0; request < requestsThisBatch; request++) {
        if (response.length >= take) {
          break;
        }
        const currentTake = Math.min(config.maxTakePerRequest, take - response.length);

        const queryResponse: BatchQueryResponse<T> = await queryRecord(currentTake, continuationToken);

        response = [...response, ...queryResponse.results];
        continuationToken = queryResponse.continuationToken;

        if (!continuationToken) {
          return {
            results: response,
            totalCount: response.length,
          };
        }
      }

      if (batch < batchCount - 1) {
        await this.delay(1000);
      }
    }

    return {
      results: response,
      totalCount: response.length, 
    };
  }

  private async delay(timeout: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, timeout));
  }

  testDatasource(): Promise<TestDataSourceResponse> {
    throw new Error("Method not implemented.");
  }
}
