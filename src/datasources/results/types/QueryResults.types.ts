import { OutputType, ResultsQuery } from './types';

export interface QueryResults extends ResultsQuery {
  outputType: OutputType;
  properties?: ResultsProperties[];
  useTimeRange?: boolean;
  recordCount?: number;
  queryBy?: string;
}

export interface QueryResultsDefaultValues extends QueryResults {
  orderBy: string;
  descending: boolean;
  useTimeRangeFor: string;
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

export const PropertiesProjectionMap: Record<ResultsProperties, {
  label: string;
  projection: ResultsProperties;
}> = {
  [ResultsProperties.id]: {
    label: 'Result ID',
    projection: ResultsProperties.id
  },
  [ResultsProperties.programName]: {
    label: 'Test program name',
    projection: ResultsProperties.programName
  },
  [ResultsProperties.serialNumber]: {
    label: 'Serial number',
    projection: ResultsProperties.serialNumber
  },
  [ResultsProperties.systemId]: {
    label: 'System ID',
    projection: ResultsProperties.systemId
  },
  [ResultsProperties.status]: {
    label: 'Status',
    projection: ResultsProperties.status
  },
  [ResultsProperties.totalTimeInSeconds]: {
    label: 'Total time (s)',
    projection: ResultsProperties.totalTimeInSeconds
  },
  [ResultsProperties.startedAt]: {
    label: 'Started at',
    projection: ResultsProperties.startedAt
  },
  [ResultsProperties.updatedAt]: {
    label: 'Updated at',
    projection: ResultsProperties.updatedAt
  },
  [ResultsProperties.partNumber]: {
    label: 'Part number',
    projection: ResultsProperties.partNumber
  },
  [ResultsProperties.dataTableIds]: {
    label: 'Data table IDs',
    projection: ResultsProperties.dataTableIds
  },
  [ResultsProperties.fileIds]: {
    label: 'File IDs',
    projection: ResultsProperties.fileIds
  },
  [ResultsProperties.hostName]: {
    label: 'Host name',
    projection: ResultsProperties.hostName
  },
  [ResultsProperties.operator]: {
    label: 'Operator',
    projection: ResultsProperties.operator
  },
  [ResultsProperties.keywords]: {
    label: 'Keywords',
    projection: ResultsProperties.keywords
  },
  [ResultsProperties.properties]: {
    label: 'Properties',
    projection: ResultsProperties.properties
  },
  [ResultsProperties.statusTypeSummary]: {
    label: 'Status type summary',
    projection: ResultsProperties.statusTypeSummary
  },
  [ResultsProperties.workspace]: {
    label: 'Workspace',
    projection: ResultsProperties.workspace
  }
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
