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