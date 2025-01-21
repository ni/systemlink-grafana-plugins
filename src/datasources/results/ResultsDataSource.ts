import { DataFrameDTO, DataQueryRequest, DataSourceInstanceSettings, FieldType, TestDataSourceResponse } from '@grafana/data';
import { BackendSrv, TemplateSrv, getBackendSrv, getTemplateSrv } from '@grafana/runtime';
import { DataSourceBase } from 'core/DataSourceBase';
import { OutputType, QueryResultsResponse, ResultsProperties, ResultsPropertiesOptions, ResultsQuery, ResultsResponseProperties} from './types';

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

  private timeRange: { [key: string]: string } = {
    Started: 'startedAt',
    Updated: 'updatedAt',
  }
  private fromDateString = '${__from:date}';
  private toDateString = '${__to:date}';

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

  async queryResults( filter: string, orderBy: string, projection: ResultsProperties[], recordCount = 1000, descending = false, returnCount = false): Promise<QueryResultsResponse> {
    return await this.post<QueryResultsResponse>(`${this.queryResultsUrl}`, {
      filter,
      orderBy,
      descending,
      projection,
      take: recordCount,
      returnCount,
    }).then(response => response);
  }

  async runQuery(query: ResultsQuery, options: DataQueryRequest): Promise<DataFrameDTO> {
    let queryByFilter = '';

    if (query.useTimeRange && query.useTimeRangeFor) {
        const timeFilter = `(${this.timeRange[query.useTimeRangeFor]} > \"${this.fromDateString}\" && ${this.timeRange[query.useTimeRangeFor]} < \"${this.toDateString}\")`
        queryByFilter = queryByFilter ? `${queryByFilter} && ${timeFilter}` : timeFilter
    }
    const variableReplacedFilter = getTemplateSrv().replace(queryByFilter, options.scopedVars);

    const responseData = await this.queryResults( variableReplacedFilter, query.orderBy!, query.properties!, query.recordCount, query.descending, true );

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

        if ( field === ResultsPropertiesOptions.PROPERTIES || field === ResultsPropertiesOptions.STATUS_SUMMARY) {
          return { name: field, values: values.map(value => JSON.stringify(value)), type: fieldType };
        } else if (field === ResultsPropertiesOptions.STATUS) {
          return { name: field, values: values.map((value: any) => value?.statusType), type: fieldType };
        }
        return { name: field, values, type: fieldType };
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
    // TODO: Implement a health and authentication check
    await this.backendSrv.get(this.baseUrl + '/');
    return { status: 'success', message: 'Data source connected and authentication successful!' };
  }
}
