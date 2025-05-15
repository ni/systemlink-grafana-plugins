import { QueryResults, QueryResultsResponse, ResultsProperties, ResultsPropertiesOptions, ResultsResponseProperties, ResultsVariableQuery } from "datasources/results/types/QueryResults.types";
import { ResultsDataSourceBase } from "datasources/results/ResultsDataSourceBase";
import { DataQueryRequest, DataFrameDTO, FieldType, LegacyMetricFindQueryOptions, MetricFindValue } from "@grafana/data";
import { OutputType } from "datasources/results/types/types";
import { defaultResultsQuery } from "datasources/results/defaultQueries";
import { ExpressionTransformFunction, transformComputedFieldsQuery } from "core/query-builder.utils";
import { ResultsQueryBuilderFieldNames } from "datasources/results/constants/ResultsQueryBuilder.constants";

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
      throw new Error(`An error occurred while querying results: ${error}`);
    }
  }

  async runQuery(query: QueryResults, options: DataQueryRequest): Promise<DataFrameDTO> {
    await this.getPartNumbers();
    await this.loadWorkspaces();

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
  
  async metricFindQuery(_query: ResultsVariableQuery, _options?: LegacyMetricFindQueryOptions): Promise<MetricFindValue[]> {
    return [];
  }

  shouldRunQuery(_: QueryResults): boolean {
    return true;
  }
}
