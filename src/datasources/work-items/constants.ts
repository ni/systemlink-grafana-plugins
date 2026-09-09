import { WorkItemTypeOptions } from './types';

export const TAKE_LIMIT = 10000;
export const DEFAULT_TAKE = 1000;

// Backend `projection` value used to fetch the custom properties bag of a work item.
export const WORK_ITEM_PROPERTIES_PROJECTION = 'PROPERTIES';

// Maximum number of custom property options offered in the properties dropdown.
export const CUSTOM_PROPERTY_OPTIONS_LIMIT = 10_000;

// Appended to custom property option values so they cannot collide with the
// standard `WorkItemPropertiesOptions` values within the same dropdown.
export const CUSTOM_PROPERTY_SUFFIX = '-(custom-properties)';

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
