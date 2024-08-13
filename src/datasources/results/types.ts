import { DataQuery } from '@grafana/schema'

export interface ResultsQuery extends DataQuery {
  type: ResultsQueryType;
  metadata?: ResultsMetaData[];
  partNumber?: string;
  testProgram?: string;
  workspace?: string;
  queryBy?: string;
  orderBy?: any;
  descending?: boolean;
  recordCount?: number;
  useTimeRange?: boolean;
  useTimeRangeFor?: string;
  outputType: OutputType;
  resultFilter?: string;
  stepFilter?: string;
  measurementAsEntries?: boolean; 
}

export enum ResultsQueryType {
  MetaData = 'MetaData',
  StepData = 'StepData',
  DataTables = 'DataTables',
}

export interface ResultsVariableQuery{
  type: ResultsQueryType;
  queryBy: string;
  workspace: string;
  useTimeRange: boolean;
  useTimeRangeFor: string;
  resultFilter: string;
  stepFilter: string;
}

export enum useTimeRange {
  Started = 'Started',
  Updated = 'Updated',
}

export enum OutputType {
  Data = 'Data',
  TotalCount = 'Total Count',
}

export interface StatusHttp {
  statusType: string;
  statusName: string;
}

export interface StatusTypeSummaryHttp {
  [status: string]: number;
}

export interface Results {
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

export interface DataTable {
  columns: any;
  id: string;
  name: string;
  properties: { [key: string]: string };
  rowCount: number;
  workspace: string;
  createdAt: string;
}

export interface QueryResultsHttpResponse {
  results: Results[];
  continuationToken: string;
  totalCount?: number;
  error?: ErrorBody;
}

export interface QueryDataTablesHttpResponse {
  dataTables: DataTable[];
  continuationToken: string;
}

export interface ErrorBody {
  resourceType?: string;
  resourceId?: string;
  name?: string;
  code?: number;
  message?: string;
  args?: string[];
  innerErrors?: ErrorBody[];
}

export enum ResultsMetaData {
    id = 'ID',
    programName = 'PROGRAM_NAME',
    serialNumber = 'SERIAL_NUMBER',
    systemId = 'SYSTEM_ID',
    status = 'STATUS',
    totalTimeInSeconds = 'TOTAL_TIME_IN_SECONDS',
    startedAt= 'STARTED_AT',
    updated = 'UPDATED_AT',
    partNumber = 'PART_NUMBER',
    dataTablesIds= 'DATA_TABLE_IDS',
    fileIds = 'FILE_IDS',
    hostName = 'HOST_NAME',
    operator = 'OPERATOR',
    keywords = 'KEYWORDS',
    properties = 'PROPERTIES',
    statusSummary = 'STATUS_SUMMARY',
    workspace = 'WORKSPACE',
}

export enum StepsMetaData{
  stepType = 'STEP_TYPE',
  name = 'NAME',
  stepId = 'STEP_ID',
  parentId = 'PARENT_ID',
  resultId = 'RESULT_ID',
  path = 'PATH',
  pathIds = 'PATH_IDS', 
  status = 'STATUS',
  totalTimeInSeconds = 'TOTAL_TIME_IN_SECONDS',
  startedAt = 'STARTED_AT',
  updatedAt = 'UPDATED_AT',
  inputs = 'INPUTS',
  outputs = 'OUTPUTS',
  dataModel = 'DATA_MODEL',
  data = 'DATA',
  hasChildren = 'HAS_CHILDREN',
  workspace = 'WORKSPACE',
  keywords = 'KEYWORDS',
  properties = 'PROPERTIES',
}

export enum DataTablesMetaData{
  columns = 'COLUMNS',
  id = 'ID',
  name = 'NAME',
  properties = 'PROPERTIES',
  rowCount = 'ROW_COUNT',
  workspace = 'WORKSPACE',
  createdAt = 'CREATED_AT',
}


export interface Step {
  name: string;
  stepType: string;
  stepId: string;
  parentId: string;
  resultId: string;
  path: string;
  pathIds: string[];
  status: StatusHttp;
  totalTimeInSeconds: number;
  startedAt: string;
  updatedAt: string;
  inputs: Input[];
  outputs: Output[];
  dataModel: string;
  data: StepData;
  hasChildren: boolean;
  workspace: string;
  keywords: string[];
  properties: { [key: string]: string };
}

export interface Input {
  name: string;
  value: number;
}

export interface Output {
  name: string;
  value: number;
}

export interface StepData {
  text: string;
  parameters: Parameter[];
}

export interface Parameter {
  name: string;
  status: string;
  measurement: string;
  lowLimit: string;
  highLimit: string;
  nominalValue: string;
  units: string;
  comparisonType: string;
  nitmParameterType?: string;
  additionalProp?: string;
}

export interface QueryStepsHttpResponse {
  steps: Step[];
  continuationToken: string;
  totalCount?: number;
}
