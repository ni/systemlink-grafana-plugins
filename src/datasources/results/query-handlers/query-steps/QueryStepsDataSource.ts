import { DataQueryRequest, DataFrameDTO, FieldType } from '@grafana/data';
import { OutputType, QueryType } from 'datasources/results/types/types';
import { QuerySteps, QueryStepsResponse, StepsProperties, StepsPropertiesOptions, StepsResponseProperties } from 'datasources/results/types/QuerySteps.types';
import { ResultsDataSourceBase } from 'datasources/results/ResultsDataSourceBase';

export class QueryStepsDataSource extends ResultsDataSourceBase {
  queryStepsUrl = this.baseUrl + '/v2/query-steps';

  defaultQuery = {
    queryType: QueryType.Steps,
    outputType: OutputType.Data,
    properties: [
      StepsProperties.name, 
      StepsProperties.status, 
      StepsProperties.totalTimeInSeconds
    ] as StepsProperties[],
    recordCount: 10000,
  };

  async querySteps(
    filter?: string,
    orderBy?: string,
    projection?: StepsProperties[],
    take?: number,
    continuationToken?: string,
    descending?: boolean,
    returnCount = false
  ): Promise<QueryStepsResponse> {
    try {
      return await this.post<QueryStepsResponse>(`${this.queryStepsUrl}`, {
        filter,
        orderBy,
        descending,
        projection,
        continuationToken,
        take,
        returnCount,
      });
    } catch (error) {
      throw new Error(`An error occurred while querying steps: ${error}`);
    }
  }

  private async fetchStepsBatch(filter?: string, orderBy?: string, projection?: StepsProperties[], take?: number, descending?: boolean, returnCount = false): Promise<QueryStepsResponse> {
    let stepsResponse: StepsResponseProperties[] = [];
    let continuationToken: string | undefined = undefined;
    const MAX_REQUEST_PER_SECOND = 9;
    const MAX_TAKE_PER_REQUEST = 1000;
    let REQUEST_COUNT = Math.ceil((take || 0) / MAX_TAKE_PER_REQUEST);
    const BATCH_COUNT = Math.ceil(REQUEST_COUNT / MAX_REQUEST_PER_SECOND);

    try{
      if (take === undefined || take <= MAX_TAKE_PER_REQUEST) {
        return await this.querySteps(
          filter,
          orderBy,
          projection,
          take,
          continuationToken,
          descending,
          returnCount
        );
      }
      while (REQUEST_COUNT > 0) {
        const currentTake = Math.min(MAX_TAKE_PER_REQUEST, take - stepsResponse.length);
        const response = await this.querySteps(
          filter,
          orderBy,
          projection,
          currentTake,
          continuationToken,
          descending,
          stepsResponse.length === 0 ? returnCount : false
        );
  
        stepsResponse = [...stepsResponse, ...response.steps];
        continuationToken = response.continuationToken;
        REQUEST_COUNT--;
  
        if (!continuationToken) {
          break;
        }
  
        if (stepsResponse.length >= take) {
          break;
        }
      }

      return {
        steps: stepsResponse,
        totalCount: stepsResponse.length,
      };
      
    }
    catch (error) {
      throw new Error(`An error occurred while querying steps: ${error}`);
    }
  }


  async runQuery(query: QuerySteps, options: DataQueryRequest): Promise<DataFrameDTO> {
    const projection = query.showMeasurements
      ? [...new Set([...(query.properties || []), StepsPropertiesOptions.DATA])]
      : query.properties;

    const responseData = await this.fetchStepsBatch(
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

    if (query.outputType === OutputType.Data) {
      const stepsResponse = responseData.steps;
      const selectedFields = (query.properties || [])
        .filter(field => 
          Object.keys(stepsResponse[0]).includes(field)
        );
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
      return {
        refId: query.refId,
        fields: [{ name: 'Total count', values: [responseData.totalCount] }],
      };
    }
  }

  private processFields(selectedFields: StepsProperties[], stepsResponse: StepsResponseProperties[]): any[] {
    return selectedFields.map(field => {
      const isTimeField = field === StepsPropertiesOptions.UPDATED_AT || field === StepsPropertiesOptions.STARTED_AT;

      const fieldType = isTimeField ? FieldType.time : FieldType.string;
      const values = stepsResponse.map(data => data[field as keyof StepsResponseProperties]);

      switch (field) {
        case StepsPropertiesOptions.PROPERTIES:
        case StepsPropertiesOptions.INPUTS:
        case StepsPropertiesOptions.OUTPUTS:
        case StepsPropertiesOptions.DATA:
          return { name: field, values: values.map(value => (value !== null ? JSON.stringify(value) : '')), type: fieldType};
        case StepsPropertiesOptions.STATUS:
          return { name: field, values: values.map((value: any) => value?.statusType), type: fieldType };
        default:
          return { name: field, values, type: fieldType };
      }
    });
  }

  private processMeasurementData(stepsResponse: StepsResponseProperties[]): any[] {
    const measurementFields = ['Measurement Name', 'Measurement Value', 'Status', 'Unit', 'Low Limit', 'High Limit'];
    const fieldToParameterProperty = {
      'Measurement Name': 'name',
      'Measurement Value': 'measurement',
      'Status': 'status',
      'Unit': 'units',
      'Low Limit': 'lowLimit',
      'High Limit': 'highLimit',
    };
    
    return measurementFields.map(field => {
      const values = stepsResponse.map(step => {
        if (!step?.data?.parameters) {
          return [];
        }
        return step.data.parameters.map(param => param[fieldToParameterProperty[field as keyof typeof fieldToParameterProperty]]);
      });
      
      return {
        name: field,
        values: values,
        type: FieldType.string
      };
    });
  }

  shouldRunQuery(_: QuerySteps): boolean {
    return true;
  }
};
