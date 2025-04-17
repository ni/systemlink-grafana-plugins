import { DataSourceBase } from "core/DataSourceBase";
import { DataQueryRequest, DataFrameDTO, TestDataSourceResponse } from "@grafana/data";
import { ResultsQuery } from "./types/types";
import { BatchFetchConfig, BatchQueryResponse } from "./types/QuerySteps.types";

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

  async fetchInBatches<T>(
    fetchRecord: (take: number, continuationToken?: string) => Promise<BatchQueryResponse<T>>,
    config: BatchFetchConfig,
    take?: number,
  ): Promise<BatchQueryResponse<T>> {
    let responseItems: T[] = [];
    let continuationToken: string | undefined = undefined;

    if (take === undefined || take <= config.maxTakePerRequest) {
      return await fetchRecord(take || config.maxTakePerRequest, continuationToken);
    }

    const requestCount = Math.ceil(take / config.maxTakePerRequest);
    const batchCount = Math.ceil(requestCount / config.requestsPerSecond);

    for (let batch = 0; batch < batchCount; batch++) {
      const requestsThisBatch = Math.min(
        config.requestsPerSecond, 
        Math.ceil((take - responseItems.length) / config.maxTakePerRequest)
      );

      for (let request = 0; request < requestsThisBatch; request++) {
        if (responseItems.length >= take) {
          break;
        }

        const currentTake = Math.min(config.maxTakePerRequest, take - responseItems.length);

        const response: BatchQueryResponse<T> = await fetchRecord(currentTake, continuationToken);

        responseItems = [...responseItems, ...response.items];
        continuationToken = response.continuationToken;

        if (!continuationToken) {
          return {
            items: responseItems,
            totalCount: responseItems.length,
          };
        }
      }

      if (batch < batchCount - 1) {
        await this.delay(1000);
      }
    }

    return {
      items: responseItems,
      totalCount: responseItems.length,
    };
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  testDatasource(): Promise<TestDataSourceResponse> {
    throw new Error("Method not implemented.");
  }
}
