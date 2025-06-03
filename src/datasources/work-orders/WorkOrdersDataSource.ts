import { DataSourceInstanceSettings, DataQueryRequest, DataFrameDTO, FieldType, TestDataSourceResponse, LegacyMetricFindQueryOptions, MetricFindValue } from '@grafana/data';
import { BackendSrv, TemplateSrv, getBackendSrv, getTemplateSrv } from '@grafana/runtime';
import { DataSourceBase } from 'core/DataSourceBase';
import { WorkOrdersQuery, OutputType, WorkOrderPropertiesOptions, OrderByOptions, WorkOrder, WorkOrderProperties, QueryWorkOrdersRequestBody, WorkOrdersResponse, WorkOrdersVariableQuery } from './types';
import { QueryBuilderOption } from 'core/types';
import { WorkOrdersQueryBuilderFieldNames } from './constants/WorkOrdersQueryBuilder.constants';
import { transformComputedFieldsQuery, ExpressionTransformFunction } from 'core/query-builder.utils';
import { QueryBuilderOperations } from 'core/query-builder.constants';
import { getVariableOptions } from 'core/utils';

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
      this.isTimeField(field) ? this.timeFieldsQuery(field) : this.multipleValuesQuery(field),
    ])
  );

  async metricFindQuery(
    query: WorkOrdersVariableQuery,
    options: LegacyMetricFindQueryOptions
  ): Promise<MetricFindValue[]> {
    if (query.queryBy) {
      query.queryBy = transformComputedFieldsQuery(
        this.templateSrv.replace(query.queryBy, options.scopedVars),
        this.workordersComputedDataFields
      );
    }

    const metadata = await this.queryWorkordersData(
      query.queryBy,
      [WorkOrderPropertiesOptions.ID, WorkOrderPropertiesOptions.NAME],
      query.orderBy,
      query.descending,
      query.take
    );

    return metadata ? metadata.map(frame => ({ text: `${frame.name} (${frame.id})`, value: frame.id })) : [];
  }

  async processWorkOrdersQuery(query: WorkOrdersQuery): Promise<DataFrameDTO> {
    const workOrders: WorkOrder[] = await this.queryWorkordersData(
      query.queryBy,
      query.properties,
      query.orderBy,
      query.descending,
      query.take
    );

    const mappedFields = query.properties?.map(property => {
      const field = WorkOrderProperties[property];
      const fieldType = this.isTimeField(field.value) ? FieldType.time : FieldType.string;
      const fieldName = field.label;

      // TODO: Add mapping for other field types
      const fieldValue = workOrders.map(workOrder => {
        switch (field.value) {
          case WorkOrderPropertiesOptions.PROPERTIES:
            const properties = workOrder.properties || {};
            return JSON.stringify(properties);
          default:
            return workOrder[field.field] ?? '';
        }
      });

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
    descending?: boolean,
    take?: number
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

  private isTimeField(field: WorkOrderPropertiesOptions | WorkOrdersQueryBuilderFieldNames): boolean {
    const timeFields = [
      WorkOrderPropertiesOptions.UPDATED_AT,
      WorkOrderPropertiesOptions.CREATED_AT,
      WorkOrderPropertiesOptions.EARLIEST_START_DATE,
      WorkOrderPropertiesOptions.DUE_DATE,
      WorkOrdersQueryBuilderFieldNames.UpdatedAt,
      WorkOrdersQueryBuilderFieldNames.CreatedAt,
      WorkOrdersQueryBuilderFieldNames.EarliestStartDate,
      WorkOrdersQueryBuilderFieldNames.DueDate,
    ];

    return timeFields.includes(field);
  }
}
