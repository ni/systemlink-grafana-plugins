import { DataQueryRequest, DataFrameDTO, FieldType, LegacyMetricFindQueryOptions, MetricFindValue, ScopedVars, AppEvents } from '@grafana/data';
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
import { extractErrorInfo } from 'core/errors';
import { formatMeasurementColumnName, MEASUREMENT_NAME_COLUMN, measurementColumnLabelSuffix, MeasurementProperties, measurementProperties } from 'datasources/results/constants/stepMeasurements.constants';

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
    resultFilter?: string,
    continuationToken?: string,
    returnCount = false
  ): Promise<QueryStepsResponse> {

    try {
      const response = await this.post<QueryStepsResponse>(`${this.queryStepsUrl}`, {
        filter,
        orderBy,
        descending,
        projection,
        take,
        resultFilter,
        continuationToken,
        returnCount,
      });
      return response;
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
        payload: ['Error during step query', errorMessage],
      });

      throw new Error(errorMessage);
    }

  }

  private async queryStepPaths(
    projection?: StepsPathProperties[],
    filter?: string,
    take?: number,
    continuationToken?: string,
    returnCount = false
  ): Promise<QueryStepPathsResponse> {
    const defaultOrderBy = StepsPathProperties.path
    return await this.post<QueryStepPathsResponse>(this.queryPathsUrl, {
      filter,
      projection,
      take,
      orderBy: defaultOrderBy,
      continuationToken,
      returnCount,
    });
  }

  async queryStepsInBatches(
    filter?: string,
    orderBy?: string,
    projection?: StepsProperties[],
    take?: number,
    descending?: boolean,
    resultFilter?: string,
    returnCount = false,
  ): Promise<QueryStepsResponse> {
    const queryRecord = async (currentTake: number, token?: string): Promise<QueryResponse<StepsResponseProperties>> => {
      const response = await this.querySteps(
        filter,
        orderBy,
        projection,
        currentTake,
        descending,
        resultFilter,
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
      const fields = this.processFields(selectedFields, stepsResponse, query.showMeasurements || false);
      return {
        refId: query.refId,
        fields,
      };
    } else {
      const responseData = await this.querySteps(
        query.stepsQuery,
        undefined,
        [],
        0,
        undefined,
        query.resultsQuery,
        undefined,
        true
      );

      return {
        refId: query.refId,
        fields: [{ name: query.refId, values: [responseData.totalCount] }],
      };
    }
  }

  private async getStepPathsLookupValues(scopedVars: ScopedVars, partNumberQuery: string[], transformedResultsQuery: string): Promise<string[]> {
    let stepPathValues: string[];
    try {
      const stepPathResponse = await this.loadStepPaths(scopedVars, partNumberQuery, transformedResultsQuery);
      stepPathValues = stepPathResponse.paths.map(pathObj => pathObj.path);
    } catch (error) {
        if (!this.errorTitle) {
          this.handleQueryValuesError(error, 'step paths');
        }
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
    stepsResponse: StepsResponseProperties[],
    showMeasurements: boolean
  ): Array<{ name: string; values: string[]; type: FieldType }> {
    const columns: Array<{ name: string; values: string[]; type: FieldType }> = [];
    stepsResponse.forEach(step => {
      // Process selected step fields
      selectedFields.forEach(field => {
        const value = this.convertStepPropertyToString(field, step[field]);
        const fieldType = this.findFieldType(field, value);
        this.addValueToColumn(columns, field, value, fieldType);
      });

      // Process measurement fields if enabled
      if (showMeasurements) {
        // Measurements are defined as the data.parameters which contains a name, else the parameter is ignored.
        const measurements =
          step.data?.parameters?.filter(measurement => measurement[MEASUREMENT_NAME_COLUMN]) || [];

        measurements.forEach(measurement => {
          const measurementName = measurement[MEASUREMENT_NAME_COLUMN];
          if (!measurementName) {
            return;
          }

          measurementProperties.forEach(property => {
            const suffix = measurementColumnLabelSuffix[property];
            const columnName = formatMeasurementColumnName(measurementName, suffix);
            let value = measurement[property] ?? '';
            if(!value) {
              // If the value is empty, skip adding it to the column this is considering
              // that not all measurements will have high limit, low limit, etc.
              return;
            }

            if (property === MEASUREMENT_NAME_COLUMN) {
              // For the measurement name column, use the measurement values if available
              value = measurement[MeasurementProperties.MEASUREMENT] ?? '';
            }
            const fieldType = this.findFieldType(columnName, value);
            // normalize the column name to match the previous steps as the current step metadata will be already added
            this.addValueToColumn(columns, columnName, value, fieldType, true, -1);
          });
        });
      }

      // At the end of processing each step, ensure all columns have the same length
      // by normalizing the columns.
      this.normalizeColumns(columns);

    });

    return columns;
  }

  /**
   * Adds a value to a column, creating the column if it doesn't exist.
   * Optionally normalizes columns to the same length before adding.
   */
  private addValueToColumn(
    columns: Array<{ name: string; values: string[]; type: FieldType }>,
    field: string,
    value: string,
    type: FieldType = FieldType.string,
    normalizeOnAdd = false,
    relativeLengthToNormalize = 0
  ): void {
    let column = columns.find(c => c.name === field);

    if (!column) {
      column = { name: field, values: [], type };
      columns.push(column);
      if (normalizeOnAdd) {
        this.normalizeColumns(columns, relativeLengthToNormalize);
      }
    }
    column.values.push(value);
  }

  /**
   * Ensures all columns have the same number of values by filling with empty strings.
   * @param columns Columns to normalize.
   * @param relativeLength Additional length to add to the maximum column length.
   */
  private normalizeColumns(
    columns: Array<{ name: string; values: string[]; type: FieldType }>,
    relativeLength = 0
  ): void {
    const targetLength = Math.max(0, ...columns.map(c => c.values.length)) + relativeLength;
    columns.forEach(col => {
      const missing = targetLength - col.values.length;
      if (missing > 0) {
        col.values.push(...Array(missing).fill(''));
      }
    });
  }

  private convertStepPropertyToString(field: string, value: any): string {
    if (value === undefined || value === null) {
        return '';
    }
    switch (field) {
        case StepsPropertiesOptions.PROPERTIES:
        case StepsPropertiesOptions.INPUTS:
        case StepsPropertiesOptions.OUTPUTS:
        case StepsPropertiesOptions.DATA:
            return value !== null ? JSON.stringify(value) : '';
        case StepsPropertiesOptions.STATUS:
            return (value as any)?.statusType || '';
        default:
            return value.toString();
    }
}

  private findFieldType(field: string, value: string): FieldType {
    const isTimeField =
      field === StepsPropertiesOptions.UPDATED_AT ||
      field === StepsPropertiesOptions.STARTED_AT;
    if(isTimeField) {
      return FieldType.time;
    }
    
    const isValueANumber = !isNaN(Number(value)) && value.trim() !== '';
    if (isValueANumber) {
      return FieldType.number;
    }
    
    return FieldType.string;
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

      if (this.previousResultsQuery !== resultsQuery) {
        this.stepsPath = await this.getStepPathsLookupValues(options?.scopedVars!, query.partNumberQueryInSteps, resultsQuery)
        this.stepsPathChangeCallback?.();
      }
      this.previousResultsQuery = resultsQuery;

      const stepsQuery = query.queryBySteps ? transformComputedFieldsQuery(
        this.templateSrv.replace(query.queryBySteps, options?.scopedVars),
        this.resultsComputedDataFields
      ) : undefined;

      let responseData: QueryStepsResponse;
      responseData = await this.queryStepsInBatches(
        stepsQuery,
        defaultStepsQuery.orderBy,
        [StepsPropertiesOptions.NAME as StepsProperties],
        query.stepsTake,
        defaultStepsQuery.descending,
        resultsQuery,
      );

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
