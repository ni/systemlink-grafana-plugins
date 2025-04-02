import { DataQuery } from '@grafana/schema';

export interface ResultsQuery extends DataQuery {
  outputType?: OutputType;
  properties?: ResultsProperties[];
  orderBy?: string;
  descending?: boolean;
  useTimeRange?: boolean;
  useTimeRangeFor?: string;
  recordCount?: number;
}

export enum OutputType {
  Data = 'Data',
  TotalCount = 'Total Count',
}

export enum UseTimeRangeFor {
  Started = 'Started',
  Updated = 'Updated',
}

export const OrderBy = [
  {
    value: 'ID',
    label: 'ID',
    description: 'ID of the result',
  },
  {
    value: 'STARTED_AT',
    label: 'Started At',
    description: 'Timestamp when the result started',
  },
  {
    value: 'UPDATED_AT',
    label: 'Updated At',
    description: 'Timestamp when the result was last updated',
  },
  {
    value: 'PROGRAM_NAME',
    label: 'Program Name',
    description: 'Program Name of the product associated with the result',
  },
  {
    value: 'SYSTEM_ID',
    label: 'System ID',
    description: 'System ID of the result',
  },
  {
    value: 'HOST_NAME',
    label: 'Host Name',
    description: 'Host Name of the result',
  },
  {
    value: 'OPERATOR',
    label: 'Operator',
    description: 'Operator of the result',
  },
  {
    value: 'SERIAL_NUMBER',
    label: 'Serial Number',
    description: 'Serial Number of the result',
  },
   {
    value: 'PART_NUMBER',
    label: 'Part Number',
    description: 'Part Number of the product associated with result',
  },
  {
    value: 'TOTAL_TIME_IN_SECONDS ',
    label: 'Total Time In Seconds',
    description: 'Total time taken to run the result in seconds',
  }
];

export const ResultsPropertiesOptions = {
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


export enum ResultsProperties {
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

export interface ResultsResponseProperties {
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

export interface QueryResultsResponse {
  results: ResultsResponseProperties[];
  continuationToken?: string;
  totalCount?: number;
}
