import { DataSourceInstanceSettings, DataQueryRequest, DataFrameDTO, FieldType, TestDataSourceResponse, LegacyMetricFindQueryOptions, MetricFindValue, AppEvents } from '@grafana/data';
import { BackendSrv, TemplateSrv, getBackendSrv, getTemplateSrv } from '@grafana/runtime';
import { DataSourceBase } from 'core/DataSourceBase';
import { WorkOrdersQuery, OutputType, WorkOrderPropertiesOptions, OrderByOptions, WorkOrder, WorkOrderProperties, QueryWorkOrdersRequestBody, WorkOrdersResponse, WorkOrdersVariableQuery } from './types';
import { QueryBuilderOption, QueryResponse, Workspace } from 'core/types';
import { transformComputedFieldsQuery, ExpressionTransformFunction } from 'core/query-builder.utils';
import { QueryBuilderOperations } from 'core/query-builder.constants';
import { getVariableOptions, queryInBatches } from 'core/utils';
import { QUERY_WORK_ORDERS_MAX_TAKE, QUERY_WORK_ORDERS_REQUEST_PER_SECOND } from './constants/QueryWorkOrders.constants';
import { WorkspaceUtils } from 'shared/workspace.utils';
import { UsersUtils } from 'shared/users.utils';
import { extractErrorInfo } from 'core/errors';
import { User } from 'shared/types/QueryUsers.types';
import { TAKE_LIMIT } from './constants/QueryEditor.constants';
import { TableProperties } from 'datasources/data-frame/types';
import { lastValueFrom } from 'rxjs';

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
  errorTitle = '';
  errorDescription = '';
  workspaceUtils: WorkspaceUtils;
  usersUtils: UsersUtils;
  defaultQuery = {
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
    await this.exportTableData(options);
    if (query.queryBy) {
      query.queryBy = transformComputedFieldsQuery(
        this.templateSrv.replace(query.queryBy, options.scopedVars),
        this.workordersComputedDataFields
      );
    }

    if (query.outputType === OutputType.Properties && this.isPropertiesValid(query) && this.isTakeValid(query)) {
      return this.processWorkOrdersQuery(query);
    } else if (query.outputType === OutputType.TotalCount) {
      const totalCount = await this.queryWorkordersCount(query.queryBy);
      return {
        refId: query.refId,
        name: query.refId,
        fields: [{ name: query.refId, values: [totalCount] }],
      };
    }

    return {
      refId: query.refId,
      name: query.refId,
      fields: [],
    };
  }
  async getTableProperties(id?: string): Promise<TableProperties | void> {
    return await this.get<TableProperties>(`${this.instanceSettings.url}/nidataframe/v1/tables/${id}`)
      .catch(error => {
        console.error( error);
      });
  }

  async exportTableData(_options: DataQueryRequest): Promise<void> {
    const variables = this.templateSrv.getVariables() as any[];
    // eslint-disable-next-line no-console
    console.log('Exporting table data with variables:', variables);
    const columnsCount = variables.find(variable => variable.name === 'columnsCount')?.current?.value ?? 2;
    const tableId = variables.find(variable => variable.name === 'tableId')?.current?.value ?? '674fcad3ac23ce8dd0522141';
    const take = variables.find(variable => variable.name === 'take')?.current?.value ?? 1000;
    // eslint-disable-next-line no-console
    console.log(`Exporting table data with take: ${take}, columnsCount: ${columnsCount}, tableId: ${tableId}`);

    // const tableId = '674fcad3ac23ce8dd0522141'//'679807121535de7b50d65325''674fcad3ac23ce8dd0522141'
    const startTime = new Date().getTime();
    const exportUrl = `${this.instanceSettings.url}/nidataframe/v1/tables/${tableId}/export-data`;
    const properties = await this.getTableProperties(tableId);
    const columns = properties?.columns.map(col => col.name).slice(0,columnsCount) ?? [];

    const res = await lastValueFrom(this.backendSrv.fetch({
      url: exportUrl,
      data: JSON.stringify({
        columns: columns,
        destination: "DOWNLOAD_LINK",
        responseFormat: "CSV",
        take
      }),
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
    }))
    .catch(error => {
      console.error( error);
    });

      const locationHeader = res!.headers.get('Location'); // ✅ Will work ONLY if server exposes it
      const regex = /(?<=nidataframe\/v1\/table-exports\/)[^\/]+/;
      const match = locationHeader!.match(regex);
      // eslint-disable-next-line no-console
      console.log(match![0]);
      const downloadUrl = `${this.instanceSettings.url}/nidataframe/v1/table-exports/${match![0]}`;

      const csvText = await this.get<string>(downloadUrl);
      // Measure byte length (UTF-8)
      const encoder = new TextEncoder();
      const byteArray = encoder.encode(csvText);
      const sizeInBytes = byteArray.length;

      // eslint-disable-next-line no-console
      console.log(`CSV size: ${sizeInBytes} bytes`);
      //console.log(csvText); // Output the CSV content to console or handle it as needed

      // const parsed = Papa.parse(csvText, {
      //   header: true, // or false if you want raw array format
      //   skipEmptyLines: true
      // });
      // // eslint-disable-next-line no-console
      // console.log('Parsed data:', parsed.data);      // ✅ Array of objects
      // // eslint-disable-next-line no-console
      // console.log('Parsing errors:', parsed.errors);
      const endTime = new Date().getTime();
      // eslint-disable-next-line no-console
      console.log(`Exported table data in ${endTime - startTime} ms`);
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
    const variableQuery = this.prepareQuery(query);
    if (!this.isTakeValid(variableQuery)) {
      return [];
    }    
    const filter = variableQuery.queryBy? 
      transformComputedFieldsQuery(
        this.templateSrv.replace(variableQuery.queryBy, options.scopedVars),
        this.workordersComputedDataFields
      )
      : undefined;

    const metadata = await this.queryWorkordersData(
      filter,
      [WorkOrderPropertiesOptions.ID, WorkOrderPropertiesOptions.NAME],
      variableQuery.orderBy,
      variableQuery.descending,
      variableQuery.take
    );

    const workOrderOptions = metadata
      ? metadata.map(frame => ({ text: `${frame.name} (${frame.id})`, value: frame.id }))
      : [];
    return workOrderOptions.sort((a, b) => a.text.localeCompare(b.text));
  }

  async processWorkOrdersQuery(query: WorkOrdersQuery): Promise<DataFrameDTO> {
    const workspaces = await this.loadWorkspaces();
    const users = await this.loadUsers();
    const workOrders: WorkOrder[] = await this.queryWorkordersData(
      query.queryBy,
      query.properties,
      query.orderBy,
      query.descending,
      query.take
    );

    const mappedFields = query.properties?.map(property => {
      const field = WorkOrderProperties[property];
      const fieldType = FieldType.string;
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
              return Object.keys(properties).length > 0 ? JSON.stringify(properties) : '';
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

  public async loadWorkspaces(): Promise<Map<string, Workspace>> {
    try {
      return await this.workspaceUtils.getWorkspaces();
    } catch (error) {
      if (!this.errorTitle) {
        this.handleDependenciesError(error);
      }
      return new Map<string, Workspace>();
    }
  }

  public async loadUsers(): Promise<Map<string, User>> {
    try {
      return await this.usersUtils.getUsers();
    } catch (error) {
      if (!this.errorTitle) {
        this.handleDependenciesError(error);
      }
      return new Map<string, User>();
    }
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
      let response = await this.post<WorkOrdersResponse>(
        this.queryWorkOrdersUrl,
        body,
        { showErrorAlert: false } // suppress default error alert since we handle errors manually
      );
      return response;
    } catch (error) {
      const errorDetails = extractErrorInfo((error as Error).message);
      let errorMessage: string;
      switch (errorDetails.statusCode) {
        case '':
          errorMessage = 'The query failed due to an unknown error.';
          break;
        case '404':
          errorMessage = 'The query to fetch workorders failed because the requested resource was not found. Please check the query parameters and try again.';
          break;
        case '429':
          errorMessage = 'The query to fetch workorders failed due to too many requests. Please try again later.';
          break;
        case '504':
          errorMessage = 'The query to fetch workorders experienced a timeout error. Narrow your query with a more specific filter and try again.';
          break;
        default:
          errorMessage = `The query failed due to the following error: (status ${errorDetails.statusCode}) ${errorDetails.message}.`;
          break;
      }

      this.appEvents?.publish?.({
        type: AppEvents.alertError.name,
        payload: ['Error during workorders query', errorMessage],
      });

      throw new Error(errorMessage);
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
    await this.post(
      this.queryWorkOrdersUrl,
      { take: 1 },
      { showErrorAlert: false } // suppress default error alert since we handle errors manually
    );
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

  private handleDependenciesError(error: unknown): void {
    const errorDetails = extractErrorInfo((error as Error).message);
    this.errorTitle = 'Warning during workorders query';
    switch (errorDetails.statusCode) {
      case '404':
        this.errorDescription = 'The query builder lookups failed because the requested resource was not found. Please check the query parameters and try again.';
        break;
      case '429':
        this.errorDescription = 'The query builder lookups failed due to too many requests. Please try again later.';
        break;
      case '504':
        this.errorDescription = `The query builder lookups experienced a timeout error. Some values might not be available. Narrow your query with a more specific filter and try again.`;
        break;
      default:
        this.errorDescription = errorDetails.message
          ? `Some values may not be available in the query builder lookups due to the following error: ${errorDetails.message}.`
          : 'Some values may not be available in the query builder lookups due to an unknown error.';
        break;
    }
  }

  private isTakeValid(query: WorkOrdersQuery): boolean {
    return query.take !== undefined && query.take >= 0 && query.take <= TAKE_LIMIT;
  }

  private isPropertiesValid(query: WorkOrdersQuery): boolean {
    return !!query.properties && query.properties.length > 0;
  }
}
