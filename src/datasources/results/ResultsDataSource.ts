import {
  DataFrameDTO,
  DataQueryRequest,
  DataSourceInstanceSettings,
  FieldType,
  TestDataSourceResponse,
} from '@grafana/data';
import { BackendSrv, TemplateSrv, getBackendSrv, getTemplateSrv } from '@grafana/runtime';
import { DataSourceBase } from 'core/DataSourceBase';
import {
  OutputType,
  QueryResultsResponse,
  ResultsProperties,
  ResultsPropertiesOptions,
  ResultsQuery,
  ResultsResponseProperties,
} from './types';

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
    useTimeRange: false,
  };

  async queryResults(
    orderBy: string,
    projection: ResultsProperties[],
    recordCount = 1000,
    descending = false,
    returnCount = false
  ): Promise<QueryResultsResponse> {
    return await this.post<QueryResultsResponse>(`${this.queryResultsUrl}`, {
      orderBy: orderBy,
      descending: descending,
      projection: projection,
      take: recordCount,
      returnCount: returnCount,
    }).then(response => response);
  }

  async runQuery(query: ResultsQuery, { range }: DataQueryRequest): Promise<DataFrameDTO> {
    const responseData = await this.queryResults(
      query.orderBy!,
      query.properties!,
      query.recordCount,
      query.descending,
      true
    );

    if (query.outputType === OutputType.Data) {
      const testResultsResponse = responseData.results;
      const selectedFields =
        query.properties?.filter((field: ResultsProperties) => Object.keys(testResultsResponse[0]).includes(field)) ||
        [];
      const fields = selectedFields.map(field => {
        const fieldType =
          field === ResultsPropertiesOptions.UPDATED_AT || field === ResultsPropertiesOptions.STARTED_AT
            ? FieldType.time
            : FieldType.string;
        const values = testResultsResponse.map(data => data[field as unknown as keyof ResultsResponseProperties]);

        if (
          field === ResultsPropertiesOptions.PROPERTIES ||
          field === ResultsPropertiesOptions.STATUS ||
          field === ResultsPropertiesOptions.STATUS_SUMMARY
        ) {
          return { name: field, values: values.map(value => JSON.stringify(value)), type: fieldType };
        }
        return { name: field, values, type: fieldType };
      });

      return {
        refId: query.refId,
        fields: fields,
      };
    } else {
      console.log(responseData.totalCount);
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
    // TODO: Implement a health and authentication check
    await this.backendSrv.get(this.baseUrl + '/');
    return { status: 'success', message: 'Data source connected and authentication successful!' };
  }
}
