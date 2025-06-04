import { DataSourceBase } from "core/DataSourceBase";
import { DataQueryRequest, DataFrameDTO, TestDataSourceResponse } from "@grafana/data";
import { ResultsQuery } from "./types/types";
import { QueryBuilderOption, Workspace } from "core/types";
import { ResultsPropertiesOptions } from "./types/QueryResults.types";
import { getVariableOptions } from "core/utils";
import { ExpressionTransformFunction } from "core/query-builder.utils";
import { QueryBuilderOperations } from "core/query-builder.constants";
import { extractErrorInfo } from "core/errors";

export abstract class ResultsDataSourceBase extends DataSourceBase<ResultsQuery> {
  error = '';
  innerError = '';
  baseUrl = this.instanceSettings.url + '/nitestmonitor';
  queryResultsValuesUrl = this.baseUrl + '/v2/query-result-values';

  private timeRange: { [key: string]: string } = {
    Started: 'startedAt',
    Updated: 'updatedAt',
  };

  private fromDateString = '${__from:date}';
  private toDateString = '${__to:date}';
  private static _workspacesCache: Promise<Map<string, Workspace>> | null = null;
  private static _partNumbersCache: Promise<string[]> | null = null;

  readonly globalVariableOptions = (): QueryBuilderOption[] => getVariableOptions(this);


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

  get workspacesCache(): Promise<Map<string, Workspace>> {
    return this.loadWorkspaces();
  }

  get partNumbersCache(): Promise<string[]> {
    return this.getPartNumbers();
  }

  async loadWorkspaces(): Promise<Map<string, Workspace>> {
    if (ResultsDataSourceBase._workspacesCache) {
      return ResultsDataSourceBase._workspacesCache;
    }

    ResultsDataSourceBase._workspacesCache = this.getWorkspaces()
      .then(workspaces => {
        const workspaceMap = new Map<string, Workspace>();
        if (workspaces) {
          workspaces.forEach(workspace => workspaceMap.set(workspace.id, workspace));
        }
        return workspaceMap;
      })
      .catch(error => {
        if (!this.error) {
          this.handleQueryResultValuesError(error);
        }
        return new Map<string, Workspace>();
      });

    return ResultsDataSourceBase._workspacesCache;
  }

  async getPartNumbers(): Promise<string[]> {
    if (ResultsDataSourceBase._partNumbersCache) {
      return ResultsDataSourceBase._partNumbersCache;
    }

    ResultsDataSourceBase._partNumbersCache = this.queryResultsValues(ResultsPropertiesOptions.PART_NUMBER, undefined)
      .catch(error => {
        if (!this.error) {
          this.handleQueryResultValuesError(error);
        } 
        return [];
      });

    return ResultsDataSourceBase._partNumbersCache;
  }

  async queryResultsValues(fieldName: string, filter?: string): Promise<string[]> {
    return await this.post<string[]>(this.queryResultsValuesUrl, {
      field: fieldName,
      filter
    });
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

  testDatasource(): Promise<TestDataSourceResponse> {
    throw new Error("Method not implemented.");
  }

  private handleQueryResultValuesError(error: unknown): void {
    const errorDetails = extractErrorInfo((error as Error).message);
    let detailedMessage = '';
    try {
      const parsed = JSON.parse(errorDetails.message);
      detailedMessage = parsed?.message || errorDetails.message;
    } catch {
      detailedMessage = errorDetails.message;
    }
    this.error = 'Warning during result value query';
    this.innerError = errorDetails.message
      ? `Some values may not be available in the query builder lookups due to the following error:${detailedMessage}.`
      : 'Some values may not be available in the query builder lookups due to an unknown error.';
  }
}
