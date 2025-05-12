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
import { StepsQueryBuilderFieldNames } from 'datasources/results/constants/StepsQueryBuilder.constants';
import { ExpressionTransformFunction, transformComputedFieldsQuery } from 'core/query-builder.utils';
import { ResultsQueryBuilderFieldNames } from 'datasources/results/constants/ResultsQueryBuilder.constants';

export class QueryStepsDataSource extends ResultsDataSourceBase {
  queryStepsUrl = this.baseUrl + '/v2/query-steps';

  defaultQuery = defaultStepsQuery;

  private _disableStepsQueryBuilder = true;

  async querySteps(
    filter?: string,
    orderBy?: string,
    projection?: StepsProperties[],
    take?: number,
    descending?: boolean,
    resultsFilter?: string,
    continuationToken?: string,
    returnCount = false
  ): Promise<QueryStepsResponse> {

    const response = await this.post<QueryStepsResponse>(`${this.queryStepsUrl}`, {
      filter,
      orderBy,
      descending,
      projection,
      take,
      resultsFilter,
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
    resultsFilter?: string,
    returnCount = false,
  ): Promise<QueryStepsResponse> {
    const queryRecord = async (currentTake: number, token?: string): Promise<QueryResponse<StepsResponseProperties>> => {
      const response = await this.querySteps(
        filter,
        orderBy,
        projection,
        currentTake,
        descending,
        resultsFilter,
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
    if (query.resultsQuery) {
      this.disableStepsQueryBuilder = false;
    }

    query.stepsQuery = this.transformQuery(query.stepsQuery, this.stepsComputedDataFields, options);
    query.resultsQuery = this.transformQuery(query.resultsQuery, this.resultsComputedDataFields, options);

    const useTimeRangeFilter = this.getTimeRangeFilter(options, query.useTimeRange, query.useTimeRangeFor);
    const stepsQuery = this.buildQueryFilter(query.stepsQuery, useTimeRangeFilter);
    const projection = query.showMeasurements
      ? [...new Set([...(query.properties || []), StepsPropertiesOptions.DATA])]
      : query.properties;
    
    if (query.outputType === OutputType.Data) {
      const responseData = await this.queryStepsInBatches(
        stepsQuery,
        query.orderBy,
        projection as StepsProperties[],
        query.recordCount,
        query.descending,
        query.resultsQuery,
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
        stepsQuery,
        undefined,
        undefined,
        undefined,
        undefined,
        query.resultsQuery,
        undefined,
        true
      );

      return {
        refId: query.refId,
        fields: [{ name: 'Total count', values: [responseData.totalCount] }],
      };
    }
  }

  get disableStepsQueryBuilder(): boolean {
    return this._disableStepsQueryBuilder;
  }

  set disableStepsQueryBuilder(value: boolean) {
    this._disableStepsQueryBuilder = value;
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

  /**
   * A map linking each steps field name to its corresponding query transformation function.
   */
  private readonly stepsComputedDataFields = new Map<string, ExpressionTransformFunction>(
    Object.values(StepsQueryBuilderFieldNames).map(field => [
      field,
      field === (StepsQueryBuilderFieldNames.UPDATED_AT)
        ? this.timeFieldsQuery(field)
        : this.multipleValuesQuery(field),
    ])
  );

  /**
   * A map linking each results field name to its corresponding query transformation function.
   */
  private readonly resultsComputedDataFields = new Map<string, ExpressionTransformFunction>(
    Object.values(ResultsQueryBuilderFieldNames).map(field => [
      field,
      field === (ResultsQueryBuilderFieldNames.UPDATED_AT) || field === (ResultsQueryBuilderFieldNames.STARTED_AT)
        ? this.timeFieldsQuery(field)
        : this.multipleValuesQuery(field),
    ])
  );

  /**
   * Transforms a query by applying the appropriate transformation functions to its fields.
   * @param queryField - The query string to be transformed
   * @param computedDataFields - A map of fields and their corresponding transformation functions.
   * @param options - The data query request options, which include scoped variables for template replacement.
   * @returns - The transformed query string, or undefined if the input queryField is undefined.
   */
  private transformQuery(queryField: string | undefined, computedDataFields: Map<string, ExpressionTransformFunction>, options: DataQueryRequest): string | undefined {
  return queryField
    ? transformComputedFieldsQuery(
        this.templateSrv.replace(queryField, options.scopedVars),
        computedDataFields
      )
    : undefined;
  }

  shouldRunQuery(_: QuerySteps): boolean {
    return true;
  }
}
