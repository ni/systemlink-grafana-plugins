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
    if (take === undefined || take <= config.maxTakePerRequest) {
      return await queryRecord(take || config.maxTakePerRequest);
    }
  
    let results: T[] = [];
    let continuationToken: string | undefined;

    let initialResponse = await queryRecord(Math.min(config.maxTakePerRequest, take));
    results.push(...initialResponse.data);
    continuationToken = initialResponse.continuationToken;
  
    const processBatch = async (): Promise<void> => {
      const currentTake = Math.min(config.maxTakePerRequest, take - results.length);
      const queryResponse = await queryRecord(currentTake, continuationToken);
      
      results.push(...queryResponse.data);
      continuationToken = queryResponse.continuationToken; 
      console.log('con', continuationToken);
    };
  
    const executeRequestBatch = async (requestsInBatch: number): Promise<void> => {
      // const batchPromises = Array.from(
      //   { length: requestsInBatch }, 
      //   async () => await processBatch()
      // );

      // console.log('batchPromises', batchPromises);
      
      // await Promise.all(batchPromises);
      for( let i = 0; i<requestsInBatch; i++){
        await processBatch();
      }
    };
  
    while (results.length < take && continuationToken) {
      const remainingRequests = Math.ceil((take - results.length) / config.maxTakePerRequest);
      const requestsInBatch = Math.min(config.requestsPerSecond, remainingRequests);
      
      const startTime = Date.now();
      await executeRequestBatch(requestsInBatch);
      const elapsedTime = Date.now() - startTime;
      
      if (results.length < take && continuationToken && elapsedTime < 1000) {
        await this.delay(1000 - elapsedTime);
      }
    }
  
    return {
      data: results,
      totalCount: results.length,
    };
  }

  private async delay(timeout: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, timeout));
  }

  testDatasource(): Promise<TestDataSourceResponse> {
    throw new Error("Method not implemented.");
  }
}
