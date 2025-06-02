import { DataSourceInstanceSettings, DataQueryRequest, DataFrameDTO, FieldType, TestDataSourceResponse } from '@grafana/data';
import { BackendSrv, TemplateSrv, getBackendSrv, getTemplateSrv } from '@grafana/runtime';
import { DataSourceBase } from 'core/DataSourceBase';
import { WorkOrdersQuery, OutputType, WorkOrderPropertiesOptions, OrderByOptions, WorkOrder, WorkOrderProperties, QueryWorkOrdersRequestBody, WorkOrdersResponse } from './types';
import { WorkOrdersQueryBuilderFieldNames } from './constants/WorkOrdersQueryBuilder.constants';
import { multipleValuesQuery, timeFieldsQuery } from 'core/utils';
import { transformComputedFieldsQuery, ExpressionTransformFunction } from 'core/query-builder.utils';

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
    if (query.queryBy) {
          query.queryBy = transformComputedFieldsQuery(
            this.templateSrv.replace(query.queryBy, options.scopedVars),
            this.workordersComputedDataFields,
          );
        }
      
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

  readonly workordersComputedDataFields = new Map<string, ExpressionTransformFunction>(
    Object.values(WorkOrdersQueryBuilderFieldNames).map(field => [
      field,
      this.isTimeField(field)
        ? timeFieldsQuery(field)
        : multipleValuesQuery(field)
    ])
  );

  async processWorkOrdersQuery(query: WorkOrdersQuery): Promise<DataFrameDTO> {
    const workOrders: WorkOrder[] = await this.queryWorkordersData(
      query.queryBy,
      query.properties,
      query.orderBy,
      query.take,
      query.descending
    );

    const mappedFields = query.properties?.map(property => {
      const field = WorkOrderProperties[property];
      const fieldType = this.isTimeField(field.value) ? FieldType.time : FieldType.string;
      const fieldName = field.label;

      // TODO: Add mapping for other field types
      const fieldValue = workOrders.map(data => data[field.field as unknown as keyof WorkOrder]);

      return { name: fieldName, values: fieldValue, type: fieldType };
    });

    return {
      refId: query.refId,
      name: query.refId,
      fields: mappedFields ?? [],
    };
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

  private isTimeField(field: WorkOrderPropertiesOptions|WorkOrdersQueryBuilderFieldNames): boolean {
    const timeFields = [
      WorkOrderPropertiesOptions.UPDATED_AT,
      WorkOrderPropertiesOptions.CREATED_AT,
      WorkOrderPropertiesOptions.EARLIEST_START_DATE,
      WorkOrderPropertiesOptions.DUE_DATE,
      WorkOrdersQueryBuilderFieldNames.UpdatedAt,
      WorkOrdersQueryBuilderFieldNames.CreatedAt,
      WorkOrdersQueryBuilderFieldNames.EarliestStartDate,
      WorkOrdersQueryBuilderFieldNames.DueDate
    ];
  
    return timeFields.includes(field);
  }
}

