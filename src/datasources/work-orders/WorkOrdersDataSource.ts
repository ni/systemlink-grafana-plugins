import { DataFrameDTO, DataQueryRequest, DataSourceInstanceSettings, TestDataSourceResponse } from '@grafana/data';
import { BackendSrv, TemplateSrv, getBackendSrv, getTemplateSrv } from '@grafana/runtime';
import { DataSourceBase } from 'core/DataSourceBase';
import { OutputType, QueryWorkOrdersRequestBody, WorkOrder, WorkOrdersQuery, WorkOrdersResponse } from './types';

export class WorkOrdersDataSource extends DataSourceBase<WorkOrdersQuery> {
  constructor(
    readonly instanceSettings: DataSourceInstanceSettings,
    readonly backendSrv: BackendSrv = getBackendSrv(),
    readonly templateSrv: TemplateSrv = getTemplateSrv()
  ) {
    super(instanceSettings, backendSrv, templateSrv);
  }

  baseUrl = `${this.instanceSettings.url}/niworkorder/v1`;
  queryWorkOrdersUrl = `${this.baseUrl}/query-workorders`;

  defaultQuery = {
    outputType: OutputType.Properties,
  };

  async runQuery(query: WorkOrdersQuery, options: DataQueryRequest): Promise<DataFrameDTO> {
    if (query.outputType === OutputType.Properties) {
      return this.processWorkOrdersQuery(query);
    } else {
      const totalCount = await this.queryWorkordersCount(query.queryBy);

      return {
        refId: query.refId,
        name: query.refId,
        fields: [{ name: 'Total count', values: [totalCount] }],
      };
    }
  }

  shouldRunQuery(query: WorkOrdersQuery): boolean {
    return true;
  }

  async processWorkOrdersQuery(query: WorkOrdersQuery): Promise<DataFrameDTO> {
    const workOrders: WorkOrder[] = await this.queryWorkordersData(query.queryBy);

    // TODO: Update selected fields based on the properties selected in the query
    const selectedFields = ['name'];

    const mappedFields = selectedFields.map((field) => {
      const fieldName = field;
      const fieldValue = workOrders.map(data => data[field as unknown as keyof WorkOrder]);
      return { name: fieldName, values: fieldValue };
    });

    return { refId: query.refId, fields: mappedFields };
  }

  async queryWorkordersData(filter = ''): Promise<WorkOrder[]> {
    const body = {
      filter
    };

    const response = await this.queryWorkOrders(body);
    return response.workOrders;
  }

  async queryWorkordersCount(filter = ''): Promise<number> {
    const body = {
      filter,
      take: 0,
      returnCount: true,
    };

    const response = await this.queryWorkOrders(body);
    return response.totalCount ?? 0;
  }

  async queryWorkOrders(body: QueryWorkOrdersRequestBody): Promise<WorkOrdersResponse> {
    try {
      let response = await this.post<WorkOrdersResponse>(this.queryWorkOrdersUrl, body);
      return response;
    } catch (error) {
      throw new Error(`An error occurred while querying workorders: ${error}`);
    }
  }

  async testDatasource(): Promise<TestDataSourceResponse> {
    await this.post(this.queryWorkOrdersUrl, { take: 1 });
    return { status: 'success', message: 'Data source connected and authentication successful!' };
  }
}
