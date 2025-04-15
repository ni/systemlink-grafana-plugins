import { DataQuery } from '@grafana/schema';

export interface TestPlansQuery extends DataQuery {
  queryBy?: string;
  outputType: OutputType;

}

export enum OutputType {
  Data = 'Data',
  TotalCount = 'Total Count',
}

export interface QueryTestPlansResponse {
  testPlans: TestPlan[];
  continuationToken?: string | null;
  totalCount?: number;
}

export interface TestPlan {
  id: string;
  templateId: string | null;
  name: string;
  state: State;
  substate: string | null;
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
  fixtureIds: string[];
  systemFilter: string | null;
  plannedStartDateTime: string | null;
  estimatedEndDateTime: string | null;
  estimatedDurationInSeconds: number | null;
  fileIdsFromTemplate: string[];
  dashboardUrl?: { url: string };
  dashboard?: { url: string };
  workflow: WorkflowDefinition;
}

export enum State {
  New = 'NEW',
  Defined = 'DEFINED',
  Reviewed = 'REVIEWED',
  Scheduled = 'SCHEDULED',
  InProgress = 'IN_PROGRESS',
  PendingApproval = 'PENDING_APPROVAL',
  Closed = 'CLOSED',
  Canceled = 'CANCELED'
}

export interface NoneExecutionDefinition {
  action: string;
  type: 'NONE';
}

export interface NotebookExecutionDefinition {
  action: string;
  type: 'NOTEBOOK';
  notebookId: string;
}

export interface ManualExecutionDefinition {
  action: string;
  type: 'MANUAL';
}

export interface JobExecutionDefinition {
  action: string;
  type: 'JOB';
  jobs: Job[];
  systemId?: string | null;
}

export type ExecutionDefinition = NotebookExecutionDefinition | ManualExecutionDefinition | JobExecutionDefinition | NoneExecutionDefinition;

export interface Job {
  functions: string[];
  arguments: unknown[][];
  metadata: { [key: string]: unknown };
}

interface ExecutionEventBase {
  action: string;
  triggeredAt: string;
  triggeredBy?: string;
}

export interface NotebookExecutionEvent extends ExecutionEventBase {
  type: 'NOTEBOOK';
  executionId: string;
}

export interface JobExecutionEvent extends ExecutionEventBase {
  type: 'JOB';
  jobIds: string[];
}

export interface ManualExecutionEvent extends ExecutionEventBase {
  type: 'MANUAL';
}

export type ExecutionEvent = NotebookExecutionEvent | ManualExecutionEvent | JobExecutionEvent;

export interface NotebookExecutionResult {
  type: 'NOTEBOOK';
  executionId: string;
}

export interface ManualExecutionResult {
  type: 'MANUAL';
}

export type ExecutionResult = ManualExecutionResult | NotebookExecutionResult;

export interface WorkflowDefinition {
  actions: ActionDefinition[];
  states: StateDefinition[];
}

export interface ActionDefinition {
  id: string;
  label: string;
  executionAction: ExecutionDefinition;
}

export interface StateDefinition {
  state: State;
  dashboardAvailable?: boolean;
  defaultSubstate: string;
  substates: SubstateDefinition[];
}

export interface SubstateDefinition {
  id: string;
  label: string;
  availableActions: ActionTransitionDefinition[];
}

export interface ActionTransitionDefinition {
  action: string;
  nextState: State;
  nextSubstate: string;
  showInUI: boolean;
}
