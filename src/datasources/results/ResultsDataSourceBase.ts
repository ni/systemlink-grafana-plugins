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
    queryConfig: BatchQueryConfig,
    take?: number,
    isTotalCountTypeEnabled?: boolean,
  ): Promise<BatchQueryResponse<T>> {
    if (take === undefined || take <= queryConfig.maxTakePerRequest || isTotalCountTypeEnabled) {
      return await queryRecord(take || queryConfig.maxTakePerRequest);
    }
  
    let queryResponse: T[] = [];
    let continuationToken: string | undefined;
    let totalCount: number | undefined;

    let initialQueryResponse = await queryRecord(Math.min(queryConfig.maxTakePerRequest, take));
    queryResponse.push(...initialQueryResponse.data);
    totalCount = initialQueryResponse.totalCount;
    continuationToken = initialQueryResponse.continuationToken;

    const executeRecordInBatch = async (): Promise<void> => {
      const remainingTake = totalCount !== undefined ? 
      Math.min(take - queryResponse.length, totalCount - queryResponse.length) : 
      take - queryResponse.length;
    
      if (remainingTake <= 0) {
        return;
      }

      const currentTake = Math.min(queryConfig.maxTakePerRequest, remainingTake);
      const currentBatchQueryResponse= await queryRecord(currentTake, continuationToken);
      
      queryResponse.push(...currentBatchQueryResponse.data);
      continuationToken = currentBatchQueryResponse.continuationToken; 
    };
  
    const executeBatch = async (requestsInBatch: number): Promise<void> => {
      for( let request = 0; request < requestsInBatch; request++ ){
        await executeRecordInBatch();
      }
    };
  
    while (queryResponse.length < take && continuationToken && (totalCount === undefined || queryResponse.length < totalCount)) {
      const remainingRequestCount = Math.ceil((take - queryResponse.length) / queryConfig.maxTakePerRequest);
      const requestsInBatch = Math.min(queryConfig.requestsPerSecond, remainingRequestCount);
      
      const startTime = Date.now();
      await executeBatch(requestsInBatch);
      const elapsedTime = Date.now() - startTime;

      if (queryResponse.length <= take && continuationToken && elapsedTime < 1000) {
        await this.delay(1000 - elapsedTime);
      }
    }
  
    return {
      data: queryResponse,
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
