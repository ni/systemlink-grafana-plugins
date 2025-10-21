import { resultsProjectionLabelLookup, QueryResults, QueryResultsResponse, ResultsProperties, ResultsPropertiesOptions, ResultsResponseProperties, ResultsVariableQuery } from "datasources/results/types/QueryResults.types";
import { ResultsDataSourceBase } from "datasources/results/ResultsDataSourceBase";
import { DataQueryRequest, DataFrameDTO, FieldType, LegacyMetricFindQueryOptions, MetricFindValue, AppEvents, DataSourceInstanceSettings } from "@grafana/data";
import { OutputType } from "datasources/results/types/types";
import { defaultResultsQuery } from "datasources/results/defaultQueries";
import { ExpressionTransformFunction, multipleValuesQuery, timeFieldsQuery, transformComputedFieldsQuery } from "core/query-builder.utils";
import { ResultsQueryBuilderFieldNames } from "datasources/results/constants/ResultsQueryBuilder.constants";
import { TAKE_LIMIT } from "datasources/results/constants/QuerySteps.constants";
import { extractErrorInfo } from "core/errors";
import { getWorkspaceName } from "core/utils";
import { Workspace } from "core/types";
import { BackendSrv, getBackendSrv, getTemplateSrv, TemplateSrv } from "@grafana/runtime";

export class QueryResultsDataSource extends ResultsDataSourceBase {
  queryResultsUrl = this.baseUrl + '/v2/query-results';

  defaultQuery = defaultResultsQuery;

  private workspaceValues: Workspace[] = [];

  constructor(
    readonly instanceSettings: DataSourceInstanceSettings,
    readonly backendSrv: BackendSrv = getBackendSrv(),
    readonly templateSrv: TemplateSrv = getTemplateSrv()
  ) {
    super(instanceSettings, backendSrv, templateSrv);
    this.initWorkspacesValues();
  }

  async queryResults(
    filter?: string,
    orderBy?: string,
    projection?: ResultsProperties[],
    take?: number,
    descending?: boolean,
    returnCount = false
  ): Promise<QueryResultsResponse> {
    try {
      return await this.post<QueryResultsResponse>(
        `${this.queryResultsUrl}`,
        {
          filter,
          orderBy,
          descending,
          projection,
          take,
          returnCount,
        },
        { showErrorAlert: false },// suppress default error alert since we handle errors manually
      );
    } catch (error) {
      const errorDetails = extractErrorInfo((error as Error).message);
      let errorMessage: string;

      switch (errorDetails.statusCode) {
        case '':
          errorMessage = 'The query failed due to an unknown error.';
          break;
        case '404':
          errorMessage = 'The query to fetch results failed because the requested resource was not found. Please check the query parameters and try again.';
          break;
        case '429':
          errorMessage = 'The query to fetch results failed due to too many requests. Please try again later.';
          break;
        case '504':
          errorMessage = 'The query to fetch results experienced a timeout error. Narrow your query with a more specific filter and try again.';
          break;
        default:
          errorMessage = `The query failed due to the following error: (status ${errorDetails.statusCode}) ${errorDetails.message}.`;
          break;
      }

      this.appEvents?.publish?.({
        type: AppEvents.alertError.name,
        payload: ['Error during result query', errorMessage],
      });

      throw new Error(errorMessage);
    }
  }

  async runQuery(query: QueryResults, options: DataQueryRequest): Promise<DataFrameDTO> {
    if (query.outputType === OutputType.Data && !this.isQueryValid(query)) {
      return {
        refId: query.refId,
        fields: [],
      };
    }
    if (query.queryBy) {
      query.queryBy = transformComputedFieldsQuery(
        this.templateSrv.replace(query.queryBy, options.scopedVars),
        this.resultsComputedDataFields,
      );
    }

    const useTimeRangeFilter = this.getTimeRangeFilter(options, query.useTimeRange, defaultResultsQuery.useTimeRangeFor);

    let properties = query.properties;
    let recordCount = query.recordCount;
    if (query.outputType === OutputType.TotalCount) {
      properties = [];
      recordCount = 0;
    }

    const responseData = await this.queryResults(
      this.buildQueryFilter(query.queryBy, useTimeRangeFilter),
      defaultResultsQuery.orderBy,
      properties,
      recordCount,
      defaultResultsQuery.descending,
      true
    );

    if (query.outputType === OutputType.Data) {
      const results = responseData.results ;
      
      // Determine which fields to select based on query properties and available result fields
      const availableFields = results && results.length > 0 ? Object.keys(results[0]) : [];
      const selectedFields = (query.properties ?? []).filter((field) => availableFields.includes(field));

      // If no fields are available (empty results), fall back to the requested properties
      if (selectedFields.length === 0) {
        selectedFields.push(...(query.properties || []));
      }

      const fields = selectedFields.map((field) => {
        const isTimeField =
          field === ResultsPropertiesOptions.UPDATED_AT ||
          field === ResultsPropertiesOptions.STARTED_AT;
        const fieldType = isTimeField ? FieldType.time : FieldType.string;
        const values = results.map(
          (result) => result[field as keyof ResultsResponseProperties]
        );

        switch (field) {
          case ResultsPropertiesOptions.PROPERTIES:
          case ResultsPropertiesOptions.STATUS_TYPE_SUMMARY:
            return {
              name: resultsProjectionLabelLookup[field].label,
              values: values.map((value) =>
                value && (Object.keys(value).length > 0)
                  ? JSON.stringify(value)
                  : ''
              ),
              type: fieldType,
            };
          case ResultsPropertiesOptions.STATUS:
            return {
              name: resultsProjectionLabelLookup[field].label,
              values: values.map((v: any) => v?.statusType),
              type: fieldType,
            };
          case ResultsPropertiesOptions.WORKSPACE:
            return {
              name: resultsProjectionLabelLookup[field].label,
              values: values.map((workspaceId) => this.workspaceValues.length
                ? getWorkspaceName(this.workspaceValues, workspaceId as string)
                : workspaceId),
              type: fieldType,
            }
          default:
            return {
              name: resultsProjectionLabelLookup[field].label,
              values: values.map(value => value?.toString()),
              type: fieldType
            };
        }
      });

      return {
        refId: query.refId,
        name: query.refId,
        fields,
      };
    }

    return {
      refId: query.refId,
      fields: [{ name: query.refId, values: [responseData.totalCount] }],
    };
  }

  /**
   * A map linking each field name to its corresponding query transformation function.
   * It dynamically processes and formats query expressions based on the field type.
   */
  readonly resultsComputedDataFields = new Map<string, ExpressionTransformFunction>(
    Object.values(ResultsQueryBuilderFieldNames).map(field => [
      field,
      field === (ResultsQueryBuilderFieldNames.UPDATED_AT) || field === (ResultsQueryBuilderFieldNames.STARTED_AT)
        ? timeFieldsQuery(field)
        : multipleValuesQuery(field),
    ])
  );

  async metricFindQuery(query: ResultsVariableQuery, options?: LegacyMetricFindQueryOptions): Promise<MetricFindValue[]> {
    if (query.properties !== undefined && this.isTakeValid(query.resultsTake!)) {
      const filter = query.queryBy ? transformComputedFieldsQuery(
        this.templateSrv.replace(query.queryBy, options?.scopedVars),
        this.resultsComputedDataFields
      ) : undefined;

      const metadata = (await this.queryResults(
        filter,
        defaultResultsQuery.orderBy,
        [query.properties as ResultsProperties],
        query.resultsTake,
        defaultResultsQuery.descending
      )).results;

      if (metadata.length > 0) {
        const propertyKey = ResultsPropertiesOptions[query.properties as keyof typeof ResultsPropertiesOptions] as keyof ResultsResponseProperties;
        const values = metadata.map((data: ResultsResponseProperties) => data[propertyKey]).filter(value => value !== undefined && value !== null);
        const flattenedResults = this.flattenAndDeduplicate(values as string[]);
        const resultOptions =  flattenedResults.map(value => ({ text: String(value), value }));
        return resultOptions.sort((a, b) => a.text.localeCompare(b.text));
      }
    }
    return [];
  }

  private async initWorkspacesValues(): Promise<void> {
    const workspaces = await this.workspacesCache;
    this.workspaceValues = Array.from(workspaces.values());
  }

  private isTakeValid(value: number): boolean {
    return !isNaN(value) && value > 0 && value <= TAKE_LIMIT;
  }

  private isQueryValid(query: QueryResults): boolean {
    return query.properties!.length !== 0 && query.recordCount !== undefined
     
  }

  shouldRunQuery(query: QueryResults): boolean {
    return !query?.hide;
  }
}


