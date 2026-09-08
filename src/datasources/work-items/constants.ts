import { WorkItemTypeOptions } from './types';

export const TAKE_LIMIT = 10000;
export const DEFAULT_TAKE = 1000;

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
