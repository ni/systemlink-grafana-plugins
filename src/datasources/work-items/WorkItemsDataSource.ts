import {
  AppEvents,
  DataFrameDTO,
  DataQueryRequest,
  DataSourceInstanceSettings,
  FieldType,
  TestDataSourceResponse,
} from '@grafana/data';
import { BackendSrv, TemplateSrv, getBackendSrv, getTemplateSrv } from '@grafana/runtime';
import { DataSourceBase } from 'core/DataSourceBase';
import { queryInBatches } from 'core/utils';
import { QueryResponse, Workspace } from 'core/types';
import { WorkspaceUtils } from 'shared/workspace.utils';
import { UsersUtils } from 'shared/users.utils';
import { User } from 'shared/types/QueryUsers.types';
import {
  OrderByOptions,
  OutputType,
  QueryWorkItemsRequestBody,
  WorkItem,
  WorkItemPropertiesOptions,
  WorkItemsQuery,
  WorkItemsResponse,
  WorkItemTypeOptions,
} from './types';
import {
  DEFAULT_TAKE,
  USER_PROPERTY_FIELDS,
  WORK_ITEM_PROPERTIES_PROJECTIONS,
  WORK_ITEM_TYPE_FILTER_VALUES,
  WORK_ITEM_TYPE_LABEL_MAP,
  WORK_ITEM_STATE_LABEL_MAP,
} from './constants';
import {
  QUERY_WORK_ITEMS_MAX_TAKE,
  QUERY_WORK_ITEMS_REQUEST_PER_SECOND,
} from './constants/QueryWorkItems.constants';
import { WorkItemProperties } from './constants/QueryEditor.constants';
import { extractErrorInfo } from 'core/errors';
import { isPropertiesNonEmpty, isTakeValid, isTypesNonEmpty, transformDuration } from './utils';

export class WorkItemsDataSource extends DataSourceBase<WorkItemsQuery> {
  constructor(
    readonly instanceSettings: DataSourceInstanceSettings,
    readonly backendSrv: BackendSrv = getBackendSrv(),
    readonly templateSrv: TemplateSrv = getTemplateSrv()
  ) {
    super(instanceSettings, backendSrv, templateSrv);
    this.workspaceUtils = new WorkspaceUtils(this.instanceSettings, this.backendSrv);
    this.usersUtils = new UsersUtils(this.instanceSettings, this.backendSrv);
  }

  baseUrl = `${this.instanceSettings.url}/niworkitem/v1`;
  queryWorkItemsUrl = `${this.baseUrl}/query-workitems`;
  workspaceUtils: WorkspaceUtils;
  usersUtils: UsersUtils;

  defaultQuery = {
    outputType: OutputType.Properties,
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

  async runQuery(query: WorkItemsQuery, options: DataQueryRequest<WorkItemsQuery>): Promise<DataFrameDTO> {
    if (!isTypesNonEmpty(query.types)) {
      return this.getEmptyDataFrameDTO(query.refId);
    }

    const typeFilter = this.buildTypeFilter(query.types!);
    const queryFilter = query.filter?.trim();
    const filter = this.buildQueryFilter(
      typeFilter ? `(${typeFilter})` : undefined,
      queryFilter ? `(${queryFilter})` : undefined
    );

    if (
      query.outputType === OutputType.Properties &&
      isPropertiesNonEmpty(query.properties) &&
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
    const workspaces = await this.loadWorkspaces();
    const users = await this.loadUsers();
    const workItems = await this.queryWorkItemsData(filter, query.properties, query.orderBy, query.descending, query.take);

    const parentWorkItemNames = this.isParentWorkItemNameSelected(query.properties)
      ? await this.loadParentWorkItemNames(workItems)
      : new Map<string, string>();

    return {
      refId: query.refId,
      name: query.refId,
      fields: this.buildFields(query.properties, workItems, workspaces, users, parentWorkItemNames),
    };
  }

  private isParentWorkItemNameSelected(properties?: WorkItemPropertiesOptions[]): boolean {
    return !!properties?.includes(WorkItemPropertiesOptions.PARENT_WORK_ITEM_NAME);
  }

  private async loadWorkspaces(): Promise<Map<string, Workspace>> {
    try {
      return await this.workspaceUtils.getWorkspaces();
    } catch {
      return new Map<string, Workspace>();
    }
  }

  private async loadUsers(): Promise<Map<string, User>> {
    try {
      return await this.usersUtils.getUsers();
    } catch {
      return new Map<string, User>();
    }
  }

  private async loadParentWorkItemNames(workItems: WorkItem[]): Promise<Map<string, string>> {
    const parentIds = [
      ...new Set(workItems.map(workItem => workItem.parentId).filter((id): id is string => !!id)),
    ];
    if (parentIds.length === 0) {
      return new Map<string, string>();
    }

    try {
      const response = await this.queryWorkItems({
        filter: parentIds.map(id => `id = "${id}"`).join(' || '),
        projection: [WorkItemPropertiesOptions.ID, WorkItemPropertiesOptions.NAME],
        take: parentIds.length,
      });

      const nameMap = new Map<string, string>();
      (response.workItems ?? []).forEach(parentWorkItem => {
        if (parentWorkItem.id) {
          nameMap.set(parentWorkItem.id, parentWorkItem.name ?? '');
        }
      });
      return nameMap;
    } catch {
      return new Map<string, string>();
    }
  }

  private buildFields(
    properties: WorkItemPropertiesOptions[] | undefined,
    workItems: WorkItem[],
    workspaces: Map<string, Workspace>,
    users: Map<string, User>,
    parentWorkItemNames: Map<string, string>
  ) {
    return (
      properties?.map(property => {
        const fieldValue = workItems.map(workItem =>
          this.getPropertyValue(property, workItem, workspaces, users, parentWorkItemNames)
        );
        const fieldType = this.getPropertyFieldType(property);
        return {
          name: WorkItemProperties[property].label,
          values: fieldValue,
          type: fieldType,
          ...(fieldType === FieldType.time && { config: { unit: 'time:YYYY-MM-DD HH:mm:ss' } }),
        };
      }) ?? []
    );
  }

  private getPropertyValue(
    property: WorkItemPropertiesOptions,
    workItem: WorkItem,
    workspaces: Map<string, Workspace>,
    users: Map<string, User>,
    parentWorkItemNames: Map<string, string>
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
      case WorkItemPropertiesOptions.WORKSPACE: {
        const workspace = workspaces.get(workItem.workspace ?? '');
        return workspace ? workspace.name : workItem.workspace ?? '';
      }
      case WorkItemPropertiesOptions.ASSIGNED_TO:
      case WorkItemPropertiesOptions.REQUESTED_BY:
      case WorkItemPropertiesOptions.CREATED_BY:
      case WorkItemPropertiesOptions.UPDATED_BY: {
        const userField = USER_PROPERTY_FIELDS[property]!;
        const userId = workItem[userField] as string | undefined;
        const user = users.get(userId ?? '');
        return user ? UsersUtils.getUserFullName(user) : userId ?? '';
      }
      case WorkItemPropertiesOptions.PARENT_WORK_ITEM_NAME: {
        if (!workItem.parentId) {
          return '';
        }
        return parentWorkItemNames.get(workItem.parentId) ?? workItem.parentId;
      }
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
    take?: number
  ): Promise<WorkItem[]> {
    const projection = this.buildProjection(properties);

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

  private buildProjection(properties?: WorkItemPropertiesOptions[]): string[] | undefined {
    const projection = new Set<string>();
    (properties ?? []).forEach(property => {
      WORK_ITEM_PROPERTIES_PROJECTIONS[property]?.forEach(value => projection.add(value));
    });

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

  async testDatasource(): Promise<TestDataSourceResponse> {
    await this.post(this.queryWorkItemsUrl, { take: 1 }, { showErrorAlert: false });
    return { status: 'success', message: 'Data source connected and authentication successful!' };
  }
}
