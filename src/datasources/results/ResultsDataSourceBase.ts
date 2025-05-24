import { DataSourceBase } from "core/DataSourceBase";
import { DataQueryRequest, DataFrameDTO, TestDataSourceResponse } from "@grafana/data";
import { ResultsQuery } from "./types/types";
import { BatchQueryConfig, QueryResponse } from "./types/QuerySteps.types";
import { QueryBuilderOption, Workspace } from "core/types";
import { ResultsPropertiesOptions } from "./types/QueryResults.types";
import { getVariableOptions } from "core/utils";
import { ExpressionTransformFunction } from "core/query-builder.utils";
import { QueryBuilderOperations } from "core/query-builder.constants";

export abstract class ResultsDataSourceBase extends DataSourceBase<ResultsQuery> {
  baseUrl = this.instanceSettings.url + '/nitestmonitor';
  queryResultsValuesUrl = this.baseUrl + '/v2/query-result-values';

  private timeRange: { [key: string]: string } = {
    Started: 'startedAt',
    Updated: 'updatedAt',
  };

  private fromDateString = '${__from:date}';
  private toDateString = '${__to:date}';

  readonly globalVariableOptions = (): QueryBuilderOption[] => getVariableOptions(this);

  static workspacesPromise: Promise<Map<string, Workspace> | void> | null = null;
  static partNumbersPromise: Promise<string[] | void> | null = null;

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
    queryRecord: (take: number, continuationToken?: string) => Promise<QueryResponse<T>>,
    queryConfig: BatchQueryConfig,
    take?: number,
  ): Promise<QueryResponse<T>> {
    if (take === undefined || take <= queryConfig.maxTakePerRequest) {
      return await queryRecord(take || queryConfig.maxTakePerRequest);
    }
  
    let queryResponse: T[] = [];
    let continuationToken: string | undefined;
    let totalCount: number | undefined;

    const getRecords = async (currentRecordCount: number): Promise<void> => { 
      const response = await queryRecord(currentRecordCount, continuationToken); 
      queryResponse.push(...response.data); 
      continuationToken = response.continuationToken; 
      totalCount = response.totalCount ?? totalCount; 
    };

    const queryRecordsInCurrentBatch = async (): Promise<void> => {
      const remainingRecordsToGet = totalCount !== undefined ? 
      Math.min(take - queryResponse.length, totalCount - queryResponse.length) : 
      take - queryResponse.length;
    
      if (remainingRecordsToGet <= 0) {
        return;
      }

      const currentRecordCount = Math.min(queryConfig.maxTakePerRequest, remainingRecordsToGet);
      await getRecords(currentRecordCount);
    };
  
    const queryCurrentBatch = async (requestsInCurrentBatch: number): Promise<void> => {
      for( let request = 0; request < requestsInCurrentBatch; request++ ){
        await queryRecordsInCurrentBatch();
      }
    };
  
    while (queryResponse.length < take && (totalCount === undefined || queryResponse.length < totalCount)) {
      const remainingRequestCount = Math.ceil((take - queryResponse.length) / queryConfig.maxTakePerRequest);
      const requestsInCurrentBatch = Math.min(queryConfig.requestsPerSecond, remainingRequestCount);
      
      const startTime = Date.now();
      await queryCurrentBatch(requestsInCurrentBatch);
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

  async loadWorkspaces(): Promise<Map<string, Workspace> | void> {
    if (ResultsDataSourceBase.workspacesPromise) {
      return ResultsDataSourceBase.workspacesPromise;
    }

    ResultsDataSourceBase.workspacesPromise = this.getWorkspaces()
      .then(workspaces => {
        const workspaceMap = new Map<string, Workspace>();
        if (workspaces) {
          workspaces.forEach(workspace => workspaceMap.set(workspace.id, workspace));
        }
        return workspaceMap;
      })
      .catch(error => {
        console.error('Error in loading workspaces:', error);
      });

    return ResultsDataSourceBase.workspacesPromise;
  }

  async getPartNumbers(): Promise<string[] | void> {
    if (ResultsDataSourceBase.partNumbersPromise) {
      return ResultsDataSourceBase.partNumbersPromise;
    }

    ResultsDataSourceBase.partNumbersPromise = this.queryResultsValues(ResultsPropertiesOptions.PART_NUMBER, undefined)
    .catch(error => {
      console.error('Error in loading part numbers:', error);
    });

    return ResultsDataSourceBase.partNumbersPromise;
  }

  async queryResultsValues(fieldName: string, filter?: string): Promise<string[]> {
    try {
      return await this.post<string[]>(this.queryResultsValuesUrl, {
        field: fieldName,
        filter
      });
    } catch (error) {
      throw new Error(`An error occurred while querying result values: ${error}`);
    }
  }

  protected multipleValuesQuery(field: string): ExpressionTransformFunction {
    return (value: string, operation: string, _options?: any) => {
      const isMultiSelect = this.isMultiSelectValue(value);
      const valuesArray = this.getMultipleValuesArray(value);
      const logicalOperator = this.getLogicalOperator(operation);
      
      return isMultiSelect ? `(${valuesArray
        .map(val => `${field} ${operation} "${val}"`)
        .join(` ${logicalOperator} `)})` : `${field} ${operation} "${value}"`;
      }
    }

  protected timeFieldsQuery(field: string): ExpressionTransformFunction {
    return (value: string, operation: string): string => {
      const formattedValue = value === '${__now:date}' ? new Date().toISOString() : value;
      return `${field} ${operation} "${formattedValue}"`;
    };
  }

  /**
   * Combines two filter strings into a single query filter using the '&&' operator.
   * Filters that are undefined or empty are excluded from the final query.
   */
  protected buildQueryFilter(filterA?: string, filterB?: string): string | undefined {
    const filters = [filterA, filterB].filter(Boolean);
    return filters.length > 0 ? filters.join(' && ') : undefined;
  };

  private isMultiSelectValue(value: string): boolean {
    return value.startsWith('{') && value.endsWith('}');
  }

  private getMultipleValuesArray(value: string): string[] {
    return value.replace(/({|})/g, '').split(',');
  }

  private getLogicalOperator(operation: string): string {
    return operation === QueryBuilderOperations.EQUALS.name ? '||' : '&&';
  }

  private async delay(timeout: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, timeout));
  }

  testDatasource(): Promise<TestDataSourceResponse> {
    throw new Error("Method not implemented.");
  }
}
