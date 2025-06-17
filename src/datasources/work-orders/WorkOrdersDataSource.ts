import { DataSourceInstanceSettings, DataQueryRequest, DataFrameDTO, TestDataSourceResponse, LegacyMetricFindQueryOptions, MetricFindValue } from '@grafana/data';
import { BackendSrv, TemplateSrv, getBackendSrv, getTemplateSrv } from '@grafana/runtime';
import { DataSourceBase } from 'core/DataSourceBase';
import { WorkOrdersQuery, OutputType, WorkOrderPropertiesOptions, OrderByOptions, WorkOrder, WorkOrderProperties, QueryWorkOrdersRequestBody, WorkOrdersResponse, WorkOrdersVariableQuery } from './types';
import { QueryBuilderOption, QueryResponse } from 'core/types';
import { transformComputedFieldsQuery, ExpressionTransformFunction } from 'core/query-builder.utils';
import { QueryBuilderOperations } from 'core/query-builder.constants';
import { getVariableOptions, queryInBatches } from 'core/utils';
import { QUERY_WORK_ORDERS_MAX_TAKE, QUERY_WORK_ORDERS_REQUEST_PER_SECOND } from './constants/QueryWorkOrders.constants';
import { WorkspaceUtils } from 'shared/workspace.utils';
import { UsersUtils } from 'shared/users.utils';

export class WorkOrdersDataSource extends DataSourceBase<WorkOrdersQuery> {
  constructor(
    readonly instanceSettings: DataSourceInstanceSettings,
    readonly backendSrv: BackendSrv = getBackendSrv(),
    readonly templateSrv: TemplateSrv = getTemplateSrv()
  ) {
    super(instanceSettings, backendSrv, templateSrv);
    this.workspaceUtils = new WorkspaceUtils(this.instanceSettings, this.backendSrv);
    this.usersUtils = new UsersUtils(this.instanceSettings, this.backendSrv);
  }

  baseUrl = `${this.instanceSettings.url}/niworkorder/v1`;
  queryWorkOrdersUrl = `${this.baseUrl}/query-workorders`;
  workspaceUtils: WorkspaceUtils;
  usersUtils: UsersUtils;
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

  readonly globalVariableOptions = (): QueryBuilderOption[] => getVariableOptions(this);

  async runQuery(query: WorkOrdersQuery, options: DataQueryRequest): Promise<DataFrameDTO> {
    if (query.queryBy) {
      query.queryBy = transformComputedFieldsQuery(
        this.templateSrv.replace(query.queryBy, options.scopedVars),
        this.workordersComputedDataFields
      );
    }

    if (query.outputType === OutputType.Properties) {
      return this.processWorkOrdersQuery(query);
    } else {
      const totalCount = await this.queryWorkordersCount(query.queryBy);
      return {
        refId: query.refId,
        name: query.refId,
        fields: [{ name: query.refId, values: [totalCount] }],
      };
    }
  }

  shouldRunQuery(query: WorkOrdersQuery): boolean {
    return true;
  }

  readonly workordersComputedDataFields = new Map<string, ExpressionTransformFunction>(
    Object.values(WorkOrderProperties).map(field => [
      field.field,
      this.isTimeField(field.value) ? this.timeFieldsQuery(field.field) : this.multipleValuesQuery(field.field),
    ])
  );

  async metricFindQuery(
    query: WorkOrdersVariableQuery,
    options: LegacyMetricFindQueryOptions
  ): Promise<MetricFindValue[]> {    
    const filter = query.queryBy? 
      transformComputedFieldsQuery(
        this.templateSrv.replace(query.queryBy, options.scopedVars),
        this.workordersComputedDataFields
      )
      : undefined;

    const metadata = await this.queryWorkordersData(
      filter,
      [WorkOrderPropertiesOptions.ID, WorkOrderPropertiesOptions.NAME],
      query.orderBy,
      query.descending,
      query.take
    );

    return metadata ? metadata.map(frame => ({ text: `${frame.name} (${frame.id})`, value: frame.id })) : [];
  }

  async processWorkOrdersQuery(query: WorkOrdersQuery): Promise<DataFrameDTO> {
    const workspaces = await this.workspaceUtils.getWorkspaces();
    const users = await this.usersUtils.getUsers();
    const workOrders: WorkOrder[] = await this.queryWorkordersData(
      query.queryBy,
      query.properties,
      query.orderBy,
      query.descending,
      query.take
    );

    const mappedFields = query.properties?.map(property => {
      const field = WorkOrderProperties[property];
      const fieldName = field.label;

      const fieldValue = workOrders.map(workOrder => {
        switch (field.value) {
          case WorkOrderPropertiesOptions.WORKSPACE:
              const workspace = workspaces.get(workOrder.workspace);
              return workspace ? workspace.name : workOrder.workspace;
          case WorkOrderPropertiesOptions.ASSIGNED_TO:
          case WorkOrderPropertiesOptions.CREATED_BY:
          case WorkOrderPropertiesOptions.REQUESTED_BY:
          case WorkOrderPropertiesOptions.UPDATED_BY:
            const userId = workOrder[field.field] as string ?? '';
            const user = users.get(userId);
            return user ? UsersUtils.getUserFullName(user) : userId;
          case WorkOrderPropertiesOptions.PROPERTIES:
              const properties = workOrder.properties || {};
              return JSON.stringify(properties);
          default:
            return workOrder[field.field] ?? '';
        }
      });

      return { name: fieldName, values: fieldValue };
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
    descending?: boolean,
    take?: number
  ): Promise<WorkOrder[]> {
    const queryRecord = async (currentTake: number, token?: string): Promise<QueryResponse<WorkOrder>> => {
      const body = {
        filter,
        projection,
        orderBy,
        descending,
        take: currentTake,
        continationToken: token,
        returnCount: true,
      };
      const response = await this.queryWorkOrders(body);

      return {
        data: response.workOrders,
        continuationToken: response.continuationToken,
        totalCount: response.totalCount,
      };
    };

    const batchQueryConfig = {
      maxTakePerRequest: QUERY_WORK_ORDERS_MAX_TAKE,
      requestsPerSecond: QUERY_WORK_ORDERS_REQUEST_PER_SECOND,
    };
    const response = await queryInBatches(queryRecord, batchQueryConfig, take);

    return response.data;
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

  protected multipleValuesQuery(field: string): ExpressionTransformFunction {
    return (value: string, operation: string, _options?: any) => {
      const isMultiSelect = this.isMultiSelectValue(value);
      const valuesArray = this.getMultipleValuesArray(value);
      const logicalOperator = this.getLogicalOperator(operation);

      return isMultiSelect
        ? `(${valuesArray.map(val => `${field} ${operation} "${val}"`).join(` ${logicalOperator} `)})`
        : `${field} ${operation} "${value}"`;
    };
  }

  protected timeFieldsQuery(field: string): ExpressionTransformFunction {
    return (value: string, operation: string): string => {
      const formattedValue = value === '${__now:date}' ? new Date().toISOString() : value;
      return `${field} ${operation} "${formattedValue}"`;
    };
  }

  /**
   * Combines two filter strings into a single query filter using the '&&' operator.
   * Filters that are undefined or empty are excluded from the final query.
   */
  protected buildQueryFilter(filterA?: string, filterB?: string): string | undefined {
    const filters = [filterA, filterB].filter(Boolean);
    return filters.length > 0 ? filters.join(' && ') : undefined;
  }

  private isMultiSelectValue(value: string): boolean {
    return value.startsWith('{') && value.endsWith('}');
  }

  private getMultipleValuesArray(value: string): string[] {
    return value.replace(/({|})/g, '').split(',');
  }

  private getLogicalOperator(operation: string): string {
    return operation === QueryBuilderOperations.EQUALS.name ? '||' : '&&';
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
      WorkOrderPropertiesOptions.DUE_DATE
    ];

    return timeFields.includes(field);
  }
}
