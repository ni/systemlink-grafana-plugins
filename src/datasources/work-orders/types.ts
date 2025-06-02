import { DataQuery } from '@grafana/schema';

export interface WorkOrdersQuery extends DataQuery {
  queryBy?: string;
  outputType?: OutputType;
  properties?: WorkOrderPropertiesOptions[];
  orderBy?: string;
  descending?: boolean;
  take?: number;
}

export interface WorkOrdersVariableQuery extends DataQuery {
  orderBy?: string;
  descending?: boolean;
  queryBy?: string;
}

export enum OutputType {
  Properties = 'Properties',
  TotalCount = 'Total Count',
}

export enum WorkOrderPropertiesOptions {
  ID = 'ID',
  NAME = 'NAME',
  TYPE = 'TYPE',
  STATE = 'STATE',
  REQUESTED_BY = 'REQUESTED_BY',
  ASSIGNED_TO = 'ASSIGNED_TO',
  CREATED_AT = 'CREATED_AT',
  UPDATED_AT = 'UPDATED_AT',
  CREATED_BY = 'CREATED_BY',
  UPDATED_BY = 'UPDATED_BY',
  DESCRIPTION = 'DESCRIPTION',
  EARLIEST_START_DATE = 'EARLIEST_START_DATE',
  DUE_DATE = 'DUE_DATE',
  WORKSPACE = 'WORKSPACE',
  PROPERTIES = 'PROPERTIES',
}

export const WorkOrderProperties = {
  [WorkOrderPropertiesOptions.ID]: {
    label: 'Work order ID',
    value: WorkOrderPropertiesOptions.ID,
    field: 'id',
  },
  [WorkOrderPropertiesOptions.NAME]: {
    label: 'Work order name',
    value: WorkOrderPropertiesOptions.NAME,
    field: 'name',
  },
  [WorkOrderPropertiesOptions.TYPE]: {
    label: 'Work order type',
    value: WorkOrderPropertiesOptions.TYPE,
    field: 'type',
  },
  [WorkOrderPropertiesOptions.STATE]: {
    label: 'State',
    value: WorkOrderPropertiesOptions.STATE,
    field: 'state',
  },
  [WorkOrderPropertiesOptions.REQUESTED_BY]: {
    label: 'Requested by',
    value: WorkOrderPropertiesOptions.REQUESTED_BY,
    field: 'requestedBy',
  },
  [WorkOrderPropertiesOptions.ASSIGNED_TO]: {
    label: 'Assigned to',
    value: WorkOrderPropertiesOptions.ASSIGNED_TO,
    field: 'assignedTo',
  },
  [WorkOrderPropertiesOptions.CREATED_AT]: {
    label: 'Created at',
    value: WorkOrderPropertiesOptions.CREATED_AT,
    field: 'createdAt',
  },
  [WorkOrderPropertiesOptions.UPDATED_AT]: {
    label: 'Updated at',
    value: WorkOrderPropertiesOptions.UPDATED_AT,
    field: 'updatedAt',
  },
  [WorkOrderPropertiesOptions.CREATED_BY]: {
    label: 'Created by',
    value: WorkOrderPropertiesOptions.CREATED_BY,
    field: 'createdBy',
  },
  [WorkOrderPropertiesOptions.UPDATED_BY]: {
    label: 'Updated by',
    value: WorkOrderPropertiesOptions.UPDATED_BY,
    field: 'updatedBy',
  },
  [WorkOrderPropertiesOptions.DESCRIPTION]: {
    label: 'Description',
    value: WorkOrderPropertiesOptions.DESCRIPTION,
    field: 'description',
  },
  [WorkOrderPropertiesOptions.EARLIEST_START_DATE]: {
    label: 'Earliest start date',
    value: WorkOrderPropertiesOptions.EARLIEST_START_DATE,
    field: 'earliestStartDate',
  },
  [WorkOrderPropertiesOptions.DUE_DATE]: {
    label: 'Due date',
    value: WorkOrderPropertiesOptions.DUE_DATE,
    field: 'dueDate',
  },
  [WorkOrderPropertiesOptions.WORKSPACE]: {
    label: 'Workspace',
    value: WorkOrderPropertiesOptions.WORKSPACE,
    field: 'workspace',
  },
  [WorkOrderPropertiesOptions.PROPERTIES]: {
    label: 'Properties',
    value: WorkOrderPropertiesOptions.PROPERTIES,
    field: 'properties',
  },
} as const;

export const OrderByOptions = {
  ID: 'ID',
  UPDATED_AT: 'UPDATED_AT'
};

export const OrderBy = [
  {
    value: OrderByOptions.ID,
    label: 'ID',
    description: `ID of the work order`,
  },
  {
    value: OrderByOptions.UPDATED_AT,
    label: 'Updated At',
    description: `Latest update at time of the work order`,
  },
];

export interface QueryWorkOrdersRequestBody {
  filter?: string;
  take?: number;
  orderBy?: string;
  descending?: boolean;
  returnCount?: boolean;
  projection?: string[];
  substitutions?: string[];
  continuationToken?: string;
}

export interface WorkOrdersResponse {
  workOrders: WorkOrder[];
  continuationToken?: string;
  totalCount?: number;
}

export interface WorkOrder {
  id: string;
  name: string;
  type: Type;
  description: string | null;
  state: State;
  createdBy: string;
  updatedBy: string;
  assignedTo: string | null;
  requestedBy: string | null;
  createdAt: string;
  updatedAt: string;
  earliestStartDate: string | null;
  dueDate: string | null;
  properties: {
    [key: string]: string;
  };
  workspace: string;
}

export enum Type {
  TestRequest = 'TEST_REQUEST',
}

export enum State {
  New = 'NEW',
  Defined = 'DEFINED',
  Reviewed = 'REVIEWED',
  Scheduled = 'SCHEDULED',
  InProgress = 'IN_PROGRESS',
  PendingApproval = 'PENDING_APPROVAL',
  Closed = 'CLOSED',
  Canceled = 'CANCELED',
}
