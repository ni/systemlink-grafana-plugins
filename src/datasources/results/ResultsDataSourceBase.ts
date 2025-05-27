import { DataSourceBase } from "core/DataSourceBase";
import { DataQueryRequest, DataFrameDTO, TestDataSourceResponse } from "@grafana/data";
import { ResultsQuery } from "./types/types";
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
  readonly workspacesCache = new Map<string, Workspace>([]);
  readonly partNumbersCache: string[] = [];

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

  async loadWorkspaces(): Promise<void> {
    if (this.workspacesCache.size > 0) {
      return;
    }

    const workspaces = await this.getWorkspaces()
      .catch(error => {
        console.error('Error in loading workspaces:', error);
      });

    workspaces?.forEach(workspace => this.workspacesCache.set(workspace.id, workspace));
  }

  async getPartNumbers(): Promise<void> {
    if (this.partNumbersCache.length > 0) {
      return;
    }
    
    const partNumbers = await this.post<string[]>(this.queryResultsValuesUrl, {
      field: ResultsPropertiesOptions.PART_NUMBER,
    }).catch(error => {
      console.error('Error in loading part numbers:', error);
    });

    partNumbers?.forEach(partNumber => this.partNumbersCache.push(partNumber));
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
}
