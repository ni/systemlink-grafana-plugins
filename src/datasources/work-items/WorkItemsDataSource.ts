import {
  AppEvents,
  DataFrameDTO,
  DataQueryRequest,
  DataSourceInstanceSettings,
  FieldType,
  ScopedVars,
  TestDataSourceResponse,
} from '@grafana/data';
import { BackendSrv, TemplateSrv, getBackendSrv, getTemplateSrv } from '@grafana/runtime';
import { DataSourceBase } from 'core/DataSourceBase';
import { QueryBuilderOption, QueryResponse, Workspace } from 'core/types';
import { extractErrorInfo } from 'core/errors';
import { ProductUtils } from 'shared/product.utils';
import { ProductPartNumberAndName } from 'shared/types/QueryProducts.types';
import { SystemUtils } from 'shared/system.utils';
import { SystemAlias } from 'shared/types/QuerySystems.types';
import { UsersUtils } from 'shared/users.utils';
import { User } from 'shared/types/QueryUsers.types';
import { WorkspaceUtils } from 'shared/workspace.utils';
import {
  OrderByOptions,
  OutputType,
  QueryWorkItemsRequest,
  QueryWorkItemsResponse,
  WorkItem,
  WorkItemPropertiesOptions,
  WorkItemsQuery,
  WorkItemTypeOptions,
} from './types';
import { WorkItemProperties } from './constants/QueryEditor.constants';
import {
  ExpressionTransformFunction,
  multipleValuesQuery,
  timeFieldsQuery,
  transformComputedFieldsQuery,
} from 'core/query-builder.utils';
import { queryInBatches } from 'core/utils';
import {
  DEFAULT_TAKE,
  QUERY_WORK_ITEMS_MAXIMUM_TAKE,
  QUERY_WORK_ITEMS_REQUESTS_PER_SECOND,
  TAKE_LIMIT,
} from './constants';
import {
  WorkItemsQueryBuilderFieldNames,
  WorkItemsQueryBuilderFields,
} from './constants/WorkItemsQueryBuilder.constants';

export class WorkItemsDataSource extends DataSourceBase<WorkItemsQuery> {
  constructor(
    readonly instanceSettings: DataSourceInstanceSettings,
    readonly backendSrv: BackendSrv = getBackendSrv(),
    readonly templateSrv: TemplateSrv = getTemplateSrv()
  ) {
    super(instanceSettings, backendSrv, templateSrv);
    this.productUtils = new ProductUtils(instanceSettings, backendSrv);
    this.usersUtils = new UsersUtils(instanceSettings, backendSrv);
    this.workspaceUtils = new WorkspaceUtils(instanceSettings, backendSrv);
    this.systemUtils = new SystemUtils(instanceSettings, backendSrv);
  }

  baseUrl = `${this.instanceSettings.url}/niworkitem/v1`;
  queryWorkItemsUrl = `${this.baseUrl}/query-workitems`;
  errorTitle = '';
  errorDescription = '';
  productUtils: ProductUtils;
  usersUtils: UsersUtils;
  workspaceUtils: WorkspaceUtils;
  systemUtils: SystemUtils;

  defaultQuery = {
    outputType: OutputType.Properties,
    types: Object.values(WorkItemTypeOptions),
    properties: [
      WorkItemPropertiesOptions.ID,
      WorkItemPropertiesOptions.NAME,
      WorkItemPropertiesOptions.TYPE,
      WorkItemPropertiesOptions.STATE,
      WorkItemPropertiesOptions.WORKSPACE,
    ],
    orderBy: OrderByOptions.UPDATED_AT,
    descending: true,
    take: DEFAULT_TAKE,
  };

  readonly globalVariableOptions = (): QueryBuilderOption[] => this.getVariableOptions();

  isTypesValid(types?: WorkItemTypeOptions[]): types is WorkItemTypeOptions[] {
    return Boolean(types && types.length > 0);
  }

  isPropertiesValid(properties?: WorkItemPropertiesOptions[]): properties is WorkItemPropertiesOptions[] {
    return Boolean(properties && properties.length > 0);
  }

  isTakeValid(take?: number): boolean {
    return Number.isFinite(take) && take! > 0 && take! <= TAKE_LIMIT;
  }

  async runQuery(query: WorkItemsQuery, options: DataQueryRequest<WorkItemsQuery>): Promise<DataFrameDTO> {
    if (query.outputType === OutputType.TotalCount) {
      return this.handleTotalCountQuery(query, options.scopedVars);
    }

    const properties = query.properties;
    if (!this.isPropertiesValid(properties)) {
      return this.createDataFrame(query.refId, []);
    }

    const workItems = await this.queryWorkItemsInBatches(
      this.createQueryRequest(query, options.scopedVars, properties)
    );

    return {
      refId: query.refId,
      name: query.refId,
      fields: await this.mapPropertiesToFields(properties, workItems),
    };
  }

  shouldRunQuery(query: WorkItemsQuery): boolean {
    return (
      !query.hide &&
      this.isTypesValid(query.types) &&
      this.isTakeValid(query.take) &&
      (query.outputType === OutputType.TotalCount || this.isPropertiesValid(query.properties))
    );
  }

  public async loadProductNamesAndPartNumbers(): Promise<Map<string, ProductPartNumberAndName>> {
    try {
      return await this.productUtils.getProductNamesAndPartNumbers();
    } catch (error) {
      if (!this.errorTitle) {
        this.handleDependenciesError(error);
      }
      return new Map<string, ProductPartNumberAndName>();
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

  public async loadSystemAliases(): Promise<Map<string, SystemAlias>> {
    try {
      return await this.systemUtils.getSystemAliases();
    } catch (error) {
      if (!this.errorTitle) {
        this.handleDependenciesError(error);
      }
      return new Map<string, SystemAlias>();
    }
  }

  async testDatasource(): Promise<TestDataSourceResponse> {
    await this.post(this.queryWorkItemsUrl, { take: 1 }, { showErrorAlert: false });
    return { status: 'success', message: 'Data source connected and authentication successful!' };
  }

  private handleDependenciesError(error: unknown): void {
    const errorDetails = extractErrorInfo((error as Error).message);
    this.errorTitle = 'Warning during work items query';
    switch (errorDetails.statusCode) {
      case '404':
        this.errorDescription = 'The query builder lookups failed because the requested resource was not found. Please check the query parameters and try again.';
        break;
      case '429':
        this.errorDescription = 'The query builder lookups failed due to too many requests. Please try again later.';
        break;
      case '504':
        this.errorDescription = 'The query builder lookups experienced a timeout error. Some values might not be available. Narrow your query with a more specific filter and try again.';
        break;
      default:
        this.errorDescription = errorDetails.message
          ? `Some values may not be available in the query builder lookups due to the following error: ${errorDetails.message}.`
          : 'Some values may not be available in the query builder lookups due to an unknown error.';
        break;
    }
  }

  private async handleTotalCountQuery(query: WorkItemsQuery, scopedVars: ScopedVars): Promise<DataFrameDTO> {
    const response = await this.queryWorkItems({
      ...this.createQueryRequest(query, scopedVars),
      take: 1,
      returnCount: true,
    });

    return this.createDataFrame(query.refId, [
      { name: query.refId, type: FieldType.number, values: [response.totalCount ?? 0] },
    ]);
  }

  private createQueryRequest(
    query: WorkItemsQuery,
    scopedVars: ScopedVars,
    projection?: WorkItemPropertiesOptions[]
  ): QueryWorkItemsRequest {
    return {
      filter: this.createFilter(query.types, this.transformWorkItemsQuery(scopedVars, query.filter)),
      take: query.take,
      orderBy: query.orderBy,
      descending: query.descending,
      ...(projection && { projection }),
    };
  }

  private transformWorkItemsQuery(scopedVars: ScopedVars, query?: string): string {
    if (!query) {
      return '';
    }

    return transformComputedFieldsQuery(
      this.templateSrv.replace(query, scopedVars),
      this.computedDataFields
    );
  }

  private createFilter(types: WorkItemTypeOptions[] | undefined, filter: string): string | undefined {
    const typeFilter = types?.map(type => `type == "${type}"`).join(' || ');
    const wrappedTypeFilter = typeFilter ? `(${typeFilter})` : '';
    const wrappedFilter = filter ? `(${filter})` : '';

    if (wrappedTypeFilter && wrappedFilter) {
      return `${wrappedTypeFilter} && ${wrappedFilter}`;
    }

    return wrappedTypeFilter || wrappedFilter || undefined;
  }

  private async queryWorkItemsInBatches(request: QueryWorkItemsRequest): Promise<WorkItem[]> {
    const queryRecord = async (take: number, continuationToken?: string): Promise<QueryResponse<WorkItem>> => {
      const response = await this.queryWorkItems({ ...request, take, continuationToken });
      return {
        data: response.workItems,
        continuationToken: response.continuationToken,
      };
    };

    const response = await queryInBatches(
      queryRecord,
      {
        maxTakePerRequest: QUERY_WORK_ITEMS_MAXIMUM_TAKE,
        requestsPerSecond: QUERY_WORK_ITEMS_REQUESTS_PER_SECOND,
      },
      request.take
    );

    return response.data;
  }

  private async queryWorkItems(request: QueryWorkItemsRequest): Promise<QueryWorkItemsResponse> {
    try {
      return await this.post<QueryWorkItemsResponse>(this.queryWorkItemsUrl, request, { showErrorAlert: false });
    } catch (error) {
      const errorDetails = extractErrorInfo((error as Error).message);
      const errorMessage = errorDetails.message || 'Unable to query work items. Please try again.';

      this.appEvents?.publish?.({
        type: AppEvents.alertError.name,
        payload: ['Error during work items query', errorMessage],
      });

      throw new Error(errorMessage);
    }
  }

  private async mapPropertiesToFields(
    properties: WorkItemPropertiesOptions[],
    workItems: WorkItem[]
  ): Promise<DataFrameDTO['fields']> {
    const needsWorkspaces = properties.includes(WorkItemPropertiesOptions.WORKSPACE);
    const needsUsers = properties.some(property =>
      [
        WorkItemPropertiesOptions.ASSIGNED_TO,
        WorkItemPropertiesOptions.REQUESTED_BY,
        WorkItemPropertiesOptions.CREATED_BY,
        WorkItemPropertiesOptions.UPDATED_BY,
      ].includes(property)
    );
    const needsProducts = properties.includes(WorkItemPropertiesOptions.PART_NUMBER);
    const needsSystems = properties.includes(WorkItemPropertiesOptions.SYSTEM_ID);
    const [workspaces, users, products, systems] = await Promise.all([
      needsWorkspaces ? this.loadWorkspaces() : Promise.resolve(new Map<string, Workspace>()),
      needsUsers ? this.loadUsers() : Promise.resolve(new Map<string, User>()),
      needsProducts
        ? this.loadProductNamesAndPartNumbers()
        : Promise.resolve(new Map<string, ProductPartNumberAndName>()),
      needsSystems ? this.loadSystemAliases() : Promise.resolve(new Map<string, SystemAlias>()),
    ]);

    return properties.map(property => {
      const { label } = WorkItemProperties[property];
      const type = this.getFieldType(property);
      const values = workItems.map(workItem =>
        this.getPropertyValue(property, workItem, workspaces, users, products, systems)
      );

      return {
        name: label,
        type,
        values,
        ...(type === FieldType.time && { config: { unit: 'time:YYYY-MM-DD HH:mm:ss' } }),
      };
    });
  }

  private getPropertyValue(
    property: WorkItemPropertiesOptions,
    workItem: WorkItem,
    workspaces: Map<string, Workspace>,
    users: Map<string, User>,
    products: Map<string, ProductPartNumberAndName>,
    systems: Map<string, SystemAlias>
  ): unknown {
    const value = this.getValueAtPath(workItem, WorkItemProperties[property].field);

    switch (property) {
      case WorkItemPropertiesOptions.WORKSPACE:
        return workspaces.get(String(value))?.name ?? value ?? '';
      case WorkItemPropertiesOptions.ASSIGNED_TO:
      case WorkItemPropertiesOptions.REQUESTED_BY:
      case WorkItemPropertiesOptions.CREATED_BY:
      case WorkItemPropertiesOptions.UPDATED_BY:
        return this.getUserName(value, users);
      case WorkItemPropertiesOptions.PART_NUMBER:
        return this.getProductName(value, products);
      case WorkItemPropertiesOptions.SYSTEM_ID:
        return systems.get(String(value))?.alias ?? value ?? '';
      case WorkItemPropertiesOptions.PARENT_WORK_ITEM_ID:
        return value ?? workItem.parentId ?? '';
      case WorkItemPropertiesOptions.PROPERTIES:
        return value ?? {};
      default:
        return value ?? '';
    }
  }

  private getValueAtPath(workItem: WorkItem, path: string): unknown {
    return path.split('.').reduce<unknown>((value, key) => {
      if (!value || typeof value !== 'object') {
        return undefined;
      }
      return (value as Record<string, unknown>)[key];
    }, workItem);
  }

  private getUserName(value: unknown, users: Map<string, User>): string {
    const userId = typeof value === 'string' ? value : '';
    const user = users.get(userId);
    return user ? UsersUtils.getUserFullName(user) : userId;
  }

  private getProductName(value: unknown, products: Map<string, ProductPartNumberAndName>): string {
    const partNumber = typeof value === 'string' ? value : '';
    const product = products.get(partNumber);
    return product?.name ? `${product.name} (${partNumber})` : partNumber;
  }

  private getFieldType(property: WorkItemPropertiesOptions): FieldType {
    if (
      [
        WorkItemPropertiesOptions.CREATED_AT,
        WorkItemPropertiesOptions.UPDATED_AT,
        WorkItemPropertiesOptions.EARLIEST_START_DATE,
        WorkItemPropertiesOptions.DUE_DATE,
        WorkItemPropertiesOptions.PLANNED_START_DATE,
        WorkItemPropertiesOptions.PLANNED_END_DATE,
      ].includes(property)
    ) {
      return FieldType.time;
    }

    if (
      [
        WorkItemPropertiesOptions.ESTIMATED_DURATION,
        WorkItemPropertiesOptions.PLANNED_DURATION,
      ].includes(property)
    ) {
      return FieldType.number;
    }

    return property === WorkItemPropertiesOptions.PROPERTIES ? FieldType.other : FieldType.string;
  }

  private createDataFrame(refId: string, fields: DataFrameDTO['fields']): DataFrameDTO {
    return { refId, name: refId, fields };
  }

  private readonly computedDataFields = new Map<string, ExpressionTransformFunction>(
    Object.values(WorkItemsQueryBuilderFields).map(field => {
      const dataField = field.dataField as string;
      return [dataField, this.getQueryFieldTransformation(dataField)];
    })
  );

  private getQueryFieldTransformation(dataField: string): ExpressionTransformFunction {
    switch (dataField) {
      case WorkItemsQueryBuilderFieldNames.EarliestStartDate:
      case WorkItemsQueryBuilderFieldNames.DueDate:
      case WorkItemsQueryBuilderFieldNames.PlannedStartDate:
      case WorkItemsQueryBuilderFieldNames.PlannedEndDate:
      case WorkItemsQueryBuilderFieldNames.CreatedAt:
      case WorkItemsQueryBuilderFieldNames.UpdatedAt:
        return timeFieldsQuery(dataField);
      case WorkItemsQueryBuilderFieldNames.EstimatedDurationInDays:
        return this.durationQuery('timeline.estimatedDurationInSeconds', 24 * 60 * 60);
      case WorkItemsQueryBuilderFieldNames.EstimatedDurationInHours:
        return this.durationQuery('timeline.estimatedDurationInSeconds', 60 * 60);
      case WorkItemsQueryBuilderFieldNames.PlannedDurationInDays:
        return this.durationQuery('schedule.plannedDurationInSeconds', 24 * 60 * 60);
      case WorkItemsQueryBuilderFieldNames.PlannedDurationInHours:
        return this.durationQuery('schedule.plannedDurationInSeconds', 60 * 60);
      default:
        return multipleValuesQuery(dataField);
    }
  }

  private durationQuery(apiField: string, secondsPerUnit: number): ExpressionTransformFunction {
    return (value, operation) => {
      const duration = Number(value);
      if (!Number.isFinite(duration)) {
        return `${apiField} ${operation} "${value}"`;
      }

      return `${apiField} ${operation} ${duration * secondsPerUnit}`;
    };
  }
}
