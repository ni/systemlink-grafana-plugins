import { DataQuery } from '@grafana/schema';

export interface WorkOrdersQuery extends DataQuery {
    queryBy?: string;
    outputType: OutputType;
    properties: WorkOrderProperties[];
}

export enum OutputType {
    Properties = "Properties",
    TotalCount = "Total Count"
}

export enum WorkOrderProperties {
    id = "Work order ID",
    name = "Work order name",
    type = "Work order type",
    state = "State",
    requestedBy = "Requested by",
    assignedTo = "Assigned to",
    createdAt = "Created",
    updatedAt = "Updated",
    createdBy = "Created by",
    updatedBy = "Updated by",
    description = "Description",
    earliestStartDate = "Earliest start date",
    dueDate = "Due date",
    workspace = "Workspace",
    properties = "Properties"
}

export const WorkOrderPropertiesOptions = {
    ID: "id",
    NAME: "name",
    TYPE: "type",
    STATE: "state",
    REQUESTED_BY: "requestedBy",
    ASSIGNED_TO: "assignedTo",
    CREATED_AT: "createdAt",
    UPDATED_AT: "updatedAt",
    CREATED_BY: "createdBy",
    UPDATED_BY: "updatedBy",
    DESCRIPTION: "description",
    EARLIEST_START_DATE: "earliestStartDate",
    DUE_DATE: "dueDate",
    WORKSPACE: "workspace",
    PROPERTIES: "properties"
}
