import { DataQueryRequest, DataFrameDTO, FieldType } from '@grafana/data';
import { OutputType } from 'datasources/results/types/types';
import {
  QueryResponse,
  QuerySteps,
  QueryStepsResponse,
  StepsProperties,
  StepsPropertiesOptions,
  StepsResponseProperties,
} from 'datasources/results/types/QuerySteps.types';
import { ResultsDataSourceBase } from 'datasources/results/ResultsDataSourceBase';
import { defaultStepsQuery } from 'datasources/results/defaultQueries';
import { MAX_TAKE_PER_REQUEST, QUERY_STEPS_REQUEST_PER_SECOND } from 'datasources/results/constants/QuerySteps.constants';

export class QueryStepsDataSource extends ResultsDataSourceBase {
  queryStepsUrl = this.baseUrl + '/v2/query-steps';

  defaultQuery = defaultStepsQuery;

  async querySteps(
    filter?: string,
    orderBy?: string,
    projection?: StepsProperties[],
    take?: number,
    descending?: boolean,
    continuationToken?: string,
    returnCount = false
  ): Promise<QueryStepsResponse> {

    const response = await this.post<QueryStepsResponse>(`${this.queryStepsUrl}`, {
      filter,
      orderBy,
      descending,
      projection,
      take,
      continuationToken,
      returnCount,
    });

    if (response.error) {
      throw new Error(`An error occurred while querying steps: ${response.error}`);
    }

    return response;
  }

  async queryStepsInBatches(
    filter?: string,
    orderBy?: string,
    projection?: StepsProperties[],
    take?: number,
    descending?: boolean,
    returnCount = false,
  ): Promise<QueryStepsResponse> {
    const queryRecord = async (currentTake: number, token?: string): Promise<QueryResponse<StepsResponseProperties>> => {
      const response = await this.querySteps(
        filter,
        orderBy,
        projection,
        currentTake,
        descending,
        token,
        returnCount
      );

      return {
        data: response.steps,
        continuationToken: response.continuationToken,
        totalCount: response.totalCount
      };
    };

    const batchQueryConfig = {
      maxTakePerRequest: MAX_TAKE_PER_REQUEST,
      requestsPerSecond: QUERY_STEPS_REQUEST_PER_SECOND
    };

    const response = await this.queryInBatches(queryRecord, batchQueryConfig, take);

    return {
      steps: response.data,
      continuationToken: response.continuationToken,
      totalCount: response.totalCount
    };
  }
  
  async runQuery(query: QuerySteps, options: DataQueryRequest): Promise<DataFrameDTO> {
    const projection = query.showMeasurements
      ? [...new Set([...(query.properties || []), StepsPropertiesOptions.DATA])]
      : query.properties;

    if (query.outputType === OutputType.Data) {
      const responseData = await this.queryStepsInBatches(
        this.getTimeRangeFilter(options, query.useTimeRange, query.useTimeRangeFor),
        query.orderBy,
        projection as StepsProperties[],
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
      const stepsResponse = responseData.steps;
      const stepResponseKeys = new Set(Object.keys(stepsResponse[0]));
      const selectedFields = (query.properties || []).filter(field => stepResponseKeys.has(field));
      const fields = this.processFields(selectedFields, stepsResponse);

      if (query.showMeasurements) {
        const measurementFields = this.processMeasurementData(stepsResponse);
        fields.push(...measurementFields);
      }
      return {
        refId: query.refId,
        fields: fields,
      };
    } else {
      const responseData = await this.querySteps(
        this.getTimeRangeFilter(options, query.useTimeRange, query.useTimeRangeFor),
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        true
      );

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

  private processMeasurementData(stepsResponse: StepsResponseProperties[]): any[] {
    const fieldToParameterProperty = {
      'Measurement Name': 'name',
      'Measurement Value': 'measurement',
      'Status': 'status',
      'Unit': 'units',
      'Low Limit': 'lowLimit',
      'High Limit': 'highLimit',
    };
    const measurementFields = Object.keys(fieldToParameterProperty) as Array<keyof typeof fieldToParameterProperty>;

    return measurementFields.map(measurementField => {
      const values = stepsResponse.map(step => {
        if (!step.data?.parameters) {
          return [];
        }
        return step.data.parameters.map(
          param => param[fieldToParameterProperty[measurementField]]
        );
      });

      return {
        name: measurementField,
        values,
        type: FieldType.string,
      };
    });
  }

  shouldRunQuery(_: QuerySteps): boolean {
    return true;
  }
}
