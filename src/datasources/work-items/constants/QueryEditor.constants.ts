import { OrderByOptions, WorkItemPropertiesGroup, WorkItemPropertiesOptions, WorkItemTypeOptions } from '../types';

export const TAKE_LIMIT = 10000;

export const LABEL_WIDTH = 25;

export const takeErrorMessages = {
  greaterOrEqualToZero: 'Enter a value greater than or equal to 0',
  lessOrEqualToTenThousand: `Enter a value less than or equal to ${TAKE_LIMIT.toLocaleString()}`,
};

export const propertiesErrorMessages = {
  atLeastOneRequired: 'You must select at least one property.',
};

export const typesErrorMessages = {
  atLeastOneRequired: 'You must select at least one type.',
};

export const labels = {
  outputType: 'Output',
  types: 'Type',
  properties: 'Properties',
  orderBy: 'OrderBy',
  descending: 'Descending',
  take: 'Take',
};

export const placeholders = {
  types: 'Select work item types',
  properties: 'Select the properties to query',
  orderBy: 'Select a field to set query order',
  take: 'Enter record count',
};

export const tooltips = {
  outputType: 'Select whether to return work item properties or only total count.',
  types: 'Choose one or more work item types to query.',
  properties: 'Select the work item properties to include in the result.',
  orderBy: 'Select which property to sort by for properties output.',
  descending: 'Toggle descending sort order for properties output.',
  take: `Set the maximum number of work items to return. Maximum is ${TAKE_LIMIT.toLocaleString()}.`,
};

export const WorkItemTypes = [
  { label: 'Work orders', value: WorkItemTypeOptions.WorkOrders },
  { label: 'Test plans', value: WorkItemTypeOptions.TestPlans },
  { label: 'Job', value: WorkItemTypeOptions.Job },
  { label: 'Maintenance', value: WorkItemTypeOptions.Maintenance },
  { label: 'Calibration', value: WorkItemTypeOptions.Calibration },
  { label: 'Reservation', value: WorkItemTypeOptions.Reservation },
  { label: 'Transport Order', value: WorkItemTypeOptions.TransportOrder },
];

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

export const WorkItemProperties: Record<
  WorkItemPropertiesOptions,
  {
    label: string;
    value: WorkItemPropertiesOptions;
    field: string;
    group: WorkItemPropertiesGroup;
  }
> = {
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
