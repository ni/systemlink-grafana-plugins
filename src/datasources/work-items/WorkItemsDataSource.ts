import {
  AppEvents,
  DataFrameDTO,
  DataQueryRequest,
  DataSourceInstanceSettings,
  FieldType,
  TestDataSourceResponse,
} from '@grafana/data';
import { BackendSrv, TemplateSrv, getBackendSrv, getTemplateSrv } from '@grafana/runtime';
import { ComboboxOption } from '@grafana/ui';
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
import { queryInBatches } from 'core/utils';
import {
  OrderByOptions,
  OutputType,
  QueryWorkItemsRequestBody,
  WorkItem,
  WorkItemPropertiesGroup,
  WorkItemPropertiesOptions,
  WorkItemsQuery,
  WorkItemsResponse,
  WorkItemTypeOptions,
} from './types';
import {
  DEFAULT_TAKE,
  WORK_ITEM_PROPERTIES_PROJECTION,
  WORK_ITEM_PROPERTIES_PROJECTIONS,
  WORK_ITEM_TYPE_FILTER_VALUES,
  WORK_ITEM_TYPE_LABEL_MAP,
  WORK_ITEM_STATE_LABEL_MAP,
  CUSTOM_PROPERTY_OPTIONS_LIMIT,
  CUSTOM_PROPERTY_SUFFIX
} from './constants';
import {
  QUERY_WORK_ITEMS_MAX_TAKE,
  QUERY_WORK_ITEMS_REQUEST_PER_SECOND,
} from './constants/QueryWorkItems.constants';
import { WorkItemProperties } from './constants/QueryEditor.constants';
import { isPropertiesNonEmpty, isTakeValid, isTypesNonEmpty, transformDuration } from './utils';

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
    types: Object.values(WorkItemTypeOptions),
    properties: [
      WorkItemPropertiesOptions.NAME,
      WorkItemPropertiesOptions.STATE,
      WorkItemPropertiesOptions.ASSIGNED_TO,
      WorkItemPropertiesOptions.PLANNED_START_DATE,
      WorkItemPropertiesOptions.DUE_DATE,
    ],
    orderBy: OrderByOptions.UPDATED_AT,
    descending: true,
    take: DEFAULT_TAKE,
  };

  readonly globalVariableOptions = (): QueryBuilderOption[] => this.getVariableOptions();

  async runQuery(query: WorkItemsQuery, options: DataQueryRequest<WorkItemsQuery>): Promise<DataFrameDTO> {
    if (!isTypesNonEmpty(query.types)) {
      return this.getEmptyDataFrameDTO(query.refId);
    }

    const filter = this.buildFilterFromQuery(query);

    if (
      query.outputType === OutputType.Properties &&
      isPropertiesNonEmpty(query.properties, query.customProperties) &&
      isTakeValid(query.take)
    ) {
      return this.processWorkItemsQuery(query, filter);
    }

    if (query.outputType === OutputType.TotalCount) {
      const totalCount = await this.queryWorkItemsCount(filter);
      return {
        refId: query.refId,
        name: query.refId,
        fields: [{ name: query.refId, values: [totalCount] }],
      };
    }

    return this.getEmptyDataFrameDTO(query.refId);
  }

  async processWorkItemsQuery(query: WorkItemsQuery, filter?: string): Promise<DataFrameDTO> {
    const workItems = await this.queryWorkItemsData(
      filter,
      query.properties,
      query.orderBy,
      query.descending,
      query.take,
      query.customProperties
    );

    return {
      refId: query.refId,
      name: query.refId,
      fields: this.buildFields(query.properties, workItems, query.customProperties),
    };
  }

  private buildFields(
    properties: WorkItemPropertiesOptions[] | undefined,
    workItems: WorkItem[],
    customProperties?: string[]
  ) {
    const standardFields =
      properties?.map(property => {
        const fieldValue = workItems.map(workItem => this.getPropertyValue(property, workItem));
        const fieldType = this.getPropertyFieldType(property);
        return {
          name: WorkItemProperties[property].label,
          values: fieldValue,
          type: fieldType,
          ...(fieldType === FieldType.time && { config: { unit: 'time:YYYY-MM-DD HH:mm:ss' } }),
        };
      }) ?? [];

    const customFields =
      customProperties?.map(customProperty => ({
        name: customProperty,
        values: workItems.map(workItem => workItem.properties?.[customProperty] ?? ''),
        type: FieldType.string,
      })) ?? [];

    return [...standardFields, ...customFields];
  }

  private getPropertyValue(
    property: WorkItemPropertiesOptions,
    workItem: WorkItem
  ): string | null {
    switch (property) {
      case WorkItemPropertiesOptions.ID:
        return workItem.id ?? '';
      case WorkItemPropertiesOptions.NAME:
        return workItem.name ?? '';
      case WorkItemPropertiesOptions.TYPE:
        return this.formatWorkItemTypeLabel(workItem.type);
      case WorkItemPropertiesOptions.STATE:
        return this.formatStateLabel(workItem.state);
      case WorkItemPropertiesOptions.SUBSTATE:
        return workItem.substate ?? '';
      case WorkItemPropertiesOptions.DESCRIPTION:
        return workItem.description ?? '';
      case WorkItemPropertiesOptions.TEST_PROGRAM:
        return workItem.testProgram ?? '';
      case WorkItemPropertiesOptions.PART_NUMBER:
        return workItem.partNumber ?? '';
      case WorkItemPropertiesOptions.PARENT_WORK_ITEM_ID:
        return workItem.parentId ?? '';
      case WorkItemPropertiesOptions.TEMPLATE_ID:
        return workItem.templateId ?? '';
      case WorkItemPropertiesOptions.CREATED_AT:
        return workItem.createdAt ?? null;
      case WorkItemPropertiesOptions.UPDATED_AT:
        return workItem.updatedAt ?? null;
      case WorkItemPropertiesOptions.EARLIEST_START_DATE:
        return workItem.timeline?.earliestStartDateTime ?? null;
      case WorkItemPropertiesOptions.DUE_DATE:
        return workItem.timeline?.dueDateTime ?? null;
      case WorkItemPropertiesOptions.ESTIMATED_DURATION: {
        const seconds = workItem.timeline?.estimatedDurationInSeconds;
        return seconds != null ? transformDuration(seconds) : '';
      }
      case WorkItemPropertiesOptions.PLANNED_START_DATE:
        return workItem.schedule?.plannedStartDateTime ?? null;
      case WorkItemPropertiesOptions.PLANNED_END_DATE:
        return workItem.schedule?.plannedEndDateTime ?? null;
      case WorkItemPropertiesOptions.PLANNED_DURATION: {
        const seconds = workItem.schedule?.plannedDurationInSeconds;
        return seconds != null ? transformDuration(seconds) : '';
      }
      default:
        return '';
    }
  }

  private getPropertyFieldType(property: WorkItemPropertiesOptions): FieldType {
    switch (property) {
      case WorkItemPropertiesOptions.CREATED_AT:
      case WorkItemPropertiesOptions.UPDATED_AT:
      case WorkItemPropertiesOptions.EARLIEST_START_DATE:
      case WorkItemPropertiesOptions.DUE_DATE:
      case WorkItemPropertiesOptions.PLANNED_START_DATE:
      case WorkItemPropertiesOptions.PLANNED_END_DATE:
        return FieldType.time;
      default:
        return FieldType.string;
    }
  }

  private formatWorkItemTypeLabel(type?: string): string {
    if (!type) {
      return '';
    }

    const normalizedType = type.toLowerCase().replace(/[_\-\s]+/g, '');
    return WORK_ITEM_TYPE_LABEL_MAP[normalizedType] ?? type;
  }

  private formatStateLabel(state?: string): string {
    if (!state) {
      return '';
    }

    return WORK_ITEM_STATE_LABEL_MAP[state] ?? state;
  }

  async queryWorkItemsData(
    filter?: string,
    properties?: WorkItemPropertiesOptions[],
    orderBy?: OrderByOptions,
    descending?: boolean,
    take?: number,
    customProperties?: string[]
  ): Promise<WorkItem[]> {
    const projection = this.buildProjection(properties, customProperties);

    const queryRecord = async (currentTake: number, continuationToken?: string): Promise<QueryResponse<WorkItem>> => {
      const body: QueryWorkItemsRequestBody = {
        filter,
        projection,
        orderBy,
        descending,
        take: currentTake,
        continuationToken,
      };
      const response = await this.queryWorkItems(body);

      return {
        data: response.workItems ?? [],
        continuationToken: response.continuationToken,
        totalCount: response.totalCount,
      };
    };

    const batchQueryConfig = {
      maxTakePerRequest: QUERY_WORK_ITEMS_MAX_TAKE,
      requestsPerSecond: QUERY_WORK_ITEMS_REQUEST_PER_SECOND,
    };
    const response = await queryInBatches(queryRecord, batchQueryConfig, take);

    return response.data;
  }

  private buildProjection(
    properties?: WorkItemPropertiesOptions[],
    customProperties?: string[]
  ): string[] | undefined {
    const projection = new Set<string>();
    (properties ?? []).forEach(property => {
      WORK_ITEM_PROPERTIES_PROJECTIONS[property]?.forEach(value => projection.add(value));
    });

    if (customProperties && customProperties.length > 0) {
      projection.add(WORK_ITEM_PROPERTIES_PROJECTION);
    }

    return projection.size > 0 ? [...projection] : undefined;
  }

  async queryWorkItemsCount(filter?: string): Promise<number> {
    const body: QueryWorkItemsRequestBody = {
      filter,
      take: 0,
      returnCount: true,
    };
    const response = await this.queryWorkItems(body);
    return response.totalCount ?? 0;
  }

  async queryWorkItems(body: QueryWorkItemsRequestBody): Promise<WorkItemsResponse> {
    try {
      return await this.post<WorkItemsResponse>(
        this.queryWorkItemsUrl,
        body,
        { showErrorAlert: false } // suppress default error alert since we handle errors manually
      );
    } catch (error) {
      const errorDetails = extractErrorInfo((error as Error).message);
      let errorMessage: string;
      switch (errorDetails.statusCode) {
        case '':
          errorMessage = 'The query failed due to an unknown error.';
          break;
        case '404':
          errorMessage = 'The query to fetch work items failed because the requested resource was not found. Please check the query parameters and try again.';
          break;
        case '429':
          errorMessage = 'The query to fetch work items failed due to too many requests. Please try again later.';
          break;
        case '504':
          errorMessage = 'The query to fetch work items experienced a timeout error. Narrow your query with a more specific filter and try again.';
          break;
        default:
          errorMessage = `The query failed due to the following error: (status ${errorDetails.statusCode}) ${errorDetails.message}.`;
          break;
      }

      this.appEvents?.publish?.({
        type: AppEvents.alertError.name,
        payload: ['Error during work items query', errorMessage],
      });

      throw new Error(errorMessage);
    }
  }

  protected buildQueryFilter(typeFilter?: string, queryFilter?: string): string | undefined {
    const filters = [typeFilter, queryFilter].filter(Boolean);
    return filters.length > 0 ? filters.join(' && ') : undefined;
  }

  /** Builds the same filter for the data query and the custom property discovery query. */
  public buildFilterFromQuery(query: WorkItemsQuery): string | undefined {
    const typeFilter = isTypesNonEmpty(query.types) ? this.buildTypeFilter(query.types!) : undefined;
    const queryFilter = query.filter?.trim();

    return this.buildQueryFilter(
      typeFilter ? `(${typeFilter})` : undefined,
      queryFilter ? `(${queryFilter})` : undefined
    );
  }

  private getEmptyDataFrameDTO(refId: string): DataFrameDTO {
    return {
      refId: refId,
      name: refId,
      fields: [],
    };
  }

  private buildTypeFilter(types: WorkItemTypeOptions[]): string | undefined {
    const allTypesAreSelected = Object.values(WorkItemTypeOptions).every(type => types.includes(type));
    if (allTypesAreSelected) {
      return undefined;
    }

    const typeValues = types.map(type => WORK_ITEM_TYPE_FILTER_VALUES[type]);
    return typeValues.map(value => `type = "${value}"`).join(' || ');
  }

  shouldRunQuery(query: WorkItemsQuery): boolean {
    return !query.hide;
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

  /**
   * Discovers the distinct custom property keys present on the queried work items so the
   * query editor can offer each key as its own selectable property.
   */
  public async getCustomPropertyOptions(
    filter: string | undefined, 
    take: number,
    orderBy?: OrderByOptions,
    descending?: boolean
  ): Promise<Array<ComboboxOption<string>>> {
    const queryRecord = async (currentTake: number, continuationToken?: string): Promise<QueryResponse<WorkItem>> => {
      const response = await this.queryWorkItems({
        filter,
        projection: [WORK_ITEM_PROPERTIES_PROJECTION],
        orderBy,
        descending,
        take: currentTake,
        continuationToken,
      });

      return {
        data: response.workItems ?? [],
        continuationToken: response.continuationToken,
        totalCount: response.totalCount,
      };
    };

    const response = await queryInBatches(
      queryRecord,
      {
        maxTakePerRequest: QUERY_WORK_ITEMS_MAX_TAKE,
        requestsPerSecond: QUERY_WORK_ITEMS_REQUEST_PER_SECOND,
      },
      take
    );

    const customPropertyKeys = new Set<string>();
    for (const workItem of response.data) {
      if (!workItem.properties) {
        continue;
      }

      for (const key of Object.keys(workItem.properties)) {
        customPropertyKeys.add(key);
        if (customPropertyKeys.size >= CUSTOM_PROPERTY_OPTIONS_LIMIT) {
          return this.buildCustomPropertyOptions(customPropertyKeys);
        }
      }
    }

    return this.buildCustomPropertyOptions(customPropertyKeys);
  }

  private buildCustomPropertyOptions(
    customPropertyKeys: Set<string>
  ): Array<ComboboxOption<string>> {
    return Array.from(customPropertyKeys)
      .sort((key, otherKey) => key.localeCompare(otherKey))
      .map(key => ({
        label: key,
        value: `${key}${CUSTOM_PROPERTY_SUFFIX}`,
        group: WorkItemPropertiesGroup.CUSTOM_PROPERTIES,
      }));
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
}
