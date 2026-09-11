import {
  AppEvents,
  DataFrameDTO,
  DataQueryRequest,
  DataSourceInstanceSettings,
  FieldDTO,
  FieldType,
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
import { AssetUtils, AssetProjectionProperties } from 'shared/asset.utils';
import { WorkspaceUtils } from 'shared/workspace.utils';
import { queryInBatches } from 'core/utils';
import {
  FlattenedRow,
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
  WORK_ITEM_PROPERTIES_PROJECTIONS,
  WORK_ITEM_TYPE_FILTER_VALUES,
  WORK_ITEM_TYPE_LABEL_MAP,
  WORK_ITEM_STATE_LABEL_MAP,
  USER_PROPERTY_FIELDS,
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
    this.assetUtils = new AssetUtils(this.instanceSettings, this.backendSrv);
    this.systemUtils = new SystemUtils(this.instanceSettings, this.backendSrv);
  }

  baseUrl = `${this.instanceSettings.url}/niworkitem/v1`;
  queryWorkItemsUrl = `${this.baseUrl}/query-workitems`;

  errorTitle = '';
  errorDescription = '';
  
  productUtils: ProductUtils;
  usersUtils: UsersUtils;
  workspaceUtils: WorkspaceUtils;
  systemUtils: SystemUtils;
  assetUtils: AssetUtils;

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
    const isWorkspaceSelected = this.isPropertySelected(WorkItemPropertiesOptions.WORKSPACE, query.properties);
    const workspacesLookup = isWorkspaceSelected
      ? await this.loadWorkspaces()
      : new Map<string, Workspace>();
    const usersLookup = this.isUserLookupRequired(query.properties)
      ? await this.loadUsers()
      : new Map<string, User>();
    const systemAliasesLookup = this.isSystemNameLookupRequired(query.properties)
      ? await this.loadSystemAliases()
      : new Map<string, SystemAlias>();

    const workItemsResponse = await this.queryWorkItemsData(
      filter,
      query.properties,
      query.orderBy,
      query.descending,
      query.take
    );
    const flattenedRows = this.buildFlattenedRows(workItemsResponse);

    const isParentWorkItemNameSelected = this.isPropertySelected(
      WorkItemPropertiesOptions.PARENT_WORK_ITEM_NAME,
      query.properties
    );
    const parentWorkItemNamesLookup = isParentWorkItemNameSelected
      ? await this.loadParentWorkItemNames(workItemsResponse)
      : new Map<string, string>();
    const assetNamesLookup = this.isResourceNameLookupRequired(query.properties)
      ? await this.loadAssetNames(workItemsResponse, query.properties)
      : new Map<string, string>();

    return {
      refId: query.refId,
      name: query.refId,
      fields: this.buildFields(
        query.properties,
        flattenedRows,
        workspacesLookup,
        usersLookup,
        parentWorkItemNamesLookup,
        assetNamesLookup,
        systemAliasesLookup
      ),
    };
  }

  private isPropertySelected(
    selectedProperty: WorkItemPropertiesOptions,
    properties?: WorkItemPropertiesOptions[]
  ): boolean {
    return !!properties?.includes(selectedProperty);
  }

  private isUserLookupRequired(properties?: WorkItemPropertiesOptions[]): boolean {
    return !!properties?.some(property =>
      Object.keys(USER_PROPERTY_FIELDS).includes(property)
    );
  }

  private isResourceNameLookupRequired(properties?: WorkItemPropertiesOptions[]): boolean {
    return !!properties?.some(property =>
      [
        WorkItemPropertiesOptions.ASSET_NAME,
        WorkItemPropertiesOptions.DUT_NAME,
        WorkItemPropertiesOptions.FIXTURE_NAME,
        WorkItemPropertiesOptions.TARGET_PARENT,
      ].includes(property)
    );
  }

  private isSystemNameLookupRequired(properties?: WorkItemPropertiesOptions[]): boolean {
    return !!properties?.some(property =>
      [WorkItemPropertiesOptions.SYSTEM_NAME, WorkItemPropertiesOptions.TARGET_LOCATION].includes(property)
    );
  }

  private buildFlattenedRows(workItems: WorkItem[]): FlattenedRow[] {
    const rows: FlattenedRow[] = [];
    for (const workItem of workItems) {
      const assets = workItem.resources?.assets?.selections ?? [];
      const duts = workItem.resources?.duts?.selections ?? [];
      const fixtures = workItem.resources?.fixtures?.selections ?? [];
      const systems = workItem.resources?.systems?.selections ?? [];
      const maxRows = Math.max(assets.length, duts.length, fixtures.length, systems.length, 1);

      for (let rowIndex = 0; rowIndex < maxRows; rowIndex++) {
        rows.push({
          workItem,
          assetSelection: assets[rowIndex],
          dutSelection: duts[rowIndex],
          fixtureSelection: fixtures[rowIndex],
          systemSelection: systems[rowIndex],
        });
      }
    }
    return rows;
  }

  private async loadAssetNames(
    workItems: WorkItem[],
    properties?: WorkItemPropertiesOptions[]
  ): Promise<Map<string, string>> {
    const isAssetNameSelected = this.isPropertySelected(WorkItemPropertiesOptions.ASSET_NAME, properties);
    const isDutNameSelected = this.isPropertySelected(WorkItemPropertiesOptions.DUT_NAME, properties);
    const isFixtureNameSelected = this.isPropertySelected(WorkItemPropertiesOptions.FIXTURE_NAME, properties);
    const isTargetParentSelected = this.isPropertySelected(WorkItemPropertiesOptions.TARGET_PARENT, properties);

    const ids: string[] = [];
    workItems.forEach(workItem => {
      if (isAssetNameSelected) {
        workItem.resources?.assets?.selections?.forEach(s => s.id && ids.push(s.id));
      }
      if (isDutNameSelected) {
        workItem.resources?.duts?.selections?.forEach(s => s.id && ids.push(s.id));
      }
      if (isFixtureNameSelected) {
        workItem.resources?.fixtures?.selections?.forEach(s => s.id && ids.push(s.id));
      }
      if (isTargetParentSelected) {
        workItem.resources?.assets?.selections?.forEach(s => s.targetParentId && ids.push(s.targetParentId));
        workItem.resources?.duts?.selections?.forEach(s => s.targetParentId && ids.push(s.targetParentId));
        workItem.resources?.fixtures?.selections?.forEach(s => s.targetParentId && ids.push(s.targetParentId));
      }
    });

    if (ids.length === 0) {
      return new Map<string, string>();
    }

    const assets = await this.assetUtils.queryAssetsInBatches(ids, [
      AssetProjectionProperties.ID,
      AssetProjectionProperties.NAME,
    ]);
    return new Map(assets.map(asset => [asset.id, asset.name ?? asset.id]));
  }

  private resolveAssetName(id: string | undefined, assetNames: Map<string, string>): string {
    return id ? assetNames.get(id) ?? id : '';
  }

  private resolveSystemAlias(id: string | undefined, systemAliases: Map<string, SystemAlias>): string {
    return id ? systemAliases.get(id)?.alias ?? id : '';
  }

  private async loadParentWorkItemNames(workItems: WorkItem[]): Promise<Map<string, string>> {
    const parentWorkitemIds = [
      ...new Set(workItems.map(workItem => workItem.parentId).filter((id): id is string => !!id)),
    ];
    if (parentWorkitemIds.length === 0) {
      return new Map<string, string>();
    }

    try {
      const parentWorkItems = await this.queryWorkItemsData(
        parentWorkitemIds.map(id => `id = "${id}"`).join(' || '),
        [WorkItemPropertiesOptions.ID, WorkItemPropertiesOptions.NAME],
        undefined,
        undefined,
        parentWorkitemIds.length,
        true
      );

      const parentWorkItemNameMap = new Map<string, string>();
      parentWorkItems.forEach(parentWorkItem => {
        parentWorkItemNameMap.set(parentWorkItem.id, parentWorkItem.name);
      });
      return parentWorkItemNameMap;
    } catch {
      return new Map<string, string>();
    }
  }

  private buildFields(
    properties: WorkItemPropertiesOptions[] | undefined,
    flattenedRows: FlattenedRow[],
    workspacesLookup: Map<string, Workspace>,
    usersLookup: Map<string, User>,
    parentWorkItemNamesLookup: Map<string, string>,
    assetNamesLookup: Map<string, string>,
    systemAliasesLookup: Map<string, SystemAlias>
  ) {
    const fields: FieldDTO[] = [];

    (properties ?? []).forEach(property => {
      if (property === WorkItemPropertiesOptions.TARGET_LOCATION) {
        fields.push(...this.buildTargetLocationFields(flattenedRows, systemAliasesLookup));
        return;
      }

      if (property === WorkItemPropertiesOptions.TARGET_PARENT) {
        fields.push(...this.buildTargetParentFields(flattenedRows, assetNamesLookup));
        return;
      }

      const fieldValue = flattenedRows.map(row =>
        this.getPropertyValue(
          property,
          row,
          workspacesLookup,
          usersLookup,
          parentWorkItemNamesLookup,
          assetNamesLookup,
          systemAliasesLookup
        )
      );
      const fieldType = this.getPropertyFieldType(property);
      fields.push({
        name: WorkItemProperties[property].label,
        values: fieldValue,
        type: fieldType,
        ...(fieldType === FieldType.time && { config: { unit: 'time:YYYY-MM-DD HH:mm:ss' } }),
      });
    });

    return fields;
  }

  private buildTargetLocationFields(
    flattenedRows: FlattenedRow[],
    systemAliasesLookup: Map<string, SystemAlias>
  ): FieldDTO[] {
    return [
      this.buildResourceField('Target Location (Asset)', flattenedRows, row =>
        this.resolveSystemAlias(row.assetSelection?.targetSystemId, systemAliasesLookup)
      ),
      this.buildResourceField('Target Location (DUT)', flattenedRows, row =>
        this.resolveSystemAlias(row.dutSelection?.targetSystemId, systemAliasesLookup)
      ),
      this.buildResourceField('Target Location (Fixture)', flattenedRows, row =>
        this.resolveSystemAlias(row.fixtureSelection?.targetSystemId, systemAliasesLookup)
      ),
    ];
  }

  private buildTargetParentFields(flattenedRows: FlattenedRow[], assetNamesLookup: Map<string, string>): FieldDTO[] {
    return [
      this.buildResourceField('Target Parent (Asset)', flattenedRows, row =>
        this.resolveAssetName(row.assetSelection?.targetParentId, assetNamesLookup)
      ),
      this.buildResourceField('Target Parent (DUT)', flattenedRows, row =>
        this.resolveAssetName(row.dutSelection?.targetParentId, assetNamesLookup)
      ),
      this.buildResourceField('Target Parent (Fixture)', flattenedRows, row =>
        this.resolveAssetName(row.fixtureSelection?.targetParentId, assetNamesLookup)
      ),
    ];
  }

  private buildResourceField(
    name: string,
    flattenedRows: FlattenedRow[],
    resolver: (row: FlattenedRow) => string
  ): FieldDTO {
    return { name, values: flattenedRows.map(resolver), type: FieldType.string };
  }

  private getPropertyValue(
    property: WorkItemPropertiesOptions,
    row: FlattenedRow,
    workspacesLookup: Map<string, Workspace>,
    usersLookup: Map<string, User>,
    parentWorkItemNamesLookup: Map<string, string>,
    assetNames: Map<string, string>,
    systemAliases: Map<string, SystemAlias>
  ): string | null {
    const workItem = row.workItem;
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
        const workspace = workspacesLookup.get(workItem.workspace ?? '');
        return workspace ? workspace.name : workItem.workspace ?? '';
      }
      case WorkItemPropertiesOptions.ASSIGNED_TO:
      case WorkItemPropertiesOptions.REQUESTED_BY:
      case WorkItemPropertiesOptions.CREATED_BY:
      case WorkItemPropertiesOptions.UPDATED_BY: {
        const userField = USER_PROPERTY_FIELDS[property]!;
        const userId = workItem[userField] as string | undefined;
        const user = usersLookup.get(userId ?? '');
        return user ? UsersUtils.getUserFullName(user) : userId ?? '';
      }
      case WorkItemPropertiesOptions.PARENT_WORK_ITEM_NAME: {
        if (!workItem.parentId) {
          return '';
        }
        return parentWorkItemNamesLookup.get(workItem.parentId) ?? '';
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
      case WorkItemPropertiesOptions.ASSET_ID:
        return row.assetSelection?.id ?? '';
      case WorkItemPropertiesOptions.ASSET_NAME:
        return this.resolveAssetName(row.assetSelection?.id, assetNames);
      case WorkItemPropertiesOptions.DUT_ID:
        return row.dutSelection?.id ?? '';
      case WorkItemPropertiesOptions.DUT_NAME:
        return this.resolveAssetName(row.dutSelection?.id, assetNames);
      case WorkItemPropertiesOptions.FIXTURE_ID:
        return row.fixtureSelection?.id ?? '';
      case WorkItemPropertiesOptions.FIXTURE_NAME:
        return this.resolveAssetName(row.fixtureSelection?.id, assetNames);
      case WorkItemPropertiesOptions.SYSTEM_ID:
        return row.systemSelection?.id ?? '';
      case WorkItemPropertiesOptions.SYSTEM_NAME:
        return this.resolveSystemAlias(row.systemSelection?.id, systemAliases);
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
    suppressErrorAlert = false
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
      const response = await this.queryWorkItems(body, suppressErrorAlert);

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

  async queryWorkItems(
    body: QueryWorkItemsRequestBody,
    suppressErrorAlert = false
  ): Promise<WorkItemsResponse> {
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

      if (!suppressErrorAlert) {
        this.appEvents?.publish?.({
          type: AppEvents.alertError.name,
          payload: ['Error during work items query', errorMessage],
        });
      }

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
}
