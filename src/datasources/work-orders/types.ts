import { DataQuery } from '@grafana/schema';

export interface WorkOrdersQuery extends DataQuery {
    outputType: OutputType;
    queryBy?: string;
}

export enum OutputType {
    Properties = "Properties",
    TotalCount = "Total Count"
}
export interface QueryWorkOrdersRequestBody {
    filter?: string;
    take?: number;
    orderBy?: string;
    descending?: boolean;
    returnCount?: boolean;
    projection?: string[];
    substitutions?: string[];
    continuationToken?: string;
}

export interface WorkOrdersResponse {
    workOrders: WorkOrder[];
    continuationToken?: string;
    totalCount?: number;
}

export interface WorkOrder {
    id: string;
    name: string;
    type: Type;
    description: string | null;
    state: State;
    createdBy: string;
    updatedBy: string;
    assignedTo: string | null;
    requestedBy: string | null;
    createdAt: string;
    updatedAt: string;
    earliestStartDate: string | null;
    dueDate: string | null;
    properties: {
        [key: string]: string
    };
    workspace: string;
}

export enum Type {
    TestRequest = 'TEST_REQUEST'
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
