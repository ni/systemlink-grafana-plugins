import { DataQueryRequest, DataFrameDTO, FieldType, LegacyMetricFindQueryOptions, MetricFindValue, ScopedVars, AppEvents } from '@grafana/data';
import { OutputType } from 'datasources/results/types/types';
import {
  stepsProjectionLabelLookup,
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
import { QueryResponse, Workspace } from 'core/types';
import { getWorkspaceName, queryInBatches } from 'core/utils';
import { MAX_PATH_TAKE_PER_REQUEST, QUERY_PATH_REQUEST_PER_SECOND } from 'datasources/results/constants/QueryStepPath.constants';
import { extractErrorInfo } from 'core/errors';
import { formatMeasurementColumnName, formatMeasurementValueColumnName, MEASUREMENT_NAME_COLUMN, MEASUREMENT_UNITS_COLUMN, measurementColumnLabelSuffix, MeasurementProperties, measurementProperties } from 'datasources/results/constants/stepMeasurements.constants';
export class QueryStepsDataSource extends ResultsDataSourceBase {
  queryStepsUrl = this.baseUrl + '/v2/query-steps';
  queryPathsUrl = this.baseUrl + '/v2/query-paths';

  defaultQuery = defaultStepsQuery;
  scopedVars: ScopedVars = {};

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
      } else if (errorDetails.statusCode === '504') {
        errorMessage = 'The query to fetch steps experienced a timeout error. Narrow your query with a more specific filter and try again.';
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
    this.scopedVars = options.scopedVars || {};
  
    if (query.outputType === OutputType.Data && !this.isQueryValid(query)) {
      return {
        refId: query.refId,
        fields: [],
      };
    }
    
    query.stepsQuery = this.transformQuery(query.stepsQuery, this.stepsComputedDataFields, options.scopedVars) || '';
    query.resultsQuery = this.transformQuery(query.resultsQuery, this.resultsComputedDataFields, options.scopedVars) || '';
    
    const transformStepsQuery = query.stepsQuery
      ? this.transformQuery(query.stepsQuery, this.stepsComputedDataFields, options.scopedVars)
      : undefined;
    const useTimeRangeFilter = this.getTimeRangeFilter(options, query.useTimeRange, defaultStepsQuery.useTimeRangeFor);
    query.stepsQuery = this.buildQueryFilter(transformStepsQuery, useTimeRangeFilter);

    const projection = query.showMeasurements
      ? [...new Set([...(query.properties || []), StepsPropertiesOptions.DATA])]
      : query.properties;

    if (query.outputType === OutputType.Data) {
      const responseData = await this.queryStepsInBatches(
        query.stepsQuery,
        defaultStepsQuery.orderBy,
        projection as StepsProperties[],
        query.recordCount,
        defaultStepsQuery.descending,
        query.resultsQuery,
        true
      );

      const stepsResponse = responseData.steps;
      const stepResponseKeys = stepsResponse && stepsResponse.length > 0 ?  new Set(Object.keys(stepsResponse[0])) : new Set<string>();
      const selectedFields = (query.properties || []).filter(field => stepResponseKeys.has(field));
      if (selectedFields.length === 0) {
        // If no fields are available, fall back to the requested properties
        const properties = query.properties?.map(property => stepsProjectionLabelLookup[property].label) as StepsProperties[];
        selectedFields.push(...(properties || []));
      }

      const fields = await this.processFields(selectedFields, stepsResponse, query.showMeasurements || false);
      return {
        refId: query.refId,
        name: query.refId,
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

  async getStepPaths(resultsQuery: string): Promise<string[]> {
    if (resultsQuery) {
      const query = this.transformQuery(resultsQuery, this.resultsComputedDataFields, this.scopedVars);
      const stepPaths = await this.getStepPathsLookupValues(query!);
      return  this.flattenAndDeduplicate(stepPaths);
    }
    return [];
  }

  private async getStepPathsLookupValues(transformedResultsQuery: string): Promise<string[]> {
    let stepPathValues: string[];
    try {
      const stepPathResponse = await this.loadStepPaths(transformedResultsQuery);
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
    transformedResultsQuery?: string
  ): Promise<QueryStepPathsResponse> {
    const programNames = await this.queryResultsValues(ResultsQueryBuilderFieldNames.PROGRAM_NAME, transformedResultsQuery);
    if(programNames.length === 0) {
      return { paths: [] };
    }

    const programNameQuery = this.buildQueryWithOrOperator(ResultsQueryBuilderFieldNames.PROGRAM_NAME, programNames);
    return await this.queryStepPathInBatches(
      programNameQuery,
      [StepsPathProperties.path],
      MAX_PATH_TAKE_PER_REQUEST,
      true
    );
  }

  private async processFields(
    selectedFields: StepsProperties[],
    stepsResponse: StepsResponseProperties[],
    showMeasurements: boolean
  ): Promise<Array<{ name: string; values: string[]; type: FieldType; }>> {
    const columns: Array<{ name: string; values: string[]; type: FieldType }> = [];
    const workspacesCache = await this.workspacesCache;
    const workspaceValues = Array.from(workspacesCache.values());
    if (stepsResponse.length === 0) {
      return selectedFields.map(field => ({
        name: field,
        values: [],
        type: this.findFieldType(field, '')
      }))
    }
  
    stepsResponse.forEach(step => {
      // Process selected step fields
      selectedFields.forEach(field => {
        const fieldName = stepsProjectionLabelLookup[field].label;
        const value = this.convertStepPropertyToString(field, step[field], workspaceValues);
        const fieldType = this.findFieldType(field, value);
        this.addValueToColumn(columns, fieldName, value, fieldType);
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
            let columnName = formatMeasurementColumnName(measurementName, suffix);
            let value = measurement[property] ?? '';
            if(!value) {
              // If the value is empty, skip adding it to the column this is considering
              // that not all measurements will have high limit, low limit, etc.
              return;
            }

            if (property === MEASUREMENT_NAME_COLUMN) {
              // For the measurement name column, format the column name with units if available
              columnName = formatMeasurementValueColumnName(measurementName, measurement[MEASUREMENT_UNITS_COLUMN] || '');
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

  private convertStepPropertyToString(field: string, value: any, workspaceCache: Workspace[]): string {
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
        case StepsPropertiesOptions.WORKSPACE:
            const workspaceId = value as string;
            return workspaceCache.length ? getWorkspaceName(workspaceCache, workspaceId) : workspaceId;
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
  private transformQuery(queryField: string | undefined, computedDataFields: Map<string, ExpressionTransformFunction>, scopedVars?: ScopedVars): string | undefined {
    return queryField
      ? transformComputedFieldsQuery(
        this.templateSrv.replace(queryField, scopedVars),
        computedDataFields
      )
      : undefined;
  }

  async metricFindQuery(query: StepsVariableQuery, options?: LegacyMetricFindQueryOptions): Promise<MetricFindValue[]> {
    this.scopedVars = options?.scopedVars || {};
    if (query.queryByResults && this.isTakeValid(query.stepsTake!)) {
      const resultsQuery = this.transformQuery(query.queryByResults, this.resultsComputedDataFields, options?.scopedVars!) || '';

      const stepsQuery = this.transformQuery(query.queryBySteps, this.resultsComputedDataFields, options?.scopedVars!);

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

  private isQueryValid(query: QuerySteps): boolean {
    return query.resultsQuery !== '' && query.recordCount !== undefined && query.properties!.length > 0;
  }

  shouldRunQuery(_: QuerySteps): boolean {
    return true;
  }
}
