import { DataQuery } from '@grafana/schema';
import { QueryBuilderField } from 'smart-webcomponents-react';

export interface WorkOrdersQuery extends DataQuery {
  outputType: OutputType;
  orderBy?: string;
  descending?: boolean;
  recordCount?: number;
  queryBy?: string;
}

export interface WorkOrdersVariableQuery extends DataQuery {
  queryBy?: string;
}

export enum OutputType {
  Summary = 'Work Orders Summary',
  Data = 'List Work Orders',
}

export enum UseTimeRangeFor {
  Started = 'Started',
  Updated = 'Updated',
}

export const OrderBy = [
  {
    value: 'ID',
    label: 'ID',
    description: 'ID of the work order',
  },
  {
    value: 'UPDATED_AT',
    label: 'Updated At',
    description: 'Timestamp when the work order was last updated',
  }
];

export const WorkOrdersPropertiesOptions = {
  ASSIGNED_TO: 'assignedTo',
  CREATED_AT: 'createdAt',
  CREATED_BY: 'createdBy',
  DESCRIPTION: 'description',
  DUE_DATE: 'dueDate',
  EARLIEST_START_DATE: 'earliestStartDate',
  ID: 'id',
  NAME: 'name',
  PROPERTIES: 'properties',
  REQUESTED_BY: 'requestedBy',
  STATE: 'state',
  TYPE: 'type',
  UPDATED_AT: 'updatedAt',
  UPDATED_BY: 'updatedBy',
  WORKSPACE: 'workspace',
}


export enum WorkOrdersProperties {
  assignedTo = 'assignedTo',
  createdAt = 'createdAt',
  createdBy = 'createdBy',
  description = 'description',
  dueDate = 'dueDate',
  earliestStartDate = 'earliestStartDate',
  id = 'id',
  name = 'name',
  properties = 'properties',
  requestedBy = 'requestedBy',
  state = 'state',
  type = 'type',
  updatedAt = 'updatedAt',
  updatedBy = 'updatedBy',
  workspace = 'workspace',
}

export interface StatusHttp {
  statusType: string;
  statusName: string;
}

export interface StatusTypeSummaryHttp {
  [status: string]: number;
}

export interface WorkOrdersResponseProperties {
  assignedTo: string;
  createdAt: string;
  createdBy: string;
  description: string;
  dueDate: string;
  earliestStartDate: string;
  id: string;
  name: string;
  properties: { [key: string]: string };
  requestedBy: string;
  state: string;
  type: string;
  updatedAt: string;
  updatedBy: string;
  workspace: string;
}

export interface QueryWorkOrdersResponse {
  workOrders: WorkOrdersResponseProperties[];
  continuationToken?: string;
  totalCount?: number;
}

export interface QBField extends QueryBuilderField {
  lookup?: {
    readonly?: boolean;
    dataSource: Array<{
      label: string,
      value: string
    }>;
  },
}
