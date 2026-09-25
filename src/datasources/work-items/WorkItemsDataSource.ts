import {
  AppEvents,
  DataFrameDTO,
  DataQueryRequest,
  DataSourceInstanceSettings,
  FieldDTO,
  FieldType,
  LegacyMetricFindQueryOptions,
  MetricFindValue,
  ScopedVars,
  TestDataSourceResponse,
} from '@grafana/data';
import { BackendSrv, TemplateSrv, getBackendSrv, getTemplateSrv } from '@grafana/runtime';
import { ComboboxOption } from '@grafana/ui';
import { DataSourceBase } from 'core/DataSourceBase';
import { QueryBuilderOption, QueryResponse, Workspace } from 'core/types';
import { getQueryError, getQueryBuilderLookupsError } from 'core/errors';
import { ProductUtils } from 'shared/product.utils';
import { ProductPartNumberAndName } from 'shared/types/QueryProducts.types';
import { SystemUtils } from 'shared/system.utils';
import { SystemAlias } from 'shared/types/QuerySystems.types';
import { UsersUtils } from 'shared/users.utils';
import { User } from 'shared/types/QueryUsers.types';
import { AssetUtils, AssetProjectionProperties } from 'shared/asset.utils';
import { WorkspaceUtils } from 'shared/workspace.utils';
import { LocationUtils } from 'shared/location.utils';
import { Location } from 'shared/types/QueryLocations.types';
import { queryInBatches, replaceVariables, transformDuration } from 'core/utils';
import {
  computedFieldsupportedOperations,
  ExpressionTransformFunction,
  multipleValuesQuery,
  timeFieldsQuery,
  transformComputedFieldsQuery,
} from 'core/query-builder.utils';
import {
  FlattenedRow,
  OrderByOptions,
  OutputType,
  QueryWorkItemsRequestBody,
  ResourceSelection,
  WorkItem,
  WorkItemPropertiesGroup,
  WorkItemPropertiesOptions,
  WorkItemsQuery,
  WorkItemsResponse,
  WorkItemsVariableQuery,
  WorkItemsVariableQueryType,
  WorkItemState,
  WorkItemTypeOptions,
} from './types';
import {
  DEFAULT_TAKE,
  SECONDS_IN_DAY,
  SECONDS_IN_HOUR,
  WORK_ITEM_PROPERTIES_PROJECTION,
  WORK_ITEM_PROPERTIES_PROJECTIONS,
  WORK_ITEM_TYPE_LABEL_MAP,
  WORK_ITEM_STATE_OPTIONS,
  USER_PROPERTY_FIELDS,
  CUSTOM_PROPERTY_OPTIONS_LIMIT,
  CUSTOM_PROPERTY_SUFFIX,
} from './constants';
import { WorkItemsQueryBuilderFieldNames } from './constants/WorkItemsQueryBuilder.constants';
import {
  QUERY_WORK_ITEMS_MAX_TAKE,
  QUERY_WORK_ITEMS_REQUEST_PER_SECOND,
} from './constants/QueryWorkItems.constants';
import {
  typesErrorMessages,
  WorkItemProperties,
  WorkItemTypeLabels,
  WorkItemTypeMetricFindValues,
} from './constants/QueryEditor.constants';
import { getTakeError, isPropertiesNonEmpty, isTakeValid, isTypesNonEmpty } from './utils';

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
    this.locationUtils = new LocationUtils(instanceSettings, backendSrv);
    this.assetUtils = new AssetUtils(this.instanceSettings, this.backendSrv);
  }

  baseUrl = `${this.instanceSettings.url}/niworkitem/v1`;
  queryWorkItemsUrl = `${this.baseUrl}/query-workitems`;

  errorTitle = '';
  errorDescription = '';

  durationNumberPattern = '-?\\d+(?:\\.\\d+)?';
  durationOperationsPattern = computedFieldsupportedOperations.join('|');
  
  productUtils: ProductUtils;
  usersUtils: UsersUtils;
  workspaceUtils: WorkspaceUtils;
  systemUtils: SystemUtils;
  locationUtils: LocationUtils;
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

  defaultVariableQuery: Omit<WorkItemsVariableQuery, 'refId'> = {
    queryType: WorkItemsVariableQueryType.ListWorkItems,
    types: Object.values(WorkItemTypeOptions),
    orderBy: OrderByOptions.UPDATED_AT,
    descending: true,
    take: DEFAULT_TAKE,
  };

  durationFilterConversions = [
    {
      fieldName: WorkItemsQueryBuilderFieldNames.EstimatedDurationInDays,
      target: 'timeline.estimatedDurationInSeconds',
      factor: SECONDS_IN_DAY,
    },
    {
      fieldName: WorkItemsQueryBuilderFieldNames.EstimatedDurationInHours,
      target: 'timeline.estimatedDurationInSeconds',
      factor: SECONDS_IN_HOUR,
    },
    {
      fieldName: WorkItemsQueryBuilderFieldNames.PlannedDurationInDays,
      target: 'schedule.plannedDurationInSeconds',
      factor: SECONDS_IN_DAY,
    },
    {
      fieldName: WorkItemsQueryBuilderFieldNames.PlannedDurationInHours,
      target: 'schedule.plannedDurationInSeconds',
      factor: SECONDS_IN_HOUR,
    },
  ].map(({ fieldName, target, factor }) => {
    const pattern = `${fieldName}\\s*(${this.durationOperationsPattern})\\s*"(${this.durationNumberPattern})"`;
    return { target, factor, regex: new RegExp(pattern, 'g') };
  });

  // Date/time filter fields whose values may contain time macros (e.g. ${__now:date}).
  private readonly timeFilterFields: string[] = [
    WorkItemsQueryBuilderFieldNames.CreatedAt,
    WorkItemsQueryBuilderFieldNames.UpdatedAt,
    WorkItemsQueryBuilderFieldNames.EarliestStartDate,
    WorkItemsQueryBuilderFieldNames.DueDate,
    WorkItemsQueryBuilderFieldNames.PlannedStartDate,
    WorkItemsQueryBuilderFieldNames.PlannedEndDate,
  ];

  // Computed field transformations applied to the query builder filter so template variables
  // (including multi-value variables and time macros) are expanded into valid query expressions.
  // Every field is mapped; property and resource fields are harmless to include because their
  // expressions never match the operation patterns in transformComputedFieldsQuery.
  readonly workItemsComputedDataFields = new Map<string, ExpressionTransformFunction>(
    Object.values(WorkItemsQueryBuilderFieldNames).map(field => [
      field,
      this.timeFilterFields.includes(field) ? timeFieldsQuery(field) : multipleValuesQuery(field),
    ])
  );

  readonly globalVariableOptions = (): QueryBuilderOption[] => this.getVariableOptions();


  prepareVariableQuery(query: WorkItemsVariableQuery): WorkItemsVariableQuery {
    return {
      ...this.defaultVariableQuery,
      ...query
    };
  }
  async runQuery(query: WorkItemsQuery, options: DataQueryRequest<WorkItemsQuery>): Promise<DataFrameDTO> {
    if (!isTypesNonEmpty(query.types)) {
      throw new Error(typesErrorMessages.atLeastOneRequired);
    }

    if (query.outputType === OutputType.TotalCount) {
      return this.processTotalCountQuery(query, options.scopedVars);
    }

    if (query.outputType === OutputType.Properties) {
      const takeError = getTakeError(query.take);
      if (takeError !== '') {
        throw new Error(takeError);
      }

      if (
        !isPropertiesNonEmpty(query.properties, query.customProperties) ||
        !isTakeValid(query.take)
      ) {
        return this.getEmptyDataFrameDTO(query.refId);
      }

      const { filter, hasRecognizedTypes } = this.buildWorkItemsFilter(
        query.types!,
        query.filter,
        options.scopedVars
      );

      if (!hasRecognizedTypes) {
        return this.getEmptyDataFrameDTO(query.refId);
      }

      return this.processWorkItemsQuery(query, filter);
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
    const locationsLookup = this.isPropertySelected(WorkItemPropertiesOptions.TARGET_LOCATION, query.properties)
      ? await this.loadLocations()
      : new Map<string, Location>();
    const productsLookup = this.isProductLookupRequired(query.properties)
      ? await this.loadProductNamesAndPartNumbers()
      : new Map<string, ProductPartNumberAndName>();

    const workItemsResponse = await this.queryWorkItemsData(
      filter,
      query.properties,
      query.customProperties,
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
    const assetNamesLookup = this.isAssetNameLookupRequired(query.properties)
      ? await this.loadAssetNames(workItemsResponse, query.properties)
      : new Map<string, string>();

    return {
      refId: query.refId,
      name: query.refId,
      fields: this.buildFields(
        query.properties ?? [],
        query.customProperties,
        flattenedRows,
        workspacesLookup,
        usersLookup,
        parentWorkItemNamesLookup,
        assetNamesLookup,
        systemAliasesLookup,
        locationsLookup,
        productsLookup
      ),
    };
  }

  /** Builds the same filter for the data query and the custom property discovery query. */
  public buildFilterFromQuery(query: WorkItemsQuery): string | undefined {
    const { filter, hasRecognizedTypes } = this.buildWorkItemsFilter(query.types ?? [], query.filter);

    return hasRecognizedTypes ? filter : undefined;
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

  private isPropertySelected(
    selectedProperty: WorkItemPropertiesOptions,
    properties?: WorkItemPropertiesOptions[]
  ): boolean {
    return this.isAnyPropertySelected([selectedProperty], properties);
  }

  private isAnyPropertySelected(
    expectedProperties: WorkItemPropertiesOptions[],
    properties?: WorkItemPropertiesOptions[]
  ): boolean {
    return !!properties?.some(property => expectedProperties.includes(property));
  }

  private isUserLookupRequired(properties?: WorkItemPropertiesOptions[]): boolean {
    return this.isAnyPropertySelected(
      Object.keys(USER_PROPERTY_FIELDS) as WorkItemPropertiesOptions[],
      properties
    );
  }

  private isAssetNameLookupRequired(properties?: WorkItemPropertiesOptions[]): boolean {
    return this.isAnyPropertySelected(
      [
        WorkItemPropertiesOptions.ASSET_NAME,
        WorkItemPropertiesOptions.DUT_NAME,
        WorkItemPropertiesOptions.FIXTURE_NAME,
        WorkItemPropertiesOptions.TARGET_PARENT,
      ],
      properties
    );
  }

  private isSystemNameLookupRequired(properties?: WorkItemPropertiesOptions[]): boolean {
    return this.isAnyPropertySelected(
      [
        WorkItemPropertiesOptions.SYSTEM_NAME,
        WorkItemPropertiesOptions.TARGET_LOCATION,
      ],
      properties
    );
  }

  private isProductLookupRequired(properties?: WorkItemPropertiesOptions[]): boolean {
    return this.isAnyPropertySelected(
      [
        WorkItemPropertiesOptions.PRODUCT_ID,
        WorkItemPropertiesOptions.PRODUCT_NAME,
      ],
      properties
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
        workItem.resources?.assets?.selections?.forEach(
          selection => selection.id && ids.push(selection.id)
        );
      }
      if (isDutNameSelected) {
        workItem.resources?.duts?.selections?.forEach(
          selection => selection.id && ids.push(selection.id)
        );
      }
      if (isFixtureNameSelected) {
        workItem.resources?.fixtures?.selections?.forEach(
          selection => selection.id && ids.push(selection.id)
        );
      }
      if (isTargetParentSelected) {
        workItem.resources?.assets?.selections?.forEach(
          selection => selection.targetParentId && ids.push(selection.targetParentId)
        );
        workItem.resources?.duts?.selections?.forEach(
          selection => selection.targetParentId && ids.push(selection.targetParentId)
        );
      }
    });

    if (ids.length === 0) {
      return new Map<string, string>();
    }

    const assets = await this.assetUtils.queryAssetsInBatches(ids, [
      AssetProjectionProperties.ID,
      AssetProjectionProperties.NAME,
    ]);
    return new Map(assets.map(asset => [asset.id, asset.name ?? '']));
  }

  private resolveAssetName(id: string | undefined, assetNames: Map<string, string>): string {
    return id ? assetNames.get(id) ?? '' : '';
  }

  private resolveAssetNameForTargetParent(id: string | undefined, assetNames: Map<string, string>): string {
    return id ? assetNames.get(id) || id : '';
  }

  private resolveSystemAlias(id: string | undefined, systemAliases: Map<string, SystemAlias>): string {
    return id ? systemAliases.get(id)?.alias ?? '' : '';
  }

  private resolveProductField(
    workItem: WorkItem,
    productsLookup: Map<string, ProductPartNumberAndName>,
    selector: (product: ProductPartNumberAndName) => string
  ): string {
    const partNumber = workItem.partNumber ?? '';
    const product = partNumber ? productsLookup.get(partNumber) : undefined;
    return product ? selector(product) : '';
  }

  private resolveTargetLocation(
    selection: Pick<ResourceSelection, 'targetSystemId' | 'targetLocationId'> | undefined,
    locations: Map<string, Location>,
    systems: Map<string, SystemAlias>
  ): string {
    if (!selection) {
      return '';
    }

    const { targetSystemId, targetLocationId } = selection;

    if (targetSystemId) {
      const system = systems.get(targetSystemId);
      return system?.alias || targetSystemId;
    }

    if (targetLocationId) {
      const location = locations.get(targetLocationId);
      return location?.name ? `${location.name}: ${location.pathWithNames}` : targetLocationId;
    }

    return '';
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
    properties: WorkItemPropertiesOptions[],
    customProperties: string[] | undefined,
    flattenedRows: FlattenedRow[],
    workspacesLookup: Map<string, Workspace>,
    usersLookup: Map<string, User>,
    parentWorkItemNamesLookup: Map<string, string>,
    assetNamesLookup: Map<string, string>,
    systemAliasesLookup: Map<string, SystemAlias>,
    locationsLookup: Map<string, Location>,
    productsLookup: Map<string, ProductPartNumberAndName>
  ) {
    const fields: FieldDTO[] = [];
    const isTargetLocationSelected = properties.includes(WorkItemPropertiesOptions.TARGET_LOCATION);
    const isTargetParentSelected = properties.includes(WorkItemPropertiesOptions.TARGET_PARENT);
    let areTargetFieldsBuilt = false;

    properties.forEach(property => {
      if (property === WorkItemPropertiesOptions.TARGET_LOCATION || property === WorkItemPropertiesOptions.TARGET_PARENT) {
        if (areTargetFieldsBuilt) {
          return;
        }
        areTargetFieldsBuilt = true;
        fields.push(
          ...this.buildTargetResourceFields(
            flattenedRows,
            locationsLookup,
            systemAliasesLookup,
            assetNamesLookup,
            isTargetLocationSelected,
            isTargetParentSelected
          )
        );
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
          systemAliasesLookup,
          productsLookup
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

    customProperties?.forEach(customProperty => {
      fields.push({
        name: customProperty,
        values: flattenedRows.map(row => row.workItem.properties?.[customProperty] ?? ''),
        type: FieldType.string,
      });
    });

    return fields;
  }

  // Groups target location and target parent columns per resource (e.g. asset location next to asset parent)
  private buildTargetResourceFields(
    flattenedRows: FlattenedRow[],
    locationsLookup: Map<string, Location>,
    systemAliasesLookup: Map<string, SystemAlias>,
    assetNamesLookup: Map<string, string>,
    includeLocation: boolean,
    includeParent: boolean
  ): FieldDTO[] {
    const resources: Array<{ label: string; selection: (row: FlattenedRow) => ResourceSelection | undefined }> = [
      { label: 'Asset', selection: row => row.assetSelection },
      { label: 'DUT', selection: row => row.dutSelection },
    ];

    const fields: FieldDTO[] = [];
    resources.forEach(({ label, selection }) => {
      if (includeLocation) {
        fields.push(
          this.buildResourceField(`Target Location (${label})`, flattenedRows, row =>
            this.resolveTargetLocation(selection(row), locationsLookup, systemAliasesLookup)
          )
        );
      }
      if (includeParent) {
        fields.push(
          this.buildResourceField(`Target Parent (${label})`, flattenedRows, row =>
            this.resolveAssetNameForTargetParent(
              selection(row)?.targetParentId,
              assetNamesLookup
            )
          )
        );
      }
    });

    return fields;
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
    assetNamesLookup: Map<string, string>,
    systemAliasesLookup: Map<string, SystemAlias>,
    productsLookup: Map<string, ProductPartNumberAndName>
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
      case WorkItemPropertiesOptions.PRODUCT_NAME:
        return this.resolveProductField(workItem, productsLookup, product => product.name);
      case WorkItemPropertiesOptions.PRODUCT_ID:
        return this.resolveProductField(workItem, productsLookup, product => product.id);
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
        return this.resolveAssetName(row.assetSelection?.id, assetNamesLookup);
      case WorkItemPropertiesOptions.DUT_ID:
        return row.dutSelection?.id ?? '';
      case WorkItemPropertiesOptions.DUT_NAME:
        return this.resolveAssetName(row.dutSelection?.id, assetNamesLookup);
      case WorkItemPropertiesOptions.FIXTURE_ID:
        return row.fixtureSelection?.id ?? '';
      case WorkItemPropertiesOptions.FIXTURE_NAME:
        return this.resolveAssetName(row.fixtureSelection?.id, assetNamesLookup);
      case WorkItemPropertiesOptions.SYSTEM_ID:
        return row.systemSelection?.id ?? '';
      case WorkItemPropertiesOptions.SYSTEM_NAME:
        return this.resolveSystemAlias(row.systemSelection?.id, systemAliasesLookup);
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

    return WORK_ITEM_STATE_OPTIONS[state as WorkItemState]?.label ?? state;
  }

  async queryWorkItemsData(
    filter?: string,
    properties?: WorkItemPropertiesOptions[],
    customProperties?: string[],
    orderBy?: OrderByOptions,
    descending?: boolean,
    take?: number,
    suppressErrorAlert = false
  ): Promise<WorkItem[]> {
    const projection = this.buildProjectionFromProperties(properties, customProperties);

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

  private buildProjectionFromProperties(
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



  
  private async processTotalCountQuery(query: WorkItemsQuery, scopedVars?: ScopedVars): Promise<DataFrameDTO> {
    const { resolvedTypes } = this.resolveSelectedTypes(query.types!, scopedVars);
    const queryFilter = query.filter?.trim();
    const transformedQueryFilter = queryFilter
      ? this.transformQueryBuilderFilter(queryFilter, scopedVars)
      : queryFilter;

    const filters = resolvedTypes.map(type => {
      const typeFilter = `type = "${type}"`;
      return this.buildQueryFilter(
        `(${typeFilter})`,
        transformedQueryFilter ? `(${transformedQueryFilter})` : undefined
      );
    });

    const workItemCounts = await this.queryWorkItemsCountsInBatches(filters);

    return {
      refId: query.refId,
      name: query.refId,
      fields: resolvedTypes.map((type, index) => ({
        name: WorkItemTypeLabels[type],
        values: [workItemCounts[index]],
      })),
    };
  }

  private async queryWorkItemsCountsInBatches(
    filters: Array<string | undefined>
  ): Promise<number[]> {
    const workItemCounts: number[] = [];

    for (
      let index = 0;
      index < filters.length;
      index += QUERY_WORK_ITEMS_REQUEST_PER_SECOND
    ) {
      const start = Date.now();
      const batch = filters.slice(index, index + QUERY_WORK_ITEMS_REQUEST_PER_SECOND);
      // Requests within a batch run concurrently; batches are still spaced 1s apart.
      const batchCounts = await Promise.all(batch.map(filter => this.queryWorkItemsCount(filter)));
      workItemCounts.push(...batchCounts);

      const hasMoreRequests = index + QUERY_WORK_ITEMS_REQUEST_PER_SECOND < filters.length;
      const elapsed = Date.now() - start;
      if (hasMoreRequests && elapsed < 1000) {
        await this.delay(1000 - elapsed);
      }
    }

    return workItemCounts;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
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
      const { title: errorTitle, message: errorMessage } = getQueryError(error, 'work items');

      if (!suppressErrorAlert) {
        this.appEvents?.publish?.({
          type: AppEvents.alertError.name,
          payload: [errorTitle, errorMessage],
        });
      }

      throw new Error(errorMessage);
    }
  }

  protected buildQueryFilter(typeFilter?: string, queryFilter?: string): string | undefined {
    const filters = [typeFilter, queryFilter].filter(Boolean);
    return filters.length > 0 ? filters.join(' && ') : undefined;
  }

  // The backend API only supports duration in seconds, so the days/hours fields exposed by the
  // query builder are converted to their seconds-based equivalents before the filter is sent.
  private transformDurationFilters(filter: string): string {
    return this.durationFilterConversions.reduce(
      (transformedFilter, { regex, target, factor }) =>
        transformedFilter.replace(
          regex,
          (_, operator, value) => `${target} ${operator} "${Math.round(parseFloat(value) * factor)}"`
        ),
      filter
    );
  }

  private getEmptyDataFrameDTO(refId: string): DataFrameDTO {
    return {
      refId: refId,
      name: refId,
      fields: [],
    };
  }

  private buildWorkItemsFilter(
    types: WorkItemTypeOptions[],
    filter?: string,
    scopedVars?: ScopedVars
  ): { filter: string | undefined; hasRecognizedTypes: boolean } {
    const { allTypesSelected, filter: typeFilter } = this.buildTypeFilter(types, scopedVars);

    if (!allTypesSelected && typeFilter === '') {
      return { filter: undefined, hasRecognizedTypes: false };
    }

    const queryFilter = filter?.trim();
    const transformedQueryFilter = queryFilter
      ? this.transformQueryBuilderFilter(queryFilter, scopedVars)
      : queryFilter;
    const combinedFilter = this.buildQueryFilter(
      allTypesSelected ? undefined : `(${typeFilter})`,
      transformedQueryFilter ? `(${transformedQueryFilter})` : undefined
    );
    return { filter: combinedFilter, hasRecognizedTypes: true };
  }

  private transformQueryBuilderFilter(filter: string, scopedVars?: ScopedVars): string {
    const replacedFilter = transformComputedFieldsQuery(
      this.templateSrv.replace(filter, scopedVars),
      this.workItemsComputedDataFields
    );
    return this.transformDurationFilters(replacedFilter);
  }

  private buildTypeFilter(
    types: WorkItemTypeOptions[],
    scopedVars?: ScopedVars
  ): { allTypesSelected: boolean; filter: string } {
    const { resolvedTypes, allTypesSelected } = this.resolveSelectedTypes(types, scopedVars);
    return {
      allTypesSelected,
      filter: resolvedTypes.map(type => `type = "${type}"`).join(' || '),
    };
  }

  private resolveSelectedTypes(
    types: WorkItemTypeOptions[],
    scopedVars?: ScopedVars
  ): { resolvedTypes: WorkItemTypeOptions[]; allTypesSelected: boolean } {
    const validTypes = Object.values(WorkItemTypeOptions);
    const resolvedTypes = (replaceVariables(types, this.templateSrv, scopedVars) as WorkItemTypeOptions[]).filter(
      type => validTypes.includes(type)
    );
    const allTypesSelected = validTypes.every(type => resolvedTypes.includes(type));
    return { resolvedTypes, allTypesSelected };
  }

  shouldRunQuery(query: WorkItemsQuery): boolean {
    return !query.hide;
  }

  async metricFindQuery(
    query: WorkItemsVariableQuery,
    options?: LegacyMetricFindQueryOptions
  ): Promise<MetricFindValue[]> {
    const variableQuery = this.prepareVariableQuery(query);

    if (variableQuery.queryType === WorkItemsVariableQueryType.ListWorkItemTypes) {
      return WorkItemTypeMetricFindValues;
    }

    if (!isTypesNonEmpty(variableQuery.types) || !isTakeValid(variableQuery.take)) {
      return [];
    }

    const { filter, hasRecognizedTypes } = this.buildWorkItemsFilter(
      variableQuery.types!,
      variableQuery.filter,
      options?.scopedVars
    );

    if (!hasRecognizedTypes) {
      return [];
    }

    const workItems = await this.queryWorkItemsData(
      filter,
      [WorkItemPropertiesOptions.ID, WorkItemPropertiesOptions.NAME],
      undefined,
      variableQuery.orderBy,
      variableQuery.descending,
      variableQuery.take
    );

    return workItems.map(workItem => ({
      text: workItem.name ? `${workItem.name} (${workItem.id})` : `(${workItem.id})`,
      value: workItem.id,
    }));
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

  public async loadLocations(): Promise<Map<string, Location>> {
    try {
      return await this.locationUtils.getLocations();
    } catch (error) {
      if (!this.errorTitle) {
        this.handleDependenciesError(error);
      }
      return new Map<string, Location>();
    }
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
    const { title: errorTitle, message: errorMessage } = getQueryBuilderLookupsError(error, 'work items');
    this.errorTitle = errorTitle;
    this.errorDescription = errorMessage;
  }
}
