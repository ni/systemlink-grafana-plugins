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
    isTotalCountTypeEnabled?: boolean,
  ): Promise<BatchQueryResponse<T>> {
    if (take === undefined || take <= config.maxTakePerRequest || isTotalCountTypeEnabled) {
      return await queryRecord(take || config.maxTakePerRequest);
    }
  
    let response: T[] = [];
    let continuationToken: string | undefined;
    let totalCount: number | undefined;

    let initialQueryResponse = await queryRecord(Math.min(config.maxTakePerRequest, take));
    response.push(...initialQueryResponse.data);
    totalCount = initialQueryResponse.totalCount;
    continuationToken = initialQueryResponse.continuationToken;

    const executeRecordInBatch = async (): Promise<void> => {
      const remainingTake = totalCount !== undefined ? 
      Math.min(take - response.length, totalCount - response.length) : 
      take - response.length;
    
      if (remainingTake <= 0) {
        return;
      }

      const currentTake = Math.min(config.maxTakePerRequest, remainingTake);
      const queryResponse = await queryRecord(currentTake, continuationToken);
      
      response.push(...queryResponse.data);
      continuationToken = queryResponse.continuationToken; 
    };
  
    const executeBatch = async (requestsInBatch: number): Promise<void> => {
      for( let request = 0; request < requestsInBatch; request++ ){
        await executeRecordInBatch();
      }
    };
  
    while (response.length < take && continuationToken && (totalCount === undefined || response.length < totalCount)) {
      const remainingRequestCount = Math.ceil((take - response.length) / config.maxTakePerRequest);
      const requestsInBatch = Math.min(config.requestsPerSecond, remainingRequestCount);
      
      const startTime = Date.now();
      await executeBatch(requestsInBatch);
      const elapsedTime = Date.now() - startTime;

      if (response.length <= take && continuationToken && elapsedTime < 1000) {
        await this.delay(1000 - elapsedTime);
      }
    }
  
    return {
      data: response,
      totalCount,
    };
  }

  private async delay(timeout: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, timeout));
  }

  testDatasource(): Promise<TestDataSourceResponse> {
    throw new Error("Method not implemented.");
  }
}
