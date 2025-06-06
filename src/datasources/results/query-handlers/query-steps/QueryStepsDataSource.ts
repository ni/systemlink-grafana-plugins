import { DataQueryRequest, DataFrameDTO, FieldType, LegacyMetricFindQueryOptions, MetricFindValue, ScopedVars } from '@grafana/data';
import { OutputType } from 'datasources/results/types/types';
import {
  QueryStepPathsResponse,
  QuerySteps,
  QueryStepsResponse,
  StepPathResponseProperties,
  StepsPathProperties,
  StepsProperties,
  StepsPropertiesOptions,
  StepsResponseProperties,
} from 'datasources/results/types/QuerySteps.types';
import { ResultsDataSourceBase } from 'datasources/results/ResultsDataSourceBase';
import { defaultStepsQuery } from 'datasources/results/defaultQueries';
import { MAX_TAKE_PER_REQUEST, QUERY_STEPS_REQUEST_PER_SECOND, TAKE_LIMIT } from 'datasources/results/constants/QuerySteps.constants';
import { StepsQueryBuilderFieldNames } from 'datasources/results/constants/StepsQueryBuilder.constants';
import { ExpressionTransformFunction, transformComputedFieldsQuery } from 'core/query-builder.utils';
import { ResultsQueryBuilderFieldNames } from 'datasources/results/constants/ResultsQueryBuilder.constants';
import { StepsVariableQuery } from 'datasources/results/types/QueryResults.types';
import { QueryResponse } from 'core/types';
import { queryInBatches } from 'core/utils';
import { MAX_PATH_TAKE_PER_REQUEST, QUERY_PATH_REQUEST_PER_SECOND } from 'datasources/results/constants/QueryStepPath.constants';

export class QueryStepsDataSource extends ResultsDataSourceBase {
  queryStepsUrl = this.baseUrl + '/v2/query-steps';
  queryPathsUrl = this.baseUrl + '/v2/query-paths';

  defaultQuery = defaultStepsQuery;

  private stepsPath: string[] = [];
  private previousResultsQuery: string | undefined;

  private stepsPathChangeCallback?: () => void;

  setStepsPathChangeCallback(callback: () => void) {
    this.stepsPathChangeCallback = callback;
  }

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

  private async queryStepPaths(
    projection?: StepsPathProperties[],
    filter?: string,
    take?: number,
    continuationToken?: string,
    returnCount = false
  ): Promise<QueryStepPathsResponse> {
    const defaultOrderBy = StepsPathProperties.path
    const response = await this.post<QueryStepPathsResponse>(this.queryPathsUrl, {
      filter,
      projection,
      take,
      orderBy: defaultOrderBy,
      continuationToken,
      returnCount,
    })
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

    const response = await queryInBatches(queryRecord, batchQueryConfig, take);

    return {
      steps: response.data,
      continuationToken: response.continuationToken,
      totalCount: response.totalCount
    };
  }

  async queryStepPathInBatches(
    filter?: string,
    projection?: StepsPathProperties[],
    take?: number,
    returnCount = false,
  ): Promise<QueryStepPathsResponse> {
    const queryRecord = async (currentTake: number, token?: string): Promise<QueryResponse<StepPathResponseProperties>> => {
      const response = await this.queryStepPaths(
        projection,
        filter,
        currentTake,
        token,
        returnCount
      );

      return {
        data: response.paths,
        continuationToken: response.continuationToken,
        totalCount: response.totalCount
      };
    };

    const batchQueryConfig = {
      maxTakePerRequest: MAX_PATH_TAKE_PER_REQUEST,
      requestsPerSecond: QUERY_PATH_REQUEST_PER_SECOND
    };

    const response = await queryInBatches(queryRecord, batchQueryConfig, take);

    return {
      paths: response.data,
      continuationToken: response.continuationToken,
      totalCount: response.totalCount
    };
  }
  
  async runQuery(query: QuerySteps, options: DataQueryRequest): Promise<DataFrameDTO> {
    if (!query.partNumberQuery || query.partNumberQuery.length === 0) {
      return {
        refId: query.refId,
        fields: [],
      };
    }
    query.resultsQuery = this.buildResultsQuery(options.scopedVars, query.partNumberQuery, query.resultsQuery);
    
    if(this.previousResultsQuery !== query.resultsQuery) {
      this.stepsPath = await this.getStepPathsLookupValues(options.scopedVars, query.partNumberQuery, query.resultsQuery)
      this.stepsPathChangeCallback?.();
    }
    this.previousResultsQuery = query.resultsQuery;
    
    const transformStepsQuery = query.stepsQuery
      ? this.transformQuery(query.stepsQuery, this.stepsComputedDataFields, options.scopedVars)
      : undefined;
    const useTimeRangeFilter = this.getTimeRangeFilter(options, query.useTimeRange, query.useTimeRangeFor);
    query.stepsQuery = this.buildQueryFilter(transformStepsQuery, useTimeRangeFilter);

    const projection = query.showMeasurements
      ? [...new Set([...(query.properties || []), StepsPropertiesOptions.DATA])]
      : query.properties;

    if (query.outputType === OutputType.Data) {
      const responseData = await this.queryStepsInBatches(
        query.stepsQuery,
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
        query.stepsQuery,
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

  private async getStepPathsLookupValues(scopedVars: ScopedVars, partNumberQuery: string[], transformedResultsQuery: string): Promise<string[]> {
    let stepPathValues: string[];
    try {
      const stepPathResponse = await this.loadStepPaths(scopedVars, partNumberQuery, transformedResultsQuery);
      stepPathValues = stepPathResponse.paths.map(pathObj => pathObj.path);
    } catch (error) {
      console.error('Error in loading step paths:', error);
      stepPathValues = [];
    }
    return stepPathValues;
  }

  private async loadStepPaths(
    options: ScopedVars,
    partNumberQuery: string[],
    transformedResultsQuery?: string
  ): Promise<QueryStepPathsResponse> {
    const programNames = await this.queryResultsValues(ResultsQueryBuilderFieldNames.PROGRAM_NAME, transformedResultsQuery);
    if(programNames.length === 0) {
      return { paths: [] };
    }

    const buildProgramNameQuery = this.buildQueryWithOrOperator(ResultsQueryBuilderFieldNames.PROGRAM_NAME, programNames);
    const partNumberString = this.buildPartNumbersQuery(options, partNumberQuery);
    const buildStepPathFilter = this.buildQueryFilter(`(${buildProgramNameQuery})`, `(${partNumberString})`);
    return await this.queryStepPathInBatches(
      buildStepPathFilter,
      [StepsPathProperties.path],
      MAX_PATH_TAKE_PER_REQUEST,
      true
    );
  }

  getStepPaths(): string[] {
    if (this.stepsPath?.length > 0) {
      return this.flattenAndDeduplicate(this.stepsPath);
    }
    return [];
  }

  private buildResultsQuery(scopedVars: ScopedVars, partNumberQuery: string[], resultsQuery?: string): string {
    const partNumberFilter = this.buildQueryWithOrOperator(ResultsQueryBuilderFieldNames.PART_NUMBER, partNumberQuery);
    const combinedResultsQuery = this.buildQueryFilter(`(${partNumberFilter})`, resultsQuery);
    return this.transformQuery(combinedResultsQuery, this.resultsComputedDataFields, scopedVars)!;
  }

  private buildPartNumbersQuery(scopedVars: ScopedVars, partNumberQuery: string[]): string {
    const partNumberFilter = this.buildQueryWithOrOperator(ResultsQueryBuilderFieldNames.PART_NUMBER, partNumberQuery);
    return this.transformQuery(partNumberFilter, this.resultsComputedDataFields, scopedVars)!;
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
   * @param scopedVars - The scoped variables for template replacement.
   * @returns - The transformed query string, or undefined if the input queryField is undefined.
   */
  private transformQuery(queryField: string | undefined, computedDataFields: Map<string, ExpressionTransformFunction>, scopedVars: ScopedVars): string | undefined {
    return queryField
      ? transformComputedFieldsQuery(
        this.templateSrv.replace(queryField, scopedVars),
        computedDataFields
      )
      : undefined;
  }

  async metricFindQuery(query: StepsVariableQuery, options?: LegacyMetricFindQueryOptions): Promise<MetricFindValue[]> {
    if (query.partNumberQueryInSteps !== undefined && query.partNumberQueryInSteps.length > 0 && this.isTakeValid(query.stepsTake!)) {
      const resultsQuery = this.buildResultsQuery(options?.scopedVars!, query.partNumberQueryInSteps, query.queryByResults);

      const stepsQuery = query.queryBySteps ? transformComputedFieldsQuery(
        this.templateSrv.replace(query.queryBySteps, options?.scopedVars),
        this.resultsComputedDataFields
      ) : undefined;

      let responseData: QueryStepsResponse;
      try {
        responseData = await this.queryStepsInBatches(
          stepsQuery,
          'UPDATED_AT',
          [StepsPropertiesOptions.NAME as StepsProperties],
          query.stepsTake,
          true,
          resultsQuery,
        );
      } catch (error) {
        console.error('Error in querying steps:', error);
        return [];
      }

      if (responseData.steps.length > 0) {
        return responseData.steps
          ? responseData.steps.map((data: StepsResponseProperties) => ({ text: data.name!, value: data.name! }))
          : [];
      }
    }
    return [];
  }

  private isTakeValid(value: number): boolean {
    return !isNaN(value) && value > 0 && value <= TAKE_LIMIT;
  }

  shouldRunQuery(_: QuerySteps): boolean {
    return true;
  }
}
