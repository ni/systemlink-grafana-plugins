import { QueryResults, QueryResultsResponse, ResultsProperties, ResultsPropertiesOptions, ResultsResponseProperties } from "datasources/results/types/QueryResults.types";
import { ResultsDataSourceBase } from "datasources/results/ResultsDataSourceBase";
import { DataQueryRequest, DataFrameDTO, FieldType } from "@grafana/data";
import { OutputType } from "datasources/results/types/types";
import { defaultResultsQuery } from "datasources/results/defaultQueries";

export class QueryResultsDataSource extends ResultsDataSourceBase {
  queryResultsUrl = this.baseUrl + '/v2/query-results';
  queryResultsValuesUrl = this.baseUrl + '/v2/query-result-values';

  defaultQuery = defaultResultsQuery;

  readonly partNumbersCache: string[] = [];

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

    const responseData = await this.queryResults(
      this.getTimeRangeFilter(options, query.useTimeRange, query.useTimeRangeFor),
      query.orderBy,
      query.properties,
      query.recordCount,
      query.descending,
      true
    );

    if (responseData.results.length === 0) {
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

  async getPartNumbers(): Promise<void> {
    if (this.partNumbersCache.length > 0) {
      return;
    }
    const partNumbers = await this.post<string[]>(this.queryResultsValuesUrl, {
      field: ResultsPropertiesOptions.PART_NUMBER,
    }).catch(error => {
      throw new Error(error);
    });

    partNumbers?.forEach(partNumber => this.partNumbersCache.push(partNumber));
  }

  shouldRunQuery(_: QueryResults): boolean {
    return true;
  }
}
