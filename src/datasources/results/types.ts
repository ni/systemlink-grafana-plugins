import { DataQuery } from '@grafana/schema';

export interface ResultsQuery extends DataQuery {
  outputType: OutputType;
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

export enum UseTimeRange {
  Started = 'Started',
  Updated = 'Updated',
}

export enum ResultsProperties {
    id = 'ID',
    programName = 'PROGRAM_NAME',
    serialNumber = 'SERIAL_NUMBER',
    systemId = 'SYSTEM_ID',
    status = 'STATUS',
    totalTimeInSeconds = 'TOTAL_TIME_IN_SECONDS',
    startedAt= 'STARTED_AT',
    updatedAt = 'UPDATED_AT',
    partNumber = 'PART_NUMBER',
    dataTableIds= 'DATA_TABLE_IDS',
    fileIds = 'FILE_IDS',
    hostName = 'HOST_NAME',
    operator = 'OPERATOR',
    keywords = 'KEYWORDS',
    properties = 'PROPERTIES',
    statusTypeSummary = 'STATUS_TYPE_SUMMARY',
    workspace = 'WORKSPACE',
}

export const OrderBy = [
  {
    value: 'ID',
    label: 'ID',
    description: `ID of the result`,
  },
  {
    value: 'STARTED_AT',
    label: 'Started At',
    description: `Started At of the result`,
  },
  {
    value: 'UPDATED_AT',
    label: 'Updated At',
    description: `Updated At of the result`,
  },
  {
    value: 'PROGRAM_NAME',
    label: 'Program Name',
    description: `Program Name of the result`,
  },
  {
    value: 'SYSTEM_ID',
    label: 'System ID',
    description: `System ID of the result`,
  },
  {
    value: 'HOST_NAME',
    label: 'Host Name',
    description: `Host Name of the result`,
  },
  {
    value: 'OPERATOR',
    label: 'Operator',
    description: `Operator of the result`,
  },
  {
    value: 'SERIAL_NUMBER',
    label: 'Serial Number',
    description: `Serial Number of the result`,
  },
   {
    value: 'PART_NUMBER',
    label: 'Part Number',
    description: `Part Number of the result`,
  },
  {
    value: 'PROPERTIES',
    label: 'Properties',
    description: `Properties of the result`,
  },
  {
    value: 'TOTAL_TIME_IN_SECONDS ',
    label: 'Total Time In Seconds',
    description: `Total Time In Seconds of the result`,
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
  programName: string;
  id: string;
  systemId: string;
  hostName: string;
  operator: string;
  partNumber: string;
  serialNumber: string;
  totalTimeInSeconds: number;
  keywords: string[];
  properties: { [key: string]: string };
  fileIds: string[];
  statusTypeSummary?: StatusTypeSummaryHttp;
  workspace: string;
  dataTableIds: string[];
}

export interface QueryResultsResponse {
  results: ResultsResponseProperties[];
  continuationToken: string;
  totalCount: number;
}
