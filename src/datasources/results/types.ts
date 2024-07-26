import { DataQuery } from '@grafana/schema'

export interface ResultsQuery extends DataQuery {
  type: ResultsQueryType;
  useTimeRange?: boolean;
  useTimeRangeFor?: string;
  outputType: OutputType;
  resultFilter?: string;
  stepFilter?: string;
}

export enum ResultsQueryType {
  MetaData = 'MetaData',
  StepData = 'StepData',
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

export interface QueryResultsHttpResponse {
  results: Results[];
  continuationToken: string;
  totalCount?: number;
  error?: ErrorBody;
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
