import { DataQueryRequest, DataFrameDTO, FieldType } from '@grafana/data';
import { OutputType } from 'datasources/results/types/types';
import {
  QuerySteps,
  QueryStepsResponse,
  StepsProperties,
  StepsPropertiesOptions,
  StepsResponseProperties,
} from 'datasources/results/types/QuerySteps.types';
import { ResultsDataSourceBase } from 'datasources/results/ResultsDataSourceBase';
import { defaultStepsQuery } from 'datasources/results/defaultQueries';

export class QueryStepsDataSource extends ResultsDataSourceBase {
  queryStepsUrl = this.baseUrl + '/v2/query-steps';

  defaultQuery = defaultStepsQuery;

  async querySteps(
    filter?: string,
    orderBy?: string,
    projection?: StepsProperties[],
    take?: number,
    descending?: boolean,
    returnCount = false
  ): Promise<QueryStepsResponse> {

    const response = await this.post<QueryStepsResponse>(`${this.queryStepsUrl}`, {
      filter,
      orderBy,
      descending,
      projection,
      take,
      returnCount,
    });

    if (response.error) {
      throw new Error(`An error occurred while querying steps: ${response.error}`);
    }

    return response;
  }

  async runQuery(query: QuerySteps, options: DataQueryRequest): Promise<DataFrameDTO> {
    const responseData = await this.querySteps(
      this.getTimeRangeFilter(options, query.useTimeRange, query.useTimeRangeFor),
      query.orderBy,
      query.properties,
      query.recordCount,
      query.descending,
      true
    );

    if (responseData.steps.length === 0) {
      return {
        refId: query.refId,
        fields: [],
      };
    }

    if (query.outputType === OutputType.Data) {
      const stepsResponse = responseData.steps;
      const stepResponseKeys = new Set(Object.keys(stepsResponse[0]));
      const selectedFields = (query.properties || []).filter(field => stepResponseKeys.has(field));
      const fields = this.processFields(selectedFields, stepsResponse);

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

  private processFields(
    selectedFields: StepsProperties[],
    stepsResponse: StepsResponseProperties[]
  ): Array<{ name: StepsProperties; values: string[]; type: FieldType }> {
    return selectedFields.map(field => {
      const isTimeField = field === StepsPropertiesOptions.UPDATED_AT || field === StepsPropertiesOptions.STARTED_AT;

      const fieldType = isTimeField ? FieldType.time : FieldType.string;
      const values = stepsResponse.map(data => data[field as keyof StepsResponseProperties]);

      switch (field) {
        case StepsPropertiesOptions.PROPERTIES:
        case StepsPropertiesOptions.INPUTS:
        case StepsPropertiesOptions.OUTPUTS:
        case StepsPropertiesOptions.DATA:
          return {
            name: field,
            values: values.map(value => (value !== null ? JSON.stringify(value) : '')),
            type: fieldType,
          };
        case StepsPropertiesOptions.STATUS:
          return { name: field, values: values.map((value: any) => value?.statusType), type: fieldType };
        default:
          return { name: field, values, type: fieldType };
      }
    });
  }

  shouldRunQuery(_: QuerySteps): boolean {
    return true;
  }
}
