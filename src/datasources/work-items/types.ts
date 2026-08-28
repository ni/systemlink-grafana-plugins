import { DataQuery } from '@grafana/schema';

export enum OutputType {
  Properties = 'Properties',
  TotalCount = 'Total Count',
}

export enum WorkItemTypeOptions {
  All = 'ALL',
  WorkOrders = 'WORK_ORDERS',
  TestPlans = 'TEST_PLANS',
  Job = 'JOB',
  Maintenance = 'MAINTENANCE',
  Calibration = 'CALIBRATION',
  Reservation = 'RESERVATION',
  TransportOrder = 'TRANSPORT_ORDER',
}

export const WorkItemTypes = [
  { label: 'All', value: WorkItemTypeOptions.All },
  { label: 'Work orders', value: WorkItemTypeOptions.WorkOrders },
  { label: 'Test plans', value: WorkItemTypeOptions.TestPlans },
  { label: 'Job', value: WorkItemTypeOptions.Job },
  { label: 'Maintenance', value: WorkItemTypeOptions.Maintenance },
  { label: 'Calibration', value: WorkItemTypeOptions.Calibration },
  { label: 'Reservation', value: WorkItemTypeOptions.Reservation },
  { label: 'Transport Order', value: WorkItemTypeOptions.TransportOrder },
];

export enum OrderByOptions {
  ID = 'ID',
  UPDATED_AT = 'UPDATED_AT',
}

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

export interface WorkItemsQuery extends DataQuery {
  outputType?: OutputType;
  types?: WorkItemTypeOptions[];
  properties?: WorkItemPropertiesOptions[];
  filter?: string;
  orderBy?: OrderByOptions;
  descending?: boolean;
  take?: number;
}

export enum WorkItemPropertiesOptions {
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
  PARENT_WORK_ITEM_NAME = 'PARENT_WORK_ITEM_NAME',
  PARENT_WORK_ITEM_ID = 'PARENT_WORK_ITEM_ID',
  TEMPLATE_ID = 'TEMPLATE_ID',
  EARLIEST_START_DATE = 'EARLIEST_START_DATE',
  DUE_DATE = 'DUE_DATE',
  ESTIMATED_DURATION = 'ESTIMATED_DURATION',
  PLANNED_START_DATE = 'PLANNED_START_DATE',
  PLANNED_END_DATE = 'PLANNED_END_DATE',
  PLANNED_DURATION = 'PLANNED_DURATION',
  ASSET_NAME = 'ASSET_NAME',
  ASSET_ID = 'ASSET_ID',
  DUT_NAME = 'DUT_NAME',
  DUT_ID = 'DUT_ID',
  FIXTURE_NAME = 'FIXTURE_NAME',
  FIXTURE_ID = 'FIXTURE_ID',
  TARGET_LOCATION = 'TARGET_LOCATION',
  TARGET_PARENT = 'TARGET_PARENT',
  SYSTEM_NAME = 'SYSTEM_NAME',
  SYSTEM_ID = 'SYSTEM_ID',
  PROPERTIES = 'PROPERTIES',
}

export enum WorkItemPropertiesGroup {
  WORK_ITEM_DETAILS = 'Work item details',
  TIMELINE = 'Timeline',
  RESOURCES = 'Resources',
  CUSTOM_PROPERTIES = 'Custom properties',
}

export const WorkItemProperties: Record<WorkItemPropertiesOptions, {
  label: string;
  value: WorkItemPropertiesOptions;
  field: string;
  group: WorkItemPropertiesGroup;
}> = {
  [WorkItemPropertiesOptions.ID]: {
    label: 'Work item ID',
    value: WorkItemPropertiesOptions.ID,
    field: 'id',
    group: WorkItemPropertiesGroup.WORK_ITEM_DETAILS,
  },
  [WorkItemPropertiesOptions.NAME]: {
    label: 'Work item name',
    value: WorkItemPropertiesOptions.NAME,
    field: 'name',
    group: WorkItemPropertiesGroup.WORK_ITEM_DETAILS,
  },
  [WorkItemPropertiesOptions.TYPE]: {
    label: 'Work item type',
    value: WorkItemPropertiesOptions.TYPE,
    field: 'type',
    group: WorkItemPropertiesGroup.WORK_ITEM_DETAILS,
  },
  [WorkItemPropertiesOptions.STATE]: {
    label: 'State',
    value: WorkItemPropertiesOptions.STATE,
    field: 'state',
    group: WorkItemPropertiesGroup.WORK_ITEM_DETAILS,
  },
  [WorkItemPropertiesOptions.SUBSTATE]: {
    label: 'Substate',
    value: WorkItemPropertiesOptions.SUBSTATE,
    field: 'substate',
    group: WorkItemPropertiesGroup.WORK_ITEM_DETAILS,
  },
  [WorkItemPropertiesOptions.DESCRIPTION]: {
    label: 'Description',
    value: WorkItemPropertiesOptions.DESCRIPTION,
    field: 'description',
    group: WorkItemPropertiesGroup.WORK_ITEM_DETAILS,
  },
  [WorkItemPropertiesOptions.TEST_PROGRAM]: {
    label: 'Test program',
    value: WorkItemPropertiesOptions.TEST_PROGRAM,
    field: 'testProgram',
    group: WorkItemPropertiesGroup.WORK_ITEM_DETAILS,
  },
  [WorkItemPropertiesOptions.PART_NUMBER]: {
    label: 'Part number',
    value: WorkItemPropertiesOptions.PART_NUMBER,
    field: 'partNumber',
    group: WorkItemPropertiesGroup.WORK_ITEM_DETAILS,
  },
  [WorkItemPropertiesOptions.WORKSPACE]: {
    label: 'Workspace',
    value: WorkItemPropertiesOptions.WORKSPACE,
    field: 'workspace',
    group: WorkItemPropertiesGroup.WORK_ITEM_DETAILS,
  },
  [WorkItemPropertiesOptions.ASSIGNED_TO]: {
    label: 'Assigned to',
    value: WorkItemPropertiesOptions.ASSIGNED_TO,
    field: 'assignedTo',
    group: WorkItemPropertiesGroup.WORK_ITEM_DETAILS,
  },
  [WorkItemPropertiesOptions.REQUESTED_BY]: {
    label: 'Requested by',
    value: WorkItemPropertiesOptions.REQUESTED_BY,
    field: 'requestedBy',
    group: WorkItemPropertiesGroup.WORK_ITEM_DETAILS,
  },
  [WorkItemPropertiesOptions.CREATED_BY]: {
    label: 'Created by',
    value: WorkItemPropertiesOptions.CREATED_BY,
    field: 'createdBy',
    group: WorkItemPropertiesGroup.WORK_ITEM_DETAILS,
  },
  [WorkItemPropertiesOptions.UPDATED_BY]: {
    label: 'Updated by',
    value: WorkItemPropertiesOptions.UPDATED_BY,
    field: 'updatedBy',
    group: WorkItemPropertiesGroup.WORK_ITEM_DETAILS,
  },
  [WorkItemPropertiesOptions.CREATED_AT]: {
    label: 'Created at',
    value: WorkItemPropertiesOptions.CREATED_AT,
    field: 'createdAt',
    group: WorkItemPropertiesGroup.WORK_ITEM_DETAILS,
  },
  [WorkItemPropertiesOptions.UPDATED_AT]: {
    label: 'Updated at',
    value: WorkItemPropertiesOptions.UPDATED_AT,
    field: 'updatedAt',
    group: WorkItemPropertiesGroup.WORK_ITEM_DETAILS,
  },
  [WorkItemPropertiesOptions.PARENT_WORK_ITEM_NAME]: {
    label: 'Parent work item name',
    value: WorkItemPropertiesOptions.PARENT_WORK_ITEM_NAME,
    field: 'parentWorkItemName',
    group: WorkItemPropertiesGroup.WORK_ITEM_DETAILS,
  },
  [WorkItemPropertiesOptions.PARENT_WORK_ITEM_ID]: {
    label: 'Parent work item ID',
    value: WorkItemPropertiesOptions.PARENT_WORK_ITEM_ID,
    field: 'parentWorkItemId',
    group: WorkItemPropertiesGroup.WORK_ITEM_DETAILS,
  },
  [WorkItemPropertiesOptions.TEMPLATE_ID]: {
    label: 'Template ID',
    value: WorkItemPropertiesOptions.TEMPLATE_ID,
    field: 'templateId',
    group: WorkItemPropertiesGroup.WORK_ITEM_DETAILS,
  },
  [WorkItemPropertiesOptions.EARLIEST_START_DATE]: {
    label: 'Earliest start date',
    value: WorkItemPropertiesOptions.EARLIEST_START_DATE,
    field: 'timeline.earliestStartDateTime',
    group: WorkItemPropertiesGroup.TIMELINE,
  },
  [WorkItemPropertiesOptions.DUE_DATE]: {
    label: 'Due date',
    value: WorkItemPropertiesOptions.DUE_DATE,
    field: 'timeline.dueDateTime',
    group: WorkItemPropertiesGroup.TIMELINE,
  },
  [WorkItemPropertiesOptions.ESTIMATED_DURATION]: {
    label: 'Estimated duration',
    value: WorkItemPropertiesOptions.ESTIMATED_DURATION,
    field: 'timeline.estimatedDurationInSeconds',
    group: WorkItemPropertiesGroup.TIMELINE,
  },
  [WorkItemPropertiesOptions.PLANNED_START_DATE]: {
    label: 'Planned start date',
    value: WorkItemPropertiesOptions.PLANNED_START_DATE,
    field: 'schedule.plannedStartDateTime',
    group: WorkItemPropertiesGroup.TIMELINE,
  },
  [WorkItemPropertiesOptions.PLANNED_END_DATE]: {
    label: 'Planned end date',
    value: WorkItemPropertiesOptions.PLANNED_END_DATE,
    field: 'schedule.plannedEndDateTime',
    group: WorkItemPropertiesGroup.TIMELINE,
  },
  [WorkItemPropertiesOptions.PLANNED_DURATION]: {
    label: 'Planned duration',
    value: WorkItemPropertiesOptions.PLANNED_DURATION,
    field: 'schedule.plannedDurationInSeconds',
    group: WorkItemPropertiesGroup.TIMELINE,
  },
  [WorkItemPropertiesOptions.ASSET_NAME]: {
    label: 'Asset name',
    value: WorkItemPropertiesOptions.ASSET_NAME,
    field: 'assetName',
    group: WorkItemPropertiesGroup.RESOURCES,
  },
  [WorkItemPropertiesOptions.ASSET_ID]: {
    label: 'Asset ID',
    value: WorkItemPropertiesOptions.ASSET_ID,
    field: 'assetId',
    group: WorkItemPropertiesGroup.RESOURCES,
  },
  [WorkItemPropertiesOptions.DUT_NAME]: {
    label: 'DUT name',
    value: WorkItemPropertiesOptions.DUT_NAME,
    field: 'dutName',
    group: WorkItemPropertiesGroup.RESOURCES,
  },
  [WorkItemPropertiesOptions.DUT_ID]: {
    label: 'DUT ID',
    value: WorkItemPropertiesOptions.DUT_ID,
    field: 'dutId',
    group: WorkItemPropertiesGroup.RESOURCES,
  },
  [WorkItemPropertiesOptions.FIXTURE_NAME]: {
    label: 'Fixture name',
    value: WorkItemPropertiesOptions.FIXTURE_NAME,
    field: 'fixtureName',
    group: WorkItemPropertiesGroup.RESOURCES,
  },
  [WorkItemPropertiesOptions.FIXTURE_ID]: {
    label: 'Fixture ID',
    value: WorkItemPropertiesOptions.FIXTURE_ID,
    field: 'fixtureId',
    group: WorkItemPropertiesGroup.RESOURCES,
  },
  [WorkItemPropertiesOptions.TARGET_LOCATION]: {
    label: 'Target location',
    value: WorkItemPropertiesOptions.TARGET_LOCATION,
    field: 'targetLocation',
    group: WorkItemPropertiesGroup.RESOURCES,
  },
  [WorkItemPropertiesOptions.TARGET_PARENT]: {
    label: 'Target parent',
    value: WorkItemPropertiesOptions.TARGET_PARENT,
    field: 'targetParent',
    group: WorkItemPropertiesGroup.RESOURCES,
  },
  [WorkItemPropertiesOptions.SYSTEM_NAME]: {
    label: 'System name',
    value: WorkItemPropertiesOptions.SYSTEM_NAME,
    field: 'systemName',
    group: WorkItemPropertiesGroup.RESOURCES,
  },
  [WorkItemPropertiesOptions.SYSTEM_ID]: {
    label: 'System ID',
    value: WorkItemPropertiesOptions.SYSTEM_ID,
    field: 'systemId',
    group: WorkItemPropertiesGroup.RESOURCES,
  },
  [WorkItemPropertiesOptions.PROPERTIES]: {
    label: 'Custom properties',
    value: WorkItemPropertiesOptions.PROPERTIES,
    field: 'properties',
    group: WorkItemPropertiesGroup.CUSTOM_PROPERTIES,
  },
} as const;
