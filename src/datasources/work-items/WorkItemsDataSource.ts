import {
  AppEvents,
  DataFrameDTO,
  DataQueryRequest,
  DataSourceInstanceSettings,
  FieldType,
  LegacyMetricFindQueryOptions,
  MetricFindValue,
  SelectableValue,
  TestDataSourceResponse,
} from '@grafana/data';
import { BackendSrv, TemplateSrv, getBackendSrv, getTemplateSrv } from '@grafana/runtime';
import { DataSourceBase } from 'core/DataSourceBase';
import {
  ALL_WORK_ITEM_TYPES_VALUE,
  FlatRow,
  GetWorkItemTypesResponse,
  OrderByOptions,
  OutputType,
  QueryWorkItemsRequestBody,
  WorkItem,
  WorkItemProjection,
  WorkItemPropertyKey,
  WorkItemProperties,
  WorkItemsQuery,
  WorkItemsResponse,
  WorkItemsVariableQuery,
} from './types';
import { QueryBuilderOption, QueryResponse, Workspace } from 'core/types';
import {
  ExpressionTransformFunction,
  multipleValuesQuery,
  timeFieldsQuery,
  transformComputedFieldsQuery,
} from 'core/query-builder.utils';
import { queryInBatches } from 'core/utils';
import {
  QUERY_WORK_ITEMS_MAX_TAKE,
  QUERY_WORK_ITEMS_REQUEST_PER_SECOND,
} from './constants/QueryWorkItems.constants';
import { TAKE_LIMIT } from './constants/QueryEditor.constants';
import { WorkItemsQueryBuilderFieldNames } from './constants/WorkItemsQueryBuilder.constants';
import { WorkspaceUtils } from 'shared/workspace.utils';
import { SystemUtils } from 'shared/system.utils';
import { UsersUtils } from 'shared/users.utils';
import { extractErrorInfo } from 'core/errors';
import { User } from 'shared/types/QueryUsers.types';
import { SystemAlias } from 'shared/types/QuerySystems.types';
import { AssetUtils } from './asset.utils';
import { isTimeField, transformDuration } from './utils';

export class WorkItemsDataSource extends DataSourceBase<WorkItemsQuery> {
  private readonly workItemStateLabelMap: Record<string, string> = {
    NEW: 'New',
    DEFINED: 'Defined',
    REVIEWED: 'Reviewed',
    SCHEDULED: 'Scheduled',
    IN_PROGRESS: 'In progress',
    PENDING_APPROVAL: 'Pending approval',
    CLOSED: 'Closed',
    CANCELED: 'Canceled',
  };

  constructor(
    readonly instanceSettings: DataSourceInstanceSettings,
    readonly backendSrv: BackendSrv = getBackendSrv(),
    readonly templateSrv: TemplateSrv = getTemplateSrv()
  ) {
    super(instanceSettings, backendSrv, templateSrv);
    this.workspaceUtils = new WorkspaceUtils(instanceSettings, backendSrv);
    this.systemUtils = new SystemUtils(instanceSettings, backendSrv);
    this.usersUtils = new UsersUtils(instanceSettings, backendSrv);
    this.assetUtils = new AssetUtils(instanceSettings, backendSrv);
  }

  baseUrl = `${this.instanceSettings.url}/niworkitem/v1`;
  queryWorkItemsUrl = `${this.baseUrl}/query-workitems`;
  workItemTypesUrl = `${this.baseUrl}/workitemtypes`;
  errorTitle = '';
  errorDescription = '';

  workspaceUtils: WorkspaceUtils;
  systemUtils: SystemUtils;
  usersUtils: UsersUtils;
  assetUtils: AssetUtils;

  private workItemTypesCache: Array<SelectableValue<string>> | null = null;

  defaultQuery = {
    properties: [
      WorkItemPropertyKey.NAME,
      WorkItemPropertyKey.STATE,
      WorkItemPropertyKey.ASSIGNED_TO,
      WorkItemPropertyKey.UPDATED_AT,
    ] as WorkItemPropertyKey[],
    workItemTypes: [ALL_WORK_ITEM_TYPES_VALUE] as string[],
    orderBy: OrderByOptions.UPDATED_AT,
    descending: true,
    take: 1000,
  };

  readonly globalVariableOptions = (): QueryBuilderOption[] => this.getVariableOptions();

  async runQuery(query: WorkItemsQuery, options: DataQueryRequest): Promise<DataFrameDTO> {
    if (query.queryBy) {
      query.queryBy = transformComputedFieldsQuery(
        this.templateSrv.replace(query.queryBy, options.scopedVars),
        this.workItemsComputedDataFields
      );
    }

    const typeFilter = this.buildTypeFilterClause(
      query.workItemTypes?.map(t => this.templateSrv.replace(t, options.scopedVars))
    );
    const combinedFilter = this.buildQueryFilter(typeFilter, query.queryBy);

    if (query.outputType === OutputType.Properties && this.isPropertiesValid(query) && this.isTakeValid(query)) {
      const workspaces = await this.loadWorkspaces();
      const systemAliases = await this.loadSystemAliases();
      const users = await this.loadUsers();
      return this.processWorkItemsProperties(query, combinedFilter, workspaces, systemAliases, users);
    }

    if (query.outputType === OutputType.TotalCount) {
      const totalCount = await this.queryWorkItemsCount(combinedFilter);
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

  private async processWorkItemsProperties(
    query: WorkItemsQuery,
    combinedFilter: string | undefined,
    workspaces: Map<string, Workspace>,
    systemAliases: Map<string, SystemAlias>,
    users: Map<string, User>
  ): Promise<DataFrameDTO> {
    const properties = query.properties ?? [];
    const builtInPropertyKeys = properties.filter((key): key is WorkItemPropertyKey =>
      Object.prototype.hasOwnProperty.call(WorkItemProperties, key)
    );
    const customKeys = properties.filter(key =>
      !Object.prototype.hasOwnProperty.call(WorkItemProperties, key)
    );

    // Compute projections from selected properties
    const projectionSet = new Set<WorkItemProjection>();
    for (const key of builtInPropertyKeys) {
      for (const proj of WorkItemProperties[key].projections) {
        projectionSet.add(proj);
      }
    }

    // Include PROPERTIES projection for custom keys
    const hasCustomProperties = customKeys.length > 0;
    if (hasCustomProperties) {
      projectionSet.add(WorkItemProjection.PROPERTIES);
    }

    const projection = [...projectionSet];

    // Fetch work items
    const workItems = await this.queryWorkItemsData(
      combinedFilter,
      projection,
      query.orderBy,
      query.descending,
      query.take
    );

    // Build flat (fan-out) rows
    const flatRows = this.buildFlatRows(workItems);

    // Gather all IDs for name resolution
    const assetIds: string[] = [];
    const targetParentIds: string[] = [];

    const needsAssetName = builtInPropertyKeys.includes(WorkItemPropertyKey.ASSET_NAME);
    const needsDutName = builtInPropertyKeys.includes(WorkItemPropertyKey.DUT_NAME);
    const needsFixtureName = builtInPropertyKeys.includes(WorkItemPropertyKey.FIXTURE_NAME);
    const needsTargetParent = builtInPropertyKeys.includes(WorkItemPropertyKey.TARGET_PARENT);

    for (const workItem of workItems) {
      if (needsAssetName) {
        workItem.resources?.assets?.selections?.forEach(s => s.id && assetIds.push(s.id));
      }
      if (needsDutName) {
        workItem.resources?.duts?.selections?.forEach(s => s.id && assetIds.push(s.id));
      }
      if (needsFixtureName) {
        workItem.resources?.fixtures?.selections?.forEach(s => s.id && assetIds.push(s.id));
      }
      if (needsTargetParent) {
        workItem.resources?.assets?.selections?.forEach(s => s.targetParentId && targetParentIds.push(s.targetParentId));
        workItem.resources?.duts?.selections?.forEach(s => s.targetParentId && targetParentIds.push(s.targetParentId));
        workItem.resources?.fixtures?.selections?.forEach(s => s.targetParentId && targetParentIds.push(s.targetParentId));
      }
    }

    // Resolve asset names (assets, DUTs, fixtures, and target parents all via niapm)
    const allAssetIdsToResolve = [...assetIds, ...targetParentIds];
    const assetNames = allAssetIdsToResolve.length > 0
      ? await this.assetUtils.queryAssetsInBatches(allAssetIdsToResolve)
      : new Map<string, string>();

    // Resolve parent work item names if needed
    const needsParentName = builtInPropertyKeys.includes(WorkItemPropertyKey.PARENT_NAME);
    const parentNames = needsParentName
      ? await this.resolveParentNames(workItems.map(w => w.parentId).filter(Boolean) as string[])
      : new Map<string, string>();

    // Build output fields
    const fields = this.buildOutputFields(
      builtInPropertyKeys,
      customKeys,
      flatRows,
      assetNames,
      systemAliases,
      workspaces,
      users,
      parentNames
    );

    return {
      refId: query.refId,
      name: query.refId,
      fields,
    };
  }

  private buildFlatRows(workItems: WorkItem[]): FlatRow[] {
    const rows: FlatRow[] = [];
    for (const workItem of workItems) {
      const assets = workItem.resources?.assets?.selections ?? [];
      const duts = workItem.resources?.duts?.selections ?? [];
      const fixtures = workItem.resources?.fixtures?.selections ?? [];
      const systems = workItem.resources?.systems?.selections ?? [];
      const maxRows = Math.max(assets.length, duts.length, fixtures.length, systems.length, 1);

      for (let i = 0; i < maxRows; i++) {
        rows.push({
          workItem,
          assetSelection: assets[i],
          dutSelection: duts[i],
          fixtureSelection: fixtures[i],
          systemSelection: systems[i],
        });
      }
    }
    return rows;
  }

  private buildOutputFields(
    properties: WorkItemPropertyKey[],
    customKeys: string[],
    flatRows: FlatRow[],
    assetNames: Map<string, string>,
    systemAliases: Map<string, SystemAlias>,
    workspaces: Map<string, Workspace>,
    users: Map<string, User>,
    parentNames: Map<string, string>
  ) {
    const fields = [];

    for (const key of properties) {
      if (key === WorkItemPropertyKey.TARGET_LOCATION) {
        fields.push({
          name: 'Target Location (Asset)',
          values: flatRows.map(row => {
            const id = row.assetSelection?.targetSystemId;
            return id ? (systemAliases.get(id)?.alias ?? id) : '';
          }),
          type: FieldType.string,
        });
        fields.push({
          name: 'Target Location (DUT)',
          values: flatRows.map(row => {
            const id = row.dutSelection?.targetSystemId;
            return id ? (systemAliases.get(id)?.alias ?? id) : '';
          }),
          type: FieldType.string,
        });
        fields.push({
          name: 'Target Location (Fixture)',
          values: flatRows.map(row => {
            const id = row.fixtureSelection?.targetSystemId;
            return id ? (systemAliases.get(id)?.alias ?? id) : '';
          }),
          type: FieldType.string,
        });
      } else if (key === WorkItemPropertyKey.TARGET_PARENT) {
        fields.push({
          name: 'Target Parent (Asset)',
          values: flatRows.map(row => {
            const parentId = row.assetSelection?.targetParentId;
            return parentId ? (assetNames.get(parentId) ?? parentId) : '';
          }),
          type: FieldType.string,
        });
        fields.push({
          name: 'Target Parent (DUT)',
          values: flatRows.map(row => {
            const parentId = row.dutSelection?.targetParentId;
            return parentId ? (assetNames.get(parentId) ?? parentId) : '';
          }),
          type: FieldType.string,
        });
        fields.push({
          name: 'Target Parent (Fixture)',
          values: flatRows.map(row => {
            const parentId = row.fixtureSelection?.targetParentId;
            return parentId ? (assetNames.get(parentId) ?? parentId) : '';
          }),
          type: FieldType.string,
        });
      } else {
        const fieldType = this.getPropertyFieldType(key);
        fields.push({
          name: WorkItemProperties[key].label,
          values: flatRows.map(row =>
            this.getPropertyValue(key, row, assetNames, systemAliases, workspaces, users, parentNames)
          ),
          type: fieldType,
        });
      }
    }

    // Custom property columns
    for (const customKey of customKeys) {
      fields.push({
        name: customKey,
        values: flatRows.map(row => this.formatOutputValue(row.workItem.properties?.[customKey])),
        type: FieldType.string,
      });
    }

    return fields;
  }

  private getPropertyValue(
    key: WorkItemPropertyKey,
    row: FlatRow,
    assetNames: Map<string, string>,
    systemAliases: Map<string, SystemAlias>,
    workspaces: Map<string, Workspace>,
    users: Map<string, User>,
    parentNames: Map<string, string>
  ): string {
    const { workItem, assetSelection, dutSelection, fixtureSelection, systemSelection } = row;

    switch (key) {
      case WorkItemPropertyKey.ID: return workItem.id ?? '';
      case WorkItemPropertyKey.NAME: return workItem.name ?? '';
      case WorkItemPropertyKey.TYPE: return this.formatWorkItemTypeLabel(workItem.type);
      case WorkItemPropertyKey.STATE: return this.formatStateLabel(workItem.state);
      case WorkItemPropertyKey.SUBSTATE: return workItem.substate ?? '';
      case WorkItemPropertyKey.DESCRIPTION: return workItem.description ?? '';
      case WorkItemPropertyKey.TEST_PROGRAM: return workItem.testProgram ?? '';
      case WorkItemPropertyKey.PART_NUMBER: return workItem.partNumber ?? '';
      case WorkItemPropertyKey.WORKSPACE: {
        const ws = workspaces.get(workItem.workspace ?? '');
        return ws?.name ?? workItem.workspace ?? '';
      }
      case WorkItemPropertyKey.ASSIGNED_TO: {
        const user = users.get(workItem.assignedTo ?? '');
        return user ? UsersUtils.getUserFullName(user) : '';
      }
      case WorkItemPropertyKey.REQUESTED_BY: {
        const user = users.get(workItem.requestedBy ?? '');
        return user ? UsersUtils.getUserFullName(user) : '';
      }
      case WorkItemPropertyKey.CREATED_BY: {
        const user = users.get(workItem.createdBy ?? '');
        return user ? UsersUtils.getUserFullName(user) : '';
      }
      case WorkItemPropertyKey.UPDATED_BY: {
        const user = users.get(workItem.updatedBy ?? '');
        return user ? UsersUtils.getUserFullName(user) : '';
      }
      case WorkItemPropertyKey.CREATED_AT: return workItem.createdAt ?? '';
      case WorkItemPropertyKey.UPDATED_AT: return workItem.updatedAt ?? '';
      case WorkItemPropertyKey.PARENT_ID: return workItem.parentId ?? '';
      case WorkItemPropertyKey.PARENT_NAME: {
        return parentNames.get(workItem.parentId ?? '') ?? workItem.parentId ?? '';
      }
      case WorkItemPropertyKey.TEMPLATE_ID: return workItem.templateId ?? '';
      case WorkItemPropertyKey.EARLIEST_START_DATE: return workItem.timeline?.earliestStartDateTime ?? '';
      case WorkItemPropertyKey.DUE_DATE: return workItem.timeline?.dueDateTime ?? '';
      case WorkItemPropertyKey.ESTIMATED_DURATION: {
        const secs = workItem.timeline?.estimatedDurationInSeconds;
        return secs != null ? transformDuration(secs) : '';
      }
      case WorkItemPropertyKey.PLANNED_START_DATE: return workItem.schedule?.plannedStartDateTime ?? '';
      case WorkItemPropertyKey.PLANNED_END_DATE: return workItem.schedule?.plannedEndDateTime ?? '';
      case WorkItemPropertyKey.PLANNED_DURATION: {
        const secs = workItem.schedule?.plannedDurationInSeconds;
        return secs != null ? transformDuration(secs) : '';
      }
      case WorkItemPropertyKey.SYSTEM_ID: return systemSelection?.id ?? '';
      case WorkItemPropertyKey.SYSTEM_NAME: {
        const alias = systemAliases.get(systemSelection?.id ?? '');
        return alias?.alias ?? systemSelection?.id ?? '';
      }
      case WorkItemPropertyKey.ASSET_ID: return assetSelection?.id ?? '';
      case WorkItemPropertyKey.ASSET_NAME: {
        return assetNames.get(assetSelection?.id ?? '') ?? assetSelection?.id ?? '';
      }
      case WorkItemPropertyKey.DUT_ID: return dutSelection?.id ?? '';
      case WorkItemPropertyKey.DUT_NAME: {
        return assetNames.get(dutSelection?.id ?? '') ?? dutSelection?.id ?? '';
      }
      case WorkItemPropertyKey.FIXTURE_ID: return fixtureSelection?.id ?? '';
      case WorkItemPropertyKey.FIXTURE_NAME: {
        return assetNames.get(fixtureSelection?.id ?? '') ?? fixtureSelection?.id ?? '';
      }
      default: return '';
    }
  }

  private formatStateLabel(value?: string): string {
    if (!value) {
      return '';
    }

    return this.workItemStateLabelMap[value] ?? value;
  }

  private getPropertyFieldType(key: WorkItemPropertyKey): FieldType {
    switch (key) {
      case WorkItemPropertyKey.CREATED_AT:
      case WorkItemPropertyKey.UPDATED_AT:
      case WorkItemPropertyKey.EARLIEST_START_DATE:
      case WorkItemPropertyKey.DUE_DATE:
      case WorkItemPropertyKey.PLANNED_START_DATE:
      case WorkItemPropertyKey.PLANNED_END_DATE:
        return FieldType.time;
      default:
        return FieldType.string;
    }
  }

  private formatOutputValue(value: unknown): string {
    if (value == null) {
      return '';
    }

    if (typeof value === 'object') {
      return Object.keys(value as Record<string, unknown>).length > 0 ? JSON.stringify(value) : '';
    }

    return String(value);
  }

  async queryWorkItemsData(
    filter?: string,
    projection?: string[],
    orderBy?: string,
    descending?: boolean,
    take?: number
  ): Promise<WorkItem[]> {
    const queryRecord = async (currentTake: number, token?: string): Promise<QueryResponse<WorkItem>> => {
      const body: QueryWorkItemsRequestBody = {
        filter,
        projection,
        orderBy,
        descending,
        take: currentTake,
        continuationToken: token,
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
        { showErrorAlert: false }
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

  async loadWorkItemTypes(): Promise<Array<SelectableValue<string>>> {
    if (this.workItemTypesCache) {
      return this.workItemTypesCache;
    }
    try {
      const response = await this.get<GetWorkItemTypesResponse>(
        this.workItemTypesUrl,
        { showErrorAlert: false }
      );
      const types = response.workItemTypes ?? [];
      this.workItemTypesCache = types
        .filter(t => t.type != null)
        .map(t => ({
          label: this.formatWorkItemTypeLabel(t.type!),
          value: t.type!,
        }));
      return this.workItemTypesCache;
    } catch {
      return [];
    }
  }

  async loadCustomPropertyKeys(): Promise<string[]> {
    try {
      const response = await this.post<WorkItemsResponse>(
        this.queryWorkItemsUrl,
        {
          projection: [WorkItemProjection.PROPERTIES],
          take: 1000,
        } as QueryWorkItemsRequestBody,
        { showErrorAlert: false }
      );
      const allKeys = new Set<string>();
      for (const workItem of response.workItems ?? []) {
        for (const key of Object.keys(workItem.properties ?? {})) {
          allKeys.add(key);
        }
      }
      return Array.from(allKeys).sort();
    } catch {
      return [];
    }
  }

  private async resolveParentNames(parentIds: string[]): Promise<Map<string, string>> {
    const uniqueIds = [...new Set(parentIds.filter(Boolean))];
    if (uniqueIds.length === 0) {
      return new Map();
    }
    const filter = uniqueIds.map(id => `id = "${id}"`).join(' || ');
    try {
      const response = await this.post<WorkItemsResponse>(
        this.queryWorkItemsUrl,
        {
          filter,
          projection: [WorkItemProjection.ID, WorkItemProjection.NAME],
          take: uniqueIds.length,
        } as QueryWorkItemsRequestBody,
        { showErrorAlert: false }
      );
      const nameMap = new Map<string, string>();
      for (const item of response.workItems ?? []) {
        if (item.id && item.name) {
          nameMap.set(item.id, item.name);
        }
      }
      return nameMap;
    } catch {
      return new Map();
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

  shouldRunQuery(query: WorkItemsQuery): boolean {
    return !query.hide;
  }

  readonly workItemsComputedDataFields = new Map<string, ExpressionTransformFunction>(
    Object.values(WorkItemsQueryBuilderFieldNames).map(fieldName => [
      fieldName,
      isTimeField(fieldName) ? timeFieldsQuery(fieldName) : multipleValuesQuery(fieldName),
    ])
  );

  async metricFindQuery(
    query: WorkItemsVariableQuery,
    options: LegacyMetricFindQueryOptions
  ): Promise<MetricFindValue[]> {
    const variableQuery = this.prepareQuery(query);
    if (!this.isTakeValid(variableQuery)) {
      return [];
    }

    const queryByFilter = variableQuery.queryBy
      ? transformComputedFieldsQuery(
          this.templateSrv.replace(variableQuery.queryBy, options.scopedVars),
          this.workItemsComputedDataFields
        )
      : undefined;

    const typeFilter = this.buildTypeFilterClause(
      variableQuery.workItemTypes?.map(t => this.templateSrv.replace(t, options.scopedVars))
    );
    const filter = this.buildQueryFilter(typeFilter, queryByFilter);

    const workItems = await this.queryWorkItemsData(
      filter,
      [WorkItemProjection.ID, WorkItemProjection.NAME],
      variableQuery.orderBy,
      variableQuery.descending,
      variableQuery.take
    );

    return workItems
      .map(item => ({ text: `${item.name ?? ''} (${item.id ?? ''})`, value: item.id ?? '' }))
      .sort((a, b) => a.text.localeCompare(b.text));
  }

  async testDatasource(): Promise<TestDataSourceResponse> {
    await this.post(
      this.queryWorkItemsUrl,
      { take: 1 } as QueryWorkItemsRequestBody,
      { showErrorAlert: false }
    );
    return { status: 'success', message: 'Data source connected and authentication successful!' };
  }

  private buildTypeFilterClause(workItemTypes?: string[]): string | undefined {
    if (!workItemTypes || workItemTypes.length === 0 || workItemTypes.includes(ALL_WORK_ITEM_TYPES_VALUE)) {
      return undefined;
    }

    const normalizedTypes = workItemTypes
      .flatMap(value => this.parseTypeFilterValues(value))
      .filter(value => !!value && value !== ALL_WORK_ITEM_TYPES_VALUE);

    if (normalizedTypes.length === 0) {
      return undefined;
    }

    const uniqueTypes = Array.from(new Set(normalizedTypes));
    return uniqueTypes.map(t => `type = "${t}"`).join(' || ');
  }

  private parseTypeFilterValues(value: string): string[] {
    if (!value) {
      return [];
    }

    // Grafana variables can expand into: "a", "a,b", or "{a,b}".
    const cleaned = value.replace(/^\{/, '').replace(/\}$/, '');
    return cleaned
      .split(',')
      .map(part => part.trim())
      .map(part => part.replace(/^"/, '').replace(/"$/, ''))
      .filter(Boolean);
  }

  protected buildQueryFilter(filterA?: string, filterB?: string): string | undefined {
    const filters = [filterA, filterB].filter(Boolean);
    return filters.length > 0 ? filters.join(' && ') : undefined;
  }

  private formatWorkItemTypeLabel(type?: string): string {
    if (!type) {
      return '';
    }

    const knownLabels: Record<string, string> = {
      testplan: 'Test plan',
      workorder: 'Work order',
      job: 'Job',
      maintenance: 'Maintenance',
      calibration: 'Calibration',
      reservation: 'Reservation',
      transportorder: 'Transport order',
    };

    const normalizedType = type.toLowerCase().replace(/[_\-\s]+/g, '');
    return knownLabels[normalizedType] ?? type;
  }

  private isTakeValid(query: WorkItemsQuery | WorkItemsVariableQuery): boolean {
    return query.take !== undefined && query.take >= 0 && query.take <= TAKE_LIMIT;
  }

  private isPropertiesValid(query: WorkItemsQuery): boolean {
    return !!query.properties && query.properties.length > 0;
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
