import { DataSourceBase } from "core/DataSourceBase";
import { DataQueryRequest, DataFrameDTO, TestDataSourceResponse } from "@grafana/data";
import { ResultsQuery } from "./types/types";
import { MAX_TAKE_PER_REQUEST, QUERY_STEPS_REQUEST_PER_SECOND } from "./constants/QuerySteps.constants";

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

  async fetchInBatch<T>(
    fetchFunction: (
      filter?: string,
      orderBy?: string,
      projection?: any[],
      take?: number,
      continuationToken?: string,
      descending?: boolean,
      returnCount?: boolean
    ) => Promise<{ items: T[]; continuationToken?: string; totalCount?: number }>,
    filter?: string,
    orderBy?: string,
    projection?: any[],
    take?: number,
    descending?: boolean,
    returnCount = false,
    maxTakePerRequest = MAX_TAKE_PER_REQUEST,
    requestsPerSecond = QUERY_STEPS_REQUEST_PER_SECOND
  ): Promise<{ items: T[]; totalCount: number }> {
    let items: T[] = [];
    let continuationToken: string | undefined = undefined;
  
    if (take === undefined || take <= maxTakePerRequest) {
      const response = await fetchFunction(filter, orderBy, projection, take, continuationToken, descending, returnCount);
      return {
        items: response.items,
        totalCount: response.totalCount || response.items.length,
      };
    }
  
    let requestCount = Math.ceil(take / maxTakePerRequest);
    const batchCount = Math.ceil(requestCount / requestsPerSecond);
  
    for (let batch = 0; batch < batchCount; batch++) {
      for (let request = requestsPerSecond; request > 0 && requestCount > 0; request--, requestCount--) {
        if (items.length >= take) {
          break;
        }
  
        const currentTake = Math.min(maxTakePerRequest, take - items.length);
        const response = await fetchFunction(
          filter,
          orderBy,
          projection,
          currentTake,
          continuationToken,
          descending,
          returnCount
        );
  
        items = [...items, ...response.items];
        continuationToken = response.continuationToken;
  
        if (!continuationToken) {
          return {
            items,
            totalCount: response.totalCount || items.length,
          };
        }
      }
  
      if (batch < batchCount - 1) {
        await this.delay(1000);
      }
    }
  
    return {
      items,
      totalCount: items.length,
    };
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  testDatasource(): Promise<TestDataSourceResponse> {
    throw new Error("Method not implemented.");
  }
}
