import { WorkItemPropertiesOptions, WorkItemTypeOptions } from './types';

export const TAKE_LIMIT = 10000;
export const DEFAULT_TAKE = 1000;


// Maps every work item property to its backend `projection` enum value(s).
export const WORK_ITEM_PROPERTIES_PROJECTIONS: Record<WorkItemPropertiesOptions, string[]> = {
  [WorkItemPropertiesOptions.ID]: ['ID'],
  [WorkItemPropertiesOptions.NAME]: ['NAME'],
  [WorkItemPropertiesOptions.TYPE]: ['TYPE'],
  [WorkItemPropertiesOptions.STATE]: ['STATE'],
  [WorkItemPropertiesOptions.SUBSTATE]: ['SUBSTATE'],
  [WorkItemPropertiesOptions.DESCRIPTION]: ['DESCRIPTION'],
  [WorkItemPropertiesOptions.TEST_PROGRAM]: ['TEST_PROGRAM'],
  [WorkItemPropertiesOptions.PART_NUMBER]: ['PART_NUMBER'],
  [WorkItemPropertiesOptions.WORKSPACE]: ['WORKSPACE'],
  [WorkItemPropertiesOptions.ASSIGNED_TO]: ['ASSIGNED_TO'],
  [WorkItemPropertiesOptions.REQUESTED_BY]: ['REQUESTED_BY'],
  [WorkItemPropertiesOptions.CREATED_BY]: ['CREATED_BY'],
  [WorkItemPropertiesOptions.UPDATED_BY]: ['UPDATED_BY'],
  [WorkItemPropertiesOptions.CREATED_AT]: ['CREATED_AT'],
  [WorkItemPropertiesOptions.UPDATED_AT]: ['UPDATED_AT'],
  [WorkItemPropertiesOptions.PARENT_WORK_ITEM_NAME]: ['PARENT_ID'],
  [WorkItemPropertiesOptions.PARENT_WORK_ITEM_ID]: ['PARENT_ID'],
  [WorkItemPropertiesOptions.TEMPLATE_ID]: ['TEMPLATE_ID'],
  [WorkItemPropertiesOptions.EARLIEST_START_DATE]: ['TIMELINE_EARLIEST_START_DATE_TIME'],
  [WorkItemPropertiesOptions.DUE_DATE]: ['TIMELINE_DUE_DATE_TIME'],
  [WorkItemPropertiesOptions.ESTIMATED_DURATION]: ['TIMELINE_ESTIMATED_DURATION_IN_SECONDS'],
  [WorkItemPropertiesOptions.PLANNED_START_DATE]: ['SCHEDULE_PLANNED_START_DATE_TIME'],
  [WorkItemPropertiesOptions.PLANNED_END_DATE]: ['SCHEDULE_PLANNED_END_DATE_TIME'],
  [WorkItemPropertiesOptions.PLANNED_DURATION]: ['SCHEDULE_PLANNED_DURATION_IN_SECONDS'],
  [WorkItemPropertiesOptions.ASSET_NAME]: ['RESOURCES_ASSETS_SELECTIONS_ID'],
  [WorkItemPropertiesOptions.ASSET_ID]: ['RESOURCES_ASSETS_SELECTIONS_ID'],
  [WorkItemPropertiesOptions.DUT_NAME]: ['RESOURCES_DUTS_SELECTIONS_ID'],
  [WorkItemPropertiesOptions.DUT_ID]: ['RESOURCES_DUTS_SELECTIONS_ID'],
  [WorkItemPropertiesOptions.FIXTURE_NAME]: ['RESOURCES_FIXTURES_SELECTIONS_ID'],
  [WorkItemPropertiesOptions.FIXTURE_ID]: ['RESOURCES_FIXTURES_SELECTIONS_ID'],
  [WorkItemPropertiesOptions.TARGET_LOCATION]: [
    'RESOURCES_ASSETS_SELECTIONS_TARGET_SYSTEM_ID',
    'RESOURCES_DUTS_SELECTIONS_TARGET_SYSTEM_ID',
    'RESOURCES_FIXTURES_SELECTIONS_TARGET_SYSTEM_ID',
  ],
  [WorkItemPropertiesOptions.TARGET_PARENT]: [
    'RESOURCES_ASSETS_SELECTIONS_TARGET_PARENT_ID',
    'RESOURCES_DUTS_SELECTIONS_TARGET_PARENT_ID',
    'RESOURCES_FIXTURES_SELECTIONS_TARGET_PARENT_ID',
  ],
  [WorkItemPropertiesOptions.SYSTEM_NAME]: ['RESOURCES_SYSTEMS_SELECTIONS_ID'],
  [WorkItemPropertiesOptions.SYSTEM_ID]: ['RESOURCES_SYSTEMS_SELECTIONS_ID'],
  [WorkItemPropertiesOptions.PROPERTIES]: ['PROPERTIES'],
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
