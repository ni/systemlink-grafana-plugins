import { DataSourceInstanceSettings, DataQueryRequest, DataFrameDTO, FieldType, TestDataSourceResponse } from '@grafana/data';
import { BackendSrv, TemplateSrv, getBackendSrv, getTemplateSrv } from '@grafana/runtime';
import { DataSourceBase } from 'core/DataSourceBase';
import { WorkOrdersQuery, OutputType, WorkOrderPropertiesOptions, OrderByOptions, WorkOrder, WorkOrderProperties, QueryWorkOrdersRequestBody, WorkOrdersResponse } from './types';
import { Users } from 'shared/Users';

export class WorkOrdersDataSource extends DataSourceBase<WorkOrdersQuery> {
  readonly usersObj = new Users(this.instanceSettings, this.backendSrv)
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
    properties: [
      WorkOrderPropertiesOptions.NAME,
      WorkOrderPropertiesOptions.STATE,
      WorkOrderPropertiesOptions.REQUESTED_BY,
      WorkOrderPropertiesOptions.ASSIGNED_TO,
      WorkOrderPropertiesOptions.EARLIEST_START_DATE,
      WorkOrderPropertiesOptions.DUE_DATE,
      WorkOrderPropertiesOptions.UPDATED_AT,
    ] as WorkOrderPropertiesOptions[],
    orderBy: OrderByOptions.UPDATED_AT,
    descending: true,
    take: 1000,
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
    const workOrders: WorkOrder[] = await this.queryWorkordersData(
      query.queryBy,
      query.properties,
      query.orderBy,
      query.take,
      query.descending
    );

    const mappedFields = await Promise.all(query.properties?.map(async property => {
        const field = WorkOrderProperties[property];
        const fieldType = this.isTimeField(field.value) ? FieldType.time : FieldType.string;
        const fieldName = field.label;

        const fieldValues = await Promise.all(workOrders.map(async workOrder => {
            switch (field.value) {
              case WorkOrderPropertiesOptions.ASSIGNED_TO:
              case WorkOrderPropertiesOptions.CREATED_BY:
              case WorkOrderPropertiesOptions.REQUESTED_BY:
              case WorkOrderPropertiesOptions.UPDATED_BY:
                return await this.getUserName(workOrder[field.field] as string).then(name => name || workOrder[field.field] || '');
              default:
                return workOrder[field.field] ?? '';
            }
          })
        )
        return { name: fieldName, values: fieldValues, type: fieldType };
      }) ?? [])

    return {
      refId: query.refId,
      name: query.refId,
      fields: mappedFields ?? [],
    };
  }

  async getUserName(userId: string): Promise<string> {
    if (!userId) {
      return '';
    }
    const usersMap = await this.usersObj.usersMapCache;
    const userName = usersMap.get(userId);
    return userName ?? userId;
  }

  async queryWorkordersData(
    filter?: string,
    projection?: string[],
    orderBy?: string,
    take?: number,
    descending?: boolean
  ): Promise<WorkOrder[]> {
    const body = {
      filter,
      projection,
      orderBy,
      take,
      descending,
    };

    // TODO: query work orders in batches
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

  private isTimeField(field: WorkOrderPropertiesOptions): boolean {
    const timeFields = [
      WorkOrderPropertiesOptions.UPDATED_AT,
      WorkOrderPropertiesOptions.CREATED_AT,
      WorkOrderPropertiesOptions.EARLIEST_START_DATE,
      WorkOrderPropertiesOptions.DUE_DATE,
    ];
  
    return timeFields.includes(field);
  }
}

