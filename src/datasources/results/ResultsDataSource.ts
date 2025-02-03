import { DataFrameDTO, DataQueryRequest, DataSourceInstanceSettings, FieldType, TestDataSourceResponse } from '@grafana/data';
import { BackendSrv, TemplateSrv, getBackendSrv, getTemplateSrv } from '@grafana/runtime';
import { DataSourceBase } from 'core/DataSourceBase';
import { OutputType, QueryResultsResponse, ResultsProperties, ResultsPropertiesOptions, ResultsQuery, ResultsResponseProperties } from './types';

export class ResultsDataSource extends DataSourceBase<ResultsQuery> {
  constructor(
    readonly instanceSettings: DataSourceInstanceSettings,
    readonly backendSrv: BackendSrv = getBackendSrv(),
    readonly templateSrv: TemplateSrv = getTemplateSrv()
  ) {
    super(instanceSettings, backendSrv, templateSrv);
  }

  baseUrl = this.instanceSettings.url + '/nitestmonitor';
  queryResultsUrl = this.baseUrl + '/v2/query-results';
  defaultQuery = {
    properties: [
      ResultsPropertiesOptions.PROGRAM_NAME,
      ResultsPropertiesOptions.PART_NUMBER,
      ResultsPropertiesOptions.SERIAL_NUMBER,
      ResultsPropertiesOptions.STATUS,
      ResultsPropertiesOptions.HOST_NAME,
      ResultsPropertiesOptions.STARTED_AT,
      ResultsPropertiesOptions.UPDATED_AT,
      ResultsPropertiesOptions.WORKSPACE
    ] as ResultsProperties[],
    outputType: OutputType.Data,
    recordCount: 1000,
  };

  private timeRange: { [key: string]: string } = {
    Started: 'startedAt',
    Updated: 'updatedAt',
  }
  private fromDateString = '${__from:date}';
  private toDateString = '${__to:date}';

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

  private getTimeRangeFilter(query: ResultsQuery, options: DataQueryRequest): string | undefined {
    if (!query.useTimeRange || query.useTimeRangeFor === undefined) {
      return undefined;
    }
  
    const timeRangeField = this.timeRange[query.useTimeRangeFor];
    const timeRangeFilter = `(${timeRangeField} > "${this.fromDateString}" && ${timeRangeField} < "${this.toDateString}")`;
  
    return this.templateSrv.replace(timeRangeFilter, options.scopedVars);
  }

  async runQuery(query: ResultsQuery, options: DataQueryRequest): Promise<DataFrameDTO> {
    const responseData = await this.queryResults(
      this.getTimeRangeFilter(query, options),
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

  shouldRunQuery(query: ResultsQuery): boolean {
    return true;
  }

  async testDatasource(): Promise<TestDataSourceResponse> {
    await this.get(this.baseUrl + '/v2/results?take=1');
    return { status: 'success', message: 'Data source connected and authentication successful!' };
  }
}
