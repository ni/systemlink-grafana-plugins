import { DataQuery } from '@grafana/schema';

export interface WorkItemsQuery extends DataQuery {
  properties?: string[];
  outputType?: OutputType;
  workItemTypes?: string[];
  orderBy?: string;
  descending?: boolean;
  queryBy?: string;
  take?: number;
}

export interface WorkItemsVariableQuery extends DataQuery {
  workItemTypes?: string[];
  orderBy?: string;
  descending?: boolean;
  queryBy?: string;
  take?: number;
}

export enum OutputType {
  Properties = 'Properties',
  TotalCount = 'Total Count',
}

export enum WorkItemPropertyGroup {
  WorkItemDetails = 'Work item details',
  Timeline = 'Timeline',
  Resources = 'Resources',
  CustomProperties = 'Custom properties',
}

export enum WorkItemPropertyKey {
  // Work item details
  ID = 'ID',
  NAME = 'NAME',
  TYPE = 'TYPE',
  STATE = 'STATE',
  SUBSTATE = 'SUBSTATE',
  DESCRIPTION = 'DESCRIPTION',
  TEST_PROGRAM = 'TEST_PROGRAM',
  PART_NUMBER = 'PART_NUMBER',
  WORKSPACE = 'WORKSPACE',
  ASSIGNED_TO = 'ASSIGNED_TO',
  REQUESTED_BY = 'REQUESTED_BY',
  CREATED_BY = 'CREATED_BY',
  UPDATED_BY = 'UPDATED_BY',
  CREATED_AT = 'CREATED_AT',
  UPDATED_AT = 'UPDATED_AT',
  PARENT_NAME = 'PARENT_NAME',
  PARENT_ID = 'PARENT_ID',
  TEMPLATE_ID = 'TEMPLATE_ID',
  // Timeline
  EARLIEST_START_DATE = 'EARLIEST_START_DATE',
  DUE_DATE = 'DUE_DATE',
  ESTIMATED_DURATION = 'ESTIMATED_DURATION',
  PLANNED_START_DATE = 'PLANNED_START_DATE',
  PLANNED_END_DATE = 'PLANNED_END_DATE',
  PLANNED_DURATION = 'PLANNED_DURATION',
  // Resources
  SYSTEM_NAME = 'SYSTEM_NAME',
  SYSTEM_ID = 'SYSTEM_ID',
  ASSET_NAME = 'ASSET_NAME',
  ASSET_ID = 'ASSET_ID',
  DUT_NAME = 'DUT_NAME',
  DUT_ID = 'DUT_ID',
  FIXTURE_NAME = 'FIXTURE_NAME',
  FIXTURE_ID = 'FIXTURE_ID',
  TARGET_LOCATION = 'TARGET_LOCATION',
  TARGET_PARENT = 'TARGET_PARENT',
}

export enum WorkItemProjection {
  ID = 'ID',
  NAME = 'NAME',
  TYPE = 'TYPE',
  STATE = 'STATE',
  SUBSTATE = 'SUBSTATE',
  DESCRIPTION = 'DESCRIPTION',
  PARENT_ID = 'PARENT_ID',
  TEMPLATE_ID = 'TEMPLATE_ID',
  ASSIGNED_TO = 'ASSIGNED_TO',
  REQUESTED_BY = 'REQUESTED_BY',
  TEST_PROGRAM = 'TEST_PROGRAM',
  PART_NUMBER = 'PART_NUMBER',
  WORKSPACE = 'WORKSPACE',
  CREATED_BY = 'CREATED_BY',
  CREATED_AT = 'CREATED_AT',
  UPDATED_BY = 'UPDATED_BY',
  UPDATED_AT = 'UPDATED_AT',
  PROPERTIES = 'PROPERTIES',
  TIMELINE_EARLIEST_START_DATE_TIME = 'TIMELINE_EARLIEST_START_DATE_TIME',
  TIMELINE_DUE_DATE_TIME = 'TIMELINE_DUE_DATE_TIME',
  TIMELINE_ESTIMATED_DURATION_IN_SECONDS = 'TIMELINE_ESTIMATED_DURATION_IN_SECONDS',
  SCHEDULE_PLANNED_START_DATE_TIME = 'SCHEDULE_PLANNED_START_DATE_TIME',
  SCHEDULE_PLANNED_END_DATE_TIME = 'SCHEDULE_PLANNED_END_DATE_TIME',
  SCHEDULE_PLANNED_DURATION_IN_SECONDS = 'SCHEDULE_PLANNED_DURATION_IN_SECONDS',
  RESOURCES_SYSTEMS_SELECTIONS_ID = 'RESOURCES_SYSTEMS_SELECTIONS_ID',
  RESOURCES_ASSETS_SELECTIONS_ID = 'RESOURCES_ASSETS_SELECTIONS_ID',
  RESOURCES_ASSETS_SELECTIONS_TARGET_SYSTEM_ID = 'RESOURCES_ASSETS_SELECTIONS_TARGET_SYSTEM_ID',
  RESOURCES_ASSETS_SELECTIONS_TARGET_PARENT_ID = 'RESOURCES_ASSETS_SELECTIONS_TARGET_PARENT_ID',
  RESOURCES_DUTS_SELECTIONS_ID = 'RESOURCES_DUTS_SELECTIONS_ID',
  RESOURCES_DUTS_SELECTIONS_TARGET_SYSTEM_ID = 'RESOURCES_DUTS_SELECTIONS_TARGET_SYSTEM_ID',
  RESOURCES_DUTS_SELECTIONS_TARGET_PARENT_ID = 'RESOURCES_DUTS_SELECTIONS_TARGET_PARENT_ID',
  RESOURCES_FIXTURES_SELECTIONS_ID = 'RESOURCES_FIXTURES_SELECTIONS_ID',
  RESOURCES_FIXTURES_SELECTIONS_TARGET_SYSTEM_ID = 'RESOURCES_FIXTURES_SELECTIONS_TARGET_SYSTEM_ID',
  RESOURCES_FIXTURES_SELECTIONS_TARGET_PARENT_ID = 'RESOURCES_FIXTURES_SELECTIONS_TARGET_PARENT_ID',
}

export const WorkItemProperties: Record<WorkItemPropertyKey, {
  label: string;
  group: WorkItemPropertyGroup;
  projections: WorkItemProjection[];
}> = {
  // Work item details
  [WorkItemPropertyKey.ID]: {
    label: 'Work item ID',
    group: WorkItemPropertyGroup.WorkItemDetails,
    projections: [WorkItemProjection.ID],
  },
  [WorkItemPropertyKey.NAME]: {
    label: 'Work item name',
    group: WorkItemPropertyGroup.WorkItemDetails,
    projections: [WorkItemProjection.NAME],
  },
  [WorkItemPropertyKey.TYPE]: {
    label: 'Work item type',
    group: WorkItemPropertyGroup.WorkItemDetails,
    projections: [WorkItemProjection.TYPE],
  },
  [WorkItemPropertyKey.STATE]: {
    label: 'State',
    group: WorkItemPropertyGroup.WorkItemDetails,
    projections: [WorkItemProjection.STATE],
  },
  [WorkItemPropertyKey.SUBSTATE]: {
    label: 'Substate',
    group: WorkItemPropertyGroup.WorkItemDetails,
    projections: [WorkItemProjection.SUBSTATE],
  },
  [WorkItemPropertyKey.DESCRIPTION]: {
    label: 'Description',
    group: WorkItemPropertyGroup.WorkItemDetails,
    projections: [WorkItemProjection.DESCRIPTION],
  },
  [WorkItemPropertyKey.TEST_PROGRAM]: {
    label: 'Test program',
    group: WorkItemPropertyGroup.WorkItemDetails,
    projections: [WorkItemProjection.TEST_PROGRAM],
  },
  [WorkItemPropertyKey.PART_NUMBER]: {
    label: 'Part Number',
    group: WorkItemPropertyGroup.WorkItemDetails,
    projections: [WorkItemProjection.PART_NUMBER],
  },
  [WorkItemPropertyKey.WORKSPACE]: {
    label: 'Workspace',
    group: WorkItemPropertyGroup.WorkItemDetails,
    projections: [WorkItemProjection.WORKSPACE],
  },
  [WorkItemPropertyKey.ASSIGNED_TO]: {
    label: 'Assigned to',
    group: WorkItemPropertyGroup.WorkItemDetails,
    projections: [WorkItemProjection.ASSIGNED_TO],
  },
  [WorkItemPropertyKey.REQUESTED_BY]: {
    label: 'Requested by',
    group: WorkItemPropertyGroup.WorkItemDetails,
    projections: [WorkItemProjection.REQUESTED_BY],
  },
  [WorkItemPropertyKey.CREATED_BY]: {
    label: 'Created by',
    group: WorkItemPropertyGroup.WorkItemDetails,
    projections: [WorkItemProjection.CREATED_BY],
  },
  [WorkItemPropertyKey.UPDATED_BY]: {
    label: 'Updated by',
    group: WorkItemPropertyGroup.WorkItemDetails,
    projections: [WorkItemProjection.UPDATED_BY],
  },
  [WorkItemPropertyKey.CREATED_AT]: {
    label: 'Created at',
    group: WorkItemPropertyGroup.WorkItemDetails,
    projections: [WorkItemProjection.CREATED_AT],
  },
  [WorkItemPropertyKey.UPDATED_AT]: {
    label: 'Updated at',
    group: WorkItemPropertyGroup.WorkItemDetails,
    projections: [WorkItemProjection.UPDATED_AT],
  },
  [WorkItemPropertyKey.PARENT_NAME]: {
    label: 'Parent work item name',
    group: WorkItemPropertyGroup.WorkItemDetails,
    projections: [WorkItemProjection.PARENT_ID],
  },
  [WorkItemPropertyKey.PARENT_ID]: {
    label: 'Parent work item ID',
    group: WorkItemPropertyGroup.WorkItemDetails,
    projections: [WorkItemProjection.PARENT_ID],
  },
  [WorkItemPropertyKey.TEMPLATE_ID]: {
    label: 'Template ID',
    group: WorkItemPropertyGroup.WorkItemDetails,
    projections: [WorkItemProjection.TEMPLATE_ID],
  },
  // Timeline
  [WorkItemPropertyKey.EARLIEST_START_DATE]: {
    label: 'Earliest start date',
    group: WorkItemPropertyGroup.Timeline,
    projections: [WorkItemProjection.TIMELINE_EARLIEST_START_DATE_TIME],
  },
  [WorkItemPropertyKey.DUE_DATE]: {
    label: 'Due date',
    group: WorkItemPropertyGroup.Timeline,
    projections: [WorkItemProjection.TIMELINE_DUE_DATE_TIME],
  },
  [WorkItemPropertyKey.ESTIMATED_DURATION]: {
    label: 'Estimated duration',
    group: WorkItemPropertyGroup.Timeline,
    projections: [WorkItemProjection.TIMELINE_ESTIMATED_DURATION_IN_SECONDS],
  },
  [WorkItemPropertyKey.PLANNED_START_DATE]: {
    label: 'Planned start date',
    group: WorkItemPropertyGroup.Timeline,
    projections: [WorkItemProjection.SCHEDULE_PLANNED_START_DATE_TIME],
  },
  [WorkItemPropertyKey.PLANNED_END_DATE]: {
    label: 'Planned end date',
    group: WorkItemPropertyGroup.Timeline,
    projections: [WorkItemProjection.SCHEDULE_PLANNED_END_DATE_TIME],
  },
  [WorkItemPropertyKey.PLANNED_DURATION]: {
    label: 'Planned duration',
    group: WorkItemPropertyGroup.Timeline,
    projections: [WorkItemProjection.SCHEDULE_PLANNED_DURATION_IN_SECONDS],
  },
  // Resources
  [WorkItemPropertyKey.SYSTEM_NAME]: {
    label: 'System Name',
    group: WorkItemPropertyGroup.Resources,
    projections: [WorkItemProjection.RESOURCES_SYSTEMS_SELECTIONS_ID],
  },
  [WorkItemPropertyKey.SYSTEM_ID]: {
    label: 'System ID',
    group: WorkItemPropertyGroup.Resources,
    projections: [WorkItemProjection.RESOURCES_SYSTEMS_SELECTIONS_ID],
  },
  [WorkItemPropertyKey.ASSET_NAME]: {
    label: 'Asset Name',
    group: WorkItemPropertyGroup.Resources,
    projections: [WorkItemProjection.RESOURCES_ASSETS_SELECTIONS_ID],
  },
  [WorkItemPropertyKey.ASSET_ID]: {
    label: 'Asset ID',
    group: WorkItemPropertyGroup.Resources,
    projections: [WorkItemProjection.RESOURCES_ASSETS_SELECTIONS_ID],
  },
  [WorkItemPropertyKey.DUT_NAME]: {
    label: 'DUT Name',
    group: WorkItemPropertyGroup.Resources,
    projections: [WorkItemProjection.RESOURCES_DUTS_SELECTIONS_ID],
  },
  [WorkItemPropertyKey.DUT_ID]: {
    label: 'DUT ID',
    group: WorkItemPropertyGroup.Resources,
    projections: [WorkItemProjection.RESOURCES_DUTS_SELECTIONS_ID],
  },
  [WorkItemPropertyKey.FIXTURE_NAME]: {
    label: 'Fixture Name',
    group: WorkItemPropertyGroup.Resources,
    projections: [WorkItemProjection.RESOURCES_FIXTURES_SELECTIONS_ID],
  },
  [WorkItemPropertyKey.FIXTURE_ID]: {
    label: 'Fixture ID',
    group: WorkItemPropertyGroup.Resources,
    projections: [WorkItemProjection.RESOURCES_FIXTURES_SELECTIONS_ID],
  },
  [WorkItemPropertyKey.TARGET_LOCATION]: {
    label: 'Target location',
    group: WorkItemPropertyGroup.Resources,
    projections: [
      WorkItemProjection.RESOURCES_ASSETS_SELECTIONS_TARGET_SYSTEM_ID,
      WorkItemProjection.RESOURCES_DUTS_SELECTIONS_TARGET_SYSTEM_ID,
      WorkItemProjection.RESOURCES_FIXTURES_SELECTIONS_TARGET_SYSTEM_ID,
    ],
  },
  [WorkItemPropertyKey.TARGET_PARENT]: {
    label: 'Target parent',
    group: WorkItemPropertyGroup.Resources,
    projections: [
      WorkItemProjection.RESOURCES_ASSETS_SELECTIONS_TARGET_PARENT_ID,
      WorkItemProjection.RESOURCES_DUTS_SELECTIONS_TARGET_PARENT_ID,
      WorkItemProjection.RESOURCES_FIXTURES_SELECTIONS_TARGET_PARENT_ID,
    ],
  },
};

export const ALL_WORK_ITEM_TYPES_VALUE = 'ALL';

export const OrderByOptions = {
  ID: 'ID',
  UPDATED_AT: 'UPDATED_AT',
} as const;

export const OrderBy = [
  {
    value: OrderByOptions.ID,
    label: 'ID',
    description: 'ID of the work item',
  },
  {
    value: OrderByOptions.UPDATED_AT,
    label: 'Updated At',
    description: 'Latest update time of the work item',
  },
];

// API response interfaces

export interface WorkItemTimeline {
  earliestStartDateTime?: string;
  dueDateTime?: string;
  estimatedDurationInSeconds?: number;
}

export interface WorkItemSchedule {
  plannedStartDateTime?: string;
  plannedEndDateTime?: string;
  plannedDurationInSeconds?: number;
}

export interface ResourceSelection {
  id?: string;
  targetLocationId?: string;
  targetSystemId?: string;
  targetParentId?: string;
}

export interface SystemResourceSelection {
  id?: string;
  targetLocationId?: string;
}

export interface ResourceGroup {
  selections?: ResourceSelection[];
  filter?: string;
}

export interface SystemResourceGroup {
  selections?: SystemResourceSelection[];
  filter?: string;
}

export interface WorkItemResources {
  assets?: ResourceGroup;
  duts?: ResourceGroup;
  fixtures?: ResourceGroup;
  systems?: SystemResourceGroup;
}

export interface WorkItem {
  id?: string;
  name?: string;
  type?: string;
  state?: string;
  substate?: string;
  description?: string;
  parentId?: string;
  templateId?: string;
  assignedTo?: string;
  requestedBy?: string;
  testProgram?: string;
  partNumber?: string;
  workspace?: string;
  timeline?: WorkItemTimeline;
  schedule?: WorkItemSchedule;
  resources?: WorkItemResources;
  properties?: Record<string, string>;
  createdBy?: string;
  updatedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface WorkItemsResponse {
  workItems: WorkItem[];
  continuationToken?: string;
  totalCount?: number;
}

export interface QueryWorkItemsRequestBody {
  filter?: string;
  take?: number;
  orderBy?: string;
  descending?: boolean;
  returnCount?: boolean;
  projection?: string[];
  continuationToken?: string;
}

export interface WorkItemTypeConfig {
  type?: string;
  description?: string;
}

export interface GetWorkItemTypesResponse {
  workItemTypes?: WorkItemTypeConfig[];
}

// Internal helper type for row fan-out
export interface FlatRow {
  workItem: WorkItem;
  assetSelection?: ResourceSelection;
  dutSelection?: ResourceSelection;
  fixtureSelection?: ResourceSelection;
  systemSelection?: SystemResourceSelection;
}
