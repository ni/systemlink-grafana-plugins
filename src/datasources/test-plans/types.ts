import { DataQuery } from '@grafana/schema'

export interface TestPlansQuery extends DataQuery {
    properties?: Properties[];
    outputType: OutputType;
}

export enum OutputType {
    Properties = "Properties",
    TotalCount = "Total Count"
}

export enum Properties {
    assignedTo = 'Assigned to',
    createdAt = 'Created at',
    createdBy = 'Created by',
    description = 'Description',
    dueDate = 'Due date',
    earliestStartDate = 'Earliest start date',
    id = 'ID',
    name = 'Name',
    properties = 'Properties',
    requestedBy = 'Requested by',
    state = 'State',
    type = 'Type',
    updatedAt = 'Updated at',
    updatedBy = 'Updated by',
    workspace = 'Workspace',
    workOrder = 'Work order name (Work oder ID)',
    product = 'Product (Part number)',
    plannedStartDate = 'Planned start date',
    estimatedEndDate = 'Estimated end date',
    estimatedDuration = 'Estimated duration',
    system = 'System',
    template = 'Test plan template (Template ID)',
    testProgram = 'Test program name',
    substate = 'Substate',
    fixtureIds = 'Fixture IDs',
    dut = 'DUT',
}

export const PropertiesOptions = {
    ASSIGNED_TO: 'assignedTo',
    CREATED_AT: 'createdAt',
    CREATED_BY: 'createdBy',
    DESCRIPTION: 'description',
    DUE_DATE: 'dueDate',
    EARLIEST_START_DATE: 'earliestStartDate',
    ID: 'id',
    NAME: 'name',
    PROPERTIES: 'properties',
    REQUESTED_BY: 'requestedBy',
    STATE: 'state',
    TYPE: 'type',
    UPDATED_AT: 'updatedAt',
    UPDATED_BY: 'updatedBy',
    WORKSPACE: 'workspace',
    WORK_ORDER: 'workOrder',
    PRODUCT: 'product',
    PLANNED_START_DATE: 'plannedStartDate',
    ESTIMATED_END_DATE: 'estimatedEndDate',
    ESTIMATED_DURATION: 'estimatedDuration',
    SYSTEM: 'system',
    TEMPLATE: 'template',
    TEST_PROGRAM: 'testProgram',
    SUBSTATE: 'substate',
    FIXTURE_IDS: 'fixtureIds',
    DUT: 'dut',
}
