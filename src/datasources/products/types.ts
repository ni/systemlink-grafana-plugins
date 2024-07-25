import { DataQuery } from '@grafana/schema'

export interface ProductsQuery extends DataQuery {
  type: ProductsQueryType;
  partNumber: string;
  output?: ProductQueryOutput;
  productFilter?: any;
}

export enum ProductsQueryType {
  Products = 'Products',
  Summary = 'Summary',
}

export interface ProductsVariableQuery {
  workspace: string;
}

export enum ProductQueryOutput {
  EntityCounts = 'Entity Counts',
  TestResultsCountByStatus = 'Test Results Count By Status',
  TestPlansCountByState = 'Test Plans Count By State',
}

export enum StatusType {
  DONE = 'Done',
  PASSED = 'Passed',
  FAILED = 'Failed',
  RUNNING = 'Running',
  TERMINATED = 'Terminated',
  ERRORED = 'Errored'
}

export interface ProductsMetaData {
  id: string;
  partNumber: string;
  name: string;
  family: string;
  updatedAt: string;
  workspace: string;
  keywords: any;
  properties: any;
  fileIds: string[];
  returnCount: number;
}

export interface QueryProductResponse {
  products: ProductsMetaData[],
  continuationToken: string,
  totalCount: number

}

export interface QueryCountResponse {
  totalCount: number;
}

export interface QueryProductsResponse {
  products: ProductsMetaData[];
}

export interface QuerySpecsResponse {
  specs: Specs[];
}

export interface Specs {
  id?: string;
  version?: number;
  productId?: string;
  specId?: string;
  name?: string | null;
  category?: string | null;
  type?: SpecType;
  symbol?: string | null;
  block?: string | null;
  limit?: SpecLimit | null;
  unit?: string | null;
  conditions?: SpecCondition[] | null;
  keywords?: string[] | null;
  properties?: SpecProperty | null;
  workspace?: string;
  createdAt?: string;
  createdBy?: string;
  updatedAt?: string | null;
  updatedBy?: string | null;
}

export enum SpecType {
  Parametric = 'PARAMETRIC',
  Functional = 'FUNCTIONAL'
}

export interface SpecLimit {
  min: number | null;
  max: number | null;
  typical: number | null;
}

export interface SpecCondition {
  name: string | null;
  value: SpecConditionValue | null;
}

export interface SpecConditionValue {
  conditionType: ConditionType;
  discrete: Array<string | number> | null;
  range: SpecConditionRange[] | null;
  unit: string | null;
}

export interface SpecConditionRange {
  min: number | null;
  max: number | null;
  step: number | null;
}

export interface SpecProperty {
  [key: string]: string;
}

export enum ConditionType {
  Numeric = 'NUMERIC',
  String = 'STRING'
}

export interface QueryTestPlansResponse {
  testPlans: TestPlan[];
  continuationToken?: string;
  totalCount?: number;
}

export interface TestPlan {
  id: string;
  name: string;
  state: string;
  description: string | null;
  assignedTo: string | null;
  workOrderId: string | null;
  workOrderName?: string | null;
  workspace: string;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
  properties: { [key: string]: string };
  partNumber: string;
  dutId: string | null;
  testProgram: string | null;
  systemId: string | null;
  systemFilter: string | null;
  plannedStartDateTime: string | null;
  estimatedEndDateTime: string | null;
  estimatedDurationInSeconds: number | null;
  executionActions?: ExecutionDefinition[];
  executionHistory?: ExecutionEvent[];
}

export type ExecutionActionType = 'START' | 'PAUSE' | 'RESUME' | 'ABORT' | 'END';

export interface NotebookExecutionDefinition {
    action: ExecutionActionType;
    type: 'NOTEBOOK';
    notebookId: string;
}

export interface ManualExecutionDefinition {
    action: ExecutionActionType;
    type: 'MANUAL';
}

export type ExecutionDefinition = NotebookExecutionDefinition | ManualExecutionDefinition;

interface ExecutionEventBase {
    action: ExecutionActionType;
    triggeredAt: string;
    triggeredBy?: string;
}

export interface NotebookExecutionEvent extends ExecutionEventBase {
    type: 'NOTEBOOK';
    executionId: string;
}

export interface ManualExecutionEvent extends ExecutionEventBase {
    type: 'MANUAL';
}

export type ExecutionEvent = NotebookExecutionEvent | ManualExecutionEvent;

export interface TestResultStatusHttp {
  statusType: string;
  statusName: string;
}

export interface StatusTypeSummaryHttp {
  [status: string]: number;
}

export interface Results {
  status?: TestResultStatusHttp;
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
