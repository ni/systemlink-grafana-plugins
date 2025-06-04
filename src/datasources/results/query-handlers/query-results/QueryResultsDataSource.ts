import { QueryResults, QueryResultsResponse, ResultsProperties, ResultsPropertiesOptions, ResultsResponseProperties, ResultsVariableQuery } from "datasources/results/types/QueryResults.types";
import { ResultsDataSourceBase } from "datasources/results/ResultsDataSourceBase";
import { DataQueryRequest, DataFrameDTO, FieldType, LegacyMetricFindQueryOptions, MetricFindValue, AppEvents } from "@grafana/data";
import { OutputType } from "datasources/results/types/types";
import { defaultResultsQuery } from "datasources/results/defaultQueries";
import { ExpressionTransformFunction, transformComputedFieldsQuery } from "core/query-builder.utils";
import { ResultsQueryBuilderFieldNames } from "datasources/results/constants/ResultsQueryBuilder.constants";
import { TAKE_LIMIT } from "datasources/results/constants/QuerySteps.constants";
import { extractErrorInfo } from "core/errors";

export class QueryResultsDataSource extends ResultsDataSourceBase {
  queryResultsUrl = this.baseUrl + '/v2/query-results';

  defaultQuery = defaultResultsQuery;

  async queryResults(
    filter?: string,
    orderBy?: string,
    projection?: ResultsProperties[],
    take?: number,
    descending?: boolean,
    returnCount = false
  ): Promise<QueryResultsResponse> {
    try {
      return await this.post<QueryResultsResponse>(`${this.queryResultsUrl}`, {
        filter,
        orderBy,
        descending,
        projection,
        take,
        returnCount,
      });
    } catch (error) {
      const errorDetails = extractErrorInfo((error as Error).message);
      let errorMessage: string;

      if (!errorDetails.statusCode) {
        errorMessage = 'The query failed due to an unknown error.';
      } else {
        errorMessage = `The query failed due to the following error: (status ${errorDetails.statusCode}) ${errorDetails.message}.`;
      }

      this.appEvents?.publish?.({
        type: AppEvents.alertError.name,
        payload: ['Error during result query', errorMessage],
      });

      throw new Error(errorMessage);
    }
  }

  async runQuery(query: QueryResults, options: DataQueryRequest): Promise<DataFrameDTO> {
    if (query.queryBy) {
      query.queryBy = transformComputedFieldsQuery(
        this.templateSrv.replace(query.queryBy, options.scopedVars),
        this.resultsComputedDataFields,
      );
    }

    const useTimeRangeFilter = this.getTimeRangeFilter(options, query.useTimeRange, query.useTimeRangeFor);

    const responseData = await this.queryResults(
      this.buildQueryFilter(query.queryBy, useTimeRangeFilter),
      query.orderBy,
      query.properties,
      query.recordCount,
      query.descending,
      true
    );

    if(responseData.results.length === 0) {
      return {
        refId: query.refId,
        fields: [],
      };
    }

    if (query.outputType === OutputType.Data) {
      const testResultsResponse = responseData.results;
      const selectedFields = query.properties?.filter((field: ResultsProperties) => Object.keys(testResultsResponse[0]).includes(field)) || [];
      const fields = selectedFields.map(field => {
        const isTimeField = field === ResultsPropertiesOptions.UPDATED_AT || field === ResultsPropertiesOptions.STARTED_AT;
        const fieldType = isTimeField ? FieldType.time : FieldType.string;
        const values = testResultsResponse.map(data => data[field as unknown as keyof ResultsResponseProperties]);

        switch (field) {
          case ResultsPropertiesOptions.PROPERTIES:
          case ResultsPropertiesOptions.STATUS_TYPE_SUMMARY:
            return { name: field, values: values.map(value => value !== null ? JSON.stringify(value) : ''), type: fieldType };
          case ResultsPropertiesOptions.STATUS:
            return { name: field, values: values.map((value: any) => value?.statusType), type: fieldType };
          default:
            return { name: field, values, type: fieldType };
        }
      });
      return {
        refId: query.refId,
        fields: fields,
      };
    } else {
      return {
        refId: query.refId,
        fields: [{ name: 'Total count', values: [responseData.totalCount] }],
      };
    }
  }

  /**
   * A map linking each field name to its corresponding query transformation function.
   * It dynamically processes and formats query expressions based on the field type.
   */
  readonly resultsComputedDataFields = new Map<string, ExpressionTransformFunction>(
    Object.values(ResultsQueryBuilderFieldNames).map(field => [
      field,
      field === (ResultsQueryBuilderFieldNames.UPDATED_AT) || field === (ResultsQueryBuilderFieldNames.STARTED_AT)
        ? this.timeFieldsQuery(field)
        : this.multipleValuesQuery(field),
    ])
  );

  async metricFindQuery(query: ResultsVariableQuery, options?: LegacyMetricFindQueryOptions): Promise<MetricFindValue[]> {
    if (query.properties !== undefined && this.isTakeValidValid(query.resultsTake!)) {
      const filter = query.queryBy ? transformComputedFieldsQuery(
        this.templateSrv.replace(query.queryBy, options?.scopedVars),
        this.resultsComputedDataFields
      ) : undefined;

      const metadata = (await this.queryResults(
        filter,
        'UPDATED_AT',
        [query.properties as ResultsProperties],
        query.resultsTake,
      )).results;

      if (metadata.length > 0) {
        const propertyKey = ResultsPropertiesOptions[query.properties as keyof typeof ResultsPropertiesOptions] as keyof ResultsResponseProperties;
        const values = metadata.map((data: ResultsResponseProperties) => data[propertyKey]).filter(value => value !== undefined && value !== null);
        const flattenedResults = this.flattenAndDeduplicate(values as string[]);
        return flattenedResults.map(value => ({ text: String(value), value }));
      }
    }
    return [];
  }

  /**
   * Flattens an array of strings, where each element may be a string or an array of strings,
   * into a single-level array and removes duplicate values.
   *
   * @param values - An array containing strings or arrays of strings to be flattened and deduplicated.
   * @returns A new array containing unique string values from the input, flattened to a single level.
   */
  private flattenAndDeduplicate(values: string[]): string[] {
    const flatValues = values.flatMap(
      (value) => Array.isArray(value) ? value : [value]);
    return Array.from(new Set(flatValues));
  }

  private isTakeValidValid(value: number): boolean {
    return !isNaN(value) && value > 0 && value <= TAKE_LIMIT;
  }

  shouldRunQuery(_: QueryResults): boolean {
    return true;
  }
}


