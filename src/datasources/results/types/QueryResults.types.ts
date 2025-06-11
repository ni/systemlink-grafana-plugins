import { OutputType, ResultsQuery } from './types';

export interface QueryResults extends ResultsQuery {
  outputType: OutputType;
  properties?: ResultsProperties[];
  useTimeRange?: boolean;
  useTimeRangeFor?: string;
  recordCount?: number;
  queryBy?: string;
  partNumberQuery?: string[];
}

export interface ResultsVariableQuery extends ResultsQuery {
  properties?: string;
  partNumberQuery?: string[];
  queryBy?: string;
  resultsTake?: number;
}

export interface StepsVariableQuery extends ResultsQuery {
  partNumberQueryInSteps: string[];
  queryByResults: string;
  queryBySteps?: string;
  stepsTake?: number;
}

export const ResultsVariableProperties = [
  {
    value: 'DATA_TABLE_IDS',
    label: 'Data Table IDs',
    description: 'Data Table IDs associated with the result',
  },
  {
    value: 'PROGRAM_NAME',
    label: 'Test Program Name',
    description: 'Test Program Name of the result',
  }
]

export const DefaultOrderBy = 'STARTED_AT';
export const DefaultDescending = true;

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
};

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
