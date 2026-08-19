import { DataSourceJsonData } from '@grafana/data';
import { DataQuery } from '@grafana/schema';

export interface WorkItemsDataSourceOptions extends DataSourceJsonData {
}

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
  orderBy?: OrderByOptions;
  descending?: boolean;
  take?: number;
}
