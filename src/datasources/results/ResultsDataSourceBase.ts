import { DataSourceBase } from "core/DataSourceBase";
import { DataQueryRequest, DataFrameDTO, TestDataSourceResponse } from "@grafana/data";
import { ProductProperties, QueryProductResponse, ResultsQuery } from "./types/types";
import { QueryBuilderOption, Workspace } from "core/types";
import { getVariableOptions } from "core/utils";
import { ExpressionTransformFunction } from "core/query-builder.utils";
import { QueryBuilderOperations } from "core/query-builder.constants";

export abstract class ResultsDataSourceBase extends DataSourceBase<ResultsQuery> {
  baseUrl = this.instanceSettings.url + '/nitestmonitor';
  queryResultsValuesUrl = this.baseUrl + '/v2/query-result-values';
  queryProductsUrl = this.baseUrl + '/v2/query-products';

  private timeRange: { [key: string]: string } = {
    Started: 'startedAt',
    Updated: 'updatedAt',
  };

  private fromDateString = '${__from:date}';
  private toDateString = '${__to:date}';
  private static _workspacesCache: Promise<Map<string, Workspace>> | null = null;
  private static _productCache: Promise<QueryProductResponse> | null = null;

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

  get productCache(): Promise<QueryProductResponse> {
    return this.loadProducts();
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
        console.error('Error in loading workspaces:', error);
        return new Map<string, Workspace>();
      });

    return ResultsDataSourceBase._workspacesCache;
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

  async queryProducts(
    projection?: ProductProperties[],
  ): Promise<QueryProductResponse> {
    try {
      const response = await this.post<QueryProductResponse>(this.queryProductsUrl, {
        projection,
      });
      return response;
    } catch (error) {
      throw new Error(`An error occurred while querying products: ${error}`);
    }
  }

  async loadProducts(): Promise<QueryProductResponse> {
    if (ResultsDataSourceBase._productCache) {
      return ResultsDataSourceBase._productCache;
    }
    ResultsDataSourceBase._productCache = this.queryProducts([ProductProperties.name, ProductProperties.partNumber])
      .catch(error => {
        console.error('Error in loading products:', error);
        return { products: [] };
      });
    return ResultsDataSourceBase._productCache;
  };

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
   * Flattens an array of strings, where each element may be a string or an array of strings,
   * into a single-level array and removes duplicate values.
   *
   * @param values - An array containing strings or arrays of strings to be flattened and deduplicated.
   * @returns A new array containing unique string values from the input, flattened to a single level.
   */
  protected flattenAndDeduplicate(values: string[]): string[] {
    const flatValues = values.flatMap(
      (value) => Array.isArray(value) ? value : [value]);
    return Array.from(new Set(flatValues));
  }

  /**
   * Combines two filter strings into a single query filter using the '&&' operator.
   * Filters that are undefined or empty are excluded from the final query.
   */
  protected buildQueryFilter(filterA?: string, filterB?: string): string | undefined {
    const filters = [filterA, filterB].filter(Boolean);
    return filters.length > 0 ? filters.join(' && ') : undefined;
  };

  /**
   * Builds a query string for the given field using multiple values,
   * joining each condition with the logical OR operator
   *
   * @param fieldName - The field name to filter on
   * @param values - Array of values to include in the OR condition.
   * @returns The constructed query string, or an empty string if no values are provided.
   */
  protected buildQueryWithOrOperator = (fieldName: string, values: string[]): string => {
    if (values.length === 0){
      return '';
    } 
    return values.map(item => `${fieldName} = "${item}"`).join(' || ');
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
