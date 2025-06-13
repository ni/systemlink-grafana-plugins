import { OutputType, ResultsQuery } from './types';

export interface QueryResults extends ResultsQuery {
  outputType: OutputType;
  properties?: ResultsProperties[];
  orderBy?: string;
  descending?: boolean;
  useTimeRange?: boolean;
  useTimeRangeFor?: string;
  recordCount?: number;
  queryBy?: string;
}

export interface ResultsVariableQuery extends ResultsQuery {
  properties?: string;
  partNumberQuery?: string[];
  queryBy?: string;
  resultsTake?: number;
}

export interface StepsVariableQuery extends ResultsQuery {
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

export enum ResultsProperties {
  ID = 'ID',
  PROGRAM_NAME = 'PROGRAM_NAME',
  SERIAL_NUMBER = 'SERIAL_NUMBER',
  SYSTEM_ID = 'SYSTEM_ID',
  STATUS = 'STATUS',
  TOTAL_TIME_IN_SECONDS = 'TOTAL_TIME_IN_SECONDS',
  STARTED_AT = 'STARTED_AT',
  UPDATED_AT = 'UPDATED_AT',
  PART_NUMBER = 'PART_NUMBER',
  DATA_TABLE_IDS = 'DATA_TABLE_IDS',
  FILE_IDS = 'FILE_IDS',
  HOST_NAME = 'HOST_NAME',
  OPERATOR = 'OPERATOR',
  KEYWORDS = 'KEYWORDS',
  PROPERTIES = 'PROPERTIES',
  STATUS_TYPE_SUMMARY = 'STATUS_TYPE_SUMMARY',
  WORKSPACE = 'WORKSPACE',
}

export const ResultsPropertiesOptions = [
  { label: 'ID', value: ResultsProperties.ID },
  { label: 'Test Program Name', value: ResultsProperties.PROGRAM_NAME },
  { label: 'Serial Number', value: ResultsProperties.SERIAL_NUMBER },
  { label: 'System ID', value: ResultsProperties.SYSTEM_ID },
  { label: 'Status', value: ResultsProperties.STATUS },
  { label: 'Total Time in seconds', value: ResultsProperties.TOTAL_TIME_IN_SECONDS },
  { label: 'Started At', value: ResultsProperties.STARTED_AT },
  { label: 'Updated At', value: ResultsProperties.UPDATED_AT },
  { label: 'Part Number', value: ResultsProperties.PART_NUMBER },
  { label: 'Data Table IDs', value: ResultsProperties.DATA_TABLE_IDS },
  { label: 'File IDs', value: ResultsProperties.FILE_IDS },
  { label: 'Host Name', value: ResultsProperties.HOST_NAME },
  { label: 'Operator', value: ResultsProperties.OPERATOR },
  { label: 'Keywords', value: ResultsProperties.KEYWORDS },
  { label: 'Properties', value: ResultsProperties.PROPERTIES },
  { label: 'Status Type Summary', value: ResultsProperties.STATUS_TYPE_SUMMARY },
  { label: 'Workspace', value: ResultsProperties.WORKSPACE },
];

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
