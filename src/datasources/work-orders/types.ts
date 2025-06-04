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
  take?: number;
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

export enum WorkOrdersFieldNames {
  Name = 'name',
  Description = 'description',
  WorkOrderID = 'id',
  State = 'state',
  Type = 'type',
  Workspace = 'workspace',
  EarliestStartDate = 'earliestStartDate',
  DueDate = 'dueDate',
  CreatedAt = 'createdAt',
  UpdatedAt = 'updatedAt',
  AssignedTo = 'assignedTo',
  RequestedBy = 'requestedBy',
  CreatedBy = 'createdBy',
  UpdatedBy = 'updatedBy',
  Properties = 'properties',
}

export const WorkOrderProperties = {
  [WorkOrderPropertiesOptions.ID]: {
    label: 'Work order ID',
    value: WorkOrderPropertiesOptions.ID,
    field: WorkOrdersFieldNames.WorkOrderID,
  },
  [WorkOrderPropertiesOptions.NAME]: {
    label: 'Work order name',
    value: WorkOrderPropertiesOptions.NAME,
    field: WorkOrdersFieldNames.Name,
  },
  [WorkOrderPropertiesOptions.TYPE]: {
    label: 'Work order type',
    value: WorkOrderPropertiesOptions.TYPE,
    field: WorkOrdersFieldNames.Type,
  },
  [WorkOrderPropertiesOptions.STATE]: {
    label: 'State',
    value: WorkOrderPropertiesOptions.STATE,
    field: WorkOrdersFieldNames.State,
  },
  [WorkOrderPropertiesOptions.REQUESTED_BY]: {
    label: 'Requested by',
    value: WorkOrderPropertiesOptions.REQUESTED_BY,
    field: WorkOrdersFieldNames.RequestedBy,
  },
  [WorkOrderPropertiesOptions.ASSIGNED_TO]: {
    label: 'Assigned to',
    value: WorkOrderPropertiesOptions.ASSIGNED_TO,
    field: WorkOrdersFieldNames.AssignedTo,
  },
  [WorkOrderPropertiesOptions.CREATED_AT]: {
    label: 'Created at',
    value: WorkOrderPropertiesOptions.CREATED_AT,
    field: WorkOrdersFieldNames.CreatedAt,
  },
  [WorkOrderPropertiesOptions.UPDATED_AT]: {
    label: 'Updated at',
    value: WorkOrderPropertiesOptions.UPDATED_AT,
    field: WorkOrdersFieldNames.UpdatedAt,
  },
  [WorkOrderPropertiesOptions.CREATED_BY]: {
    label: 'Created by',
    value: WorkOrderPropertiesOptions.CREATED_BY,
    field: WorkOrdersFieldNames.CreatedBy,
  },
  [WorkOrderPropertiesOptions.UPDATED_BY]: {
    label: 'Updated by',
    value: WorkOrderPropertiesOptions.UPDATED_BY,
    field: WorkOrdersFieldNames.UpdatedBy,
  },
  [WorkOrderPropertiesOptions.DESCRIPTION]: {
    label: 'Description',
    value: WorkOrderPropertiesOptions.DESCRIPTION,
    field: WorkOrdersFieldNames.Description,
  },
  [WorkOrderPropertiesOptions.EARLIEST_START_DATE]: {
    label: 'Earliest start date',
    value: WorkOrderPropertiesOptions.EARLIEST_START_DATE,
    field: WorkOrdersFieldNames.EarliestStartDate,
  },
  [WorkOrderPropertiesOptions.DUE_DATE]: {
    label: 'Due date',
    value: WorkOrderPropertiesOptions.DUE_DATE,
    field: WorkOrdersFieldNames.DueDate,
  },
  [WorkOrderPropertiesOptions.WORKSPACE]: {
    label: 'Workspace',
    value: WorkOrderPropertiesOptions.WORKSPACE,
    field: WorkOrdersFieldNames.Workspace,
  },
  [WorkOrderPropertiesOptions.PROPERTIES]: {
    label: 'Properties',
    value: WorkOrderPropertiesOptions.PROPERTIES,
    field: WorkOrdersFieldNames.Properties,
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
