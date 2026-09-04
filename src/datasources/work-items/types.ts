import { DataQuery } from '@grafana/schema';

export enum OutputType {
  Properties = 'Properties',
  TotalCount = 'Total Count',
}

export enum WorkItemState {
  New = 'NEW',
  Defined = 'DEFINED',
  Reviewed = 'REVIEWED',
  Scheduled = 'SCHEDULED',
  InProgress = 'IN_PROGRESS',
  PendingApproval = 'PENDING_APPROVAL',
  Closed = 'CLOSED',
  Canceled = 'CANCELED',
}

export enum WorkItemTypeOptions {
  WorkOrders = 'WORK_ORDERS',
  TestPlans = 'TEST_PLANS',
  Job = 'JOB',
  Maintenance = 'MAINTENANCE',
  Calibration = 'CALIBRATION',
  Reservation = 'RESERVATION',
  TransportOrder = 'TRANSPORT_ORDER',
}

export enum OrderByOptions {
  ID = 'ID',
  UPDATED_AT = 'UPDATED_AT',
}

export interface WorkItemsQuery extends DataQuery {
  outputType?: OutputType;
  types?: WorkItemTypeOptions[];
  properties?: WorkItemPropertiesOptions[];
  orderBy?: OrderByOptions;
  descending?: boolean;
  take?: number;
  filter?: string;
}

export interface QueryWorkItemsRequest {
  filter?: string;
  substitutions?: string[];
  take?: number;
  orderBy?: OrderByOptions;
  descending?: boolean;
  continuationToken?: string;
  returnCount?: boolean;
  projection?: WorkItemPropertiesOptions[];
}

export interface QueryWorkItemsResponse {
  workItems: WorkItem[];
  continuationToken?: string;
  totalCount?: number;
}

export interface WorkItem {
  id?: string;
  name?: string;
  type?: string;
  state?: string;
  substate?: string;
  description?: string;
  testProgram?: string;
  partNumber?: string;
  workspace?: string;
  assignedTo?: string;
  requestedBy?: string;
  createdBy?: string;
  updatedBy?: string;
  createdAt?: string;
  updatedAt?: string;
  parentId?: string;
  parentWorkItemId?: string;
  parentWorkItemName?: string;
  templateId?: string;
  timeline?: WorkItemTimeline;
  schedule?: WorkItemSchedule;
  properties?: Record<string, string>;
  [key: string]: unknown;
}

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
