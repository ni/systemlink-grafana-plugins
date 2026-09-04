import { WorkItemPropertiesOptions, WorkItemTypeOptions } from './types';

export const TAKE_LIMIT = 10000;
export const DEFAULT_TAKE = 1000;

// Properties that map directly to a flat response field, with no lookups or transformations required.
export const BASIC_WORK_ITEM_PROPERTIES: WorkItemPropertiesOptions[] = [
  WorkItemPropertiesOptions.ID,
  WorkItemPropertiesOptions.NAME,
  WorkItemPropertiesOptions.TYPE,
  WorkItemPropertiesOptions.STATE,
  WorkItemPropertiesOptions.SUBSTATE,
  WorkItemPropertiesOptions.DESCRIPTION,
  WorkItemPropertiesOptions.TEST_PROGRAM,
  WorkItemPropertiesOptions.PART_NUMBER,
  WorkItemPropertiesOptions.PARENT_WORK_ITEM_ID,
  WorkItemPropertiesOptions.TEMPLATE_ID,
  WorkItemPropertiesOptions.CREATED_AT,
  WorkItemPropertiesOptions.UPDATED_AT,
];

// Maps basic work item properties to the backend `projection` enum value.
export const WORK_ITEM_PROPERTIES_PROJECTION_VALUES: Partial<Record<WorkItemPropertiesOptions, string>> = {
  [WorkItemPropertiesOptions.ID]: 'ID',
  [WorkItemPropertiesOptions.NAME]: 'NAME',
  [WorkItemPropertiesOptions.TYPE]: 'TYPE',
  [WorkItemPropertiesOptions.STATE]: 'STATE',
  [WorkItemPropertiesOptions.SUBSTATE]: 'SUBSTATE',
  [WorkItemPropertiesOptions.DESCRIPTION]: 'DESCRIPTION',
  [WorkItemPropertiesOptions.TEST_PROGRAM]: 'TEST_PROGRAM',
  [WorkItemPropertiesOptions.PART_NUMBER]: 'PART_NUMBER',
  [WorkItemPropertiesOptions.PARENT_WORK_ITEM_ID]: 'PARENT_ID',
  [WorkItemPropertiesOptions.TEMPLATE_ID]: 'TEMPLATE_ID',
  [WorkItemPropertiesOptions.CREATED_AT]: 'CREATED_AT',
  [WorkItemPropertiesOptions.UPDATED_AT]: 'UPDATED_AT',
};

// Maps each work item type option to the backend's `type` filter value.
export const WORK_ITEM_TYPE_FILTER_VALUES: Record<WorkItemTypeOptions, string> = {
  [WorkItemTypeOptions.WorkOrders]: 'workorder',
  [WorkItemTypeOptions.TestPlans]: 'testplan',
  [WorkItemTypeOptions.Job]: 'job',
  [WorkItemTypeOptions.Maintenance]: 'maintenance',
  [WorkItemTypeOptions.Calibration]: 'calibration',
  [WorkItemTypeOptions.Reservation]: 'reservation',
  [WorkItemTypeOptions.TransportOrder]: 'transportorder',
};
