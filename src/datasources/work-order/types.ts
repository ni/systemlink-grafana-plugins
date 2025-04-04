import { DataQuery } from '@grafana/schema';
import { QueryBuilderField } from 'smart-webcomponents-react';

export interface WorkOrdersQuery extends DataQuery {
  outputType: OutputType;
  properties?: WorkOrdersProperties[];
  orderBy?: string;
  descending?: boolean;
  useTimeRange?: boolean;
  useTimeRangeFor?: string;
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
  ID: 'id',
  PROGRAM_NAME: 'programName',
  SERIAL_NUMBER: 'serialNumber',
  SYSTEM_ID: 'systemId',
  STATUS: 'status',
  TOTAL_TIME_IN_SECONDS: 'totalTimeInSeconds',
  STARTED_AT: 'startedAt',
  UPDATED_AT: 'updatedAt',
  PART_NUMBER: 'partNumber',
  DATA_TABLE_IDS: 'dataTableIds',
  FILE_IDS: 'fileIds',
  HOST_NAME: 'hostName',
  OPERATOR: 'operator',
  KEYWORDS: 'keywords',
  PROPERTIES: 'properties',
  STATUS_TYPE_SUMMARY: 'statusTypeSummary',
  WORKSPACE: 'workspace',
}


export enum WorkOrdersProperties {
  id = 'id',
  programName = 'programName',
  serialNumber = 'serialNumber',
  systemId = 'systemId',
  status = 'status',
  totalTimeInSeconds = 'totalTimeInSeconds',
  startedAt = 'startedAt',
  updatedAt = 'updatedAt',
  partNumber = 'partNumber',
  dataTableIds = 'dataTableIds',
  fileIds = 'fileIds',
  hostName = 'hostName',
  operator = 'operator',
  keywords = 'keywords',
  properties = 'properties',
  statusTypeSummary = 'statusTypeSummary',
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
  status?: StatusHttp;
  startedAt?: string;
  updatedAt?: string;
  programName?: string;
  id: string;
  systemId?: string;
  hostName?: string;
  operator?: string;
  partNumber?: string;
  serialNumber?: string;
  totalTimeInSeconds?: number;
  keywords?: string[];
  properties?: { [key: string]: string };
  fileIds?: string[];
  statusTypeSummary?: StatusTypeSummaryHttp;
  workspace?: string;
  dataTableIds?: string[];
}

export interface QueryWorkOrdersResponse {
  results: WorkOrdersResponseProperties[];
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
