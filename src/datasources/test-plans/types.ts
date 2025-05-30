import { DataQuery } from '@grafana/schema'

export interface TestPlansQuery extends DataQuery {
    properties?: Properties[];
    outputType?: OutputType;
    orderBy?: string;
    descending?: boolean;
    queryBy?: string;
    recordCount?: number;
}

export interface TestPlansVariableQuery extends DataQuery {
    orderBy?: string;
    descending?: boolean;
    queryBy?: string;
    recordCount?: number;
}

export enum OutputType {
    Properties = "Properties",
    TotalCount = "Total Count"
}

export enum Properties {
    ASSIGNED_TO = 'ASSIGNED_TO',
    CREATED_AT = 'CREATED_AT',
    CREATED_BY = 'CREATED_BY',
    DESCRIPTION = 'DESCRIPTION',
    ID = 'ID',
    NAME = 'NAME',
    PROPERTIES = 'PROPERTIES',
    STATE = 'STATE',
    UPDATED_AT = 'UPDATED_AT',
    UPDATED_BY = 'UPDATED_BY',
    WORKSPACE = 'WORKSPACE',
    WORK_ORDER = 'WORK_ORDER',
    WORK_ORDER_ID = 'WORK_ORDER_ID',
    PRODUCT = 'PRODUCT',
    PLANNED_START_DATE_TIME = 'PLANNED_START_DATE_TIME',
    ESTIMATED_END_DATE_TIME = 'ESTIMATED_END_DATE_TIME',
    ESTIMATED_DURATION_IN_SECONDS = 'ESTIMATED_DURATION_IN_SECONDS',
    SYSTEM_NAME = 'SYSTEM_NAME',
    SYSTEM_ID = 'SYSTEM_ID',
    TEMPLATE = 'TEMPLATE',
    TEMPLATE_ID = 'TEMPLATE_ID',
    TEST_PROGRAM = 'TEST_PROGRAM',
    SUBSTATE = 'SUBSTATE',
    FIXTURE_NAMES = 'FIXTURE_NAMES',
    DUT_ID = 'DUT_ID',
};

export enum TimeFields {
    CREATED_AT = 'CREATED_AT',
    UPDATED_AT = 'UPDATED_AT',
    PLANNED_START_DATE_TIME = 'PLANNED_START_DATE_TIME',
    ESTIMATED_END_DATE_TIME = 'ESTIMATED_END_DATE_TIME'
};

export enum Projections {
    ASSIGNED_TO = 'ASSIGNED_TO',
    CREATED_AT = 'CREATED_AT',
    CREATED_BY = 'CREATED_BY',
    DESCRIPTION = 'DESCRIPTION',
    ID = 'ID',
    NAME = 'NAME',
    PROPERTIES = 'PROPERTIES',
    STATE = 'STATE',
    UPDATED_AT = 'UPDATED_AT',
    UPDATED_BY = 'UPDATED_BY',
    WORKSPACE = 'WORKSPACE',
    WORK_ORDER_NAME = 'WORK_ORDER_NAME',
    WORK_ORDER_ID = 'WORK_ORDER_ID',
    PART_NUMBER = 'PART_NUMBER',
    PLANNED_START_DATE_TIME = 'PLANNED_START_DATE_TIME',
    ESTIMATED_END_DATE_TIME = 'ESTIMATED_END_DATE_TIME',
    ESTIMATED_DURATION_IN_SECONDS = 'ESTIMATED_DURATION_IN_SECONDS',
    SYSTEM_ID = 'SYSTEM_ID',
    TEMPLATE_ID = 'TEMPLATE_ID',
    TEST_PROGRAM = 'TEST_PROGRAM',
    SUBSTATE = 'SUBSTATE',
    FIXTURE_IDS = 'FIXTURE_IDS',
    DUT_ID = 'DUT_ID'
};

export const PropertiesProjectionMap: Record<Properties, {
    label: string,
    projection: readonly Projections[],
    field: ReadonlyArray<keyof TestPlanResponseProperties>
}> = {
    [Properties.ASSIGNED_TO]: {
        label: 'Assigned to',
        projection: [Projections.ASSIGNED_TO],
        field: ['assignedTo'],
    },
    [Properties.CREATED_AT]: {
        label: 'Created at',
        projection: [Projections.CREATED_AT],
        field: ['createdAt'],
    },
    [Properties.CREATED_BY]: {
        label: 'Created by',
        projection: [Projections.CREATED_BY],
        field: ['createdBy'],
    },
    [Properties.DESCRIPTION]: {
        label: 'Description',
        projection: [Projections.DESCRIPTION],
        field: ['description'],
    },
    [Properties.ID]: {
        label: 'ID',
        projection: [Projections.ID],
        field: ['id'],
    },
    [Properties.NAME]: {
        label: 'Name',
        projection: [Projections.NAME],
        field: ['name'],
    },
    [Properties.PROPERTIES]: {
        label: 'Properties',
        projection: [Projections.PROPERTIES],
        field: ['properties'],
    },
    [Properties.STATE]: {
        label: 'State',
        projection: [Projections.STATE],
        field: ['state'],
    },
    [Properties.UPDATED_AT]: {
        label: 'Updated at',
        projection: [Projections.UPDATED_AT],
        field: ['updatedAt'],
    },
    [Properties.UPDATED_BY]: {
        label: 'Updated by',
        projection: [Projections.UPDATED_BY],
        field: ['updatedBy'],
    },
    [Properties.WORKSPACE]: {
        label: 'Workspace',
        projection: [Projections.WORKSPACE],
        field: ['workspace'],
    },
    [Properties.WORK_ORDER]: {
        label: 'Work order',
        projection: [Projections.WORK_ORDER_NAME, Projections.WORK_ORDER_ID],
        field: ['workOrderName', 'workOrderId']
    },
    [Properties.WORK_ORDER_ID]: {
        label: 'Work order ID',
        projection: [Projections.WORK_ORDER_ID],
        field: ['workOrderId'],
    },
    [Properties.PRODUCT]: {
        label: 'Product (Part number)',
        projection: [Projections.PART_NUMBER],
        field: ['partNumber'],
    },
    [Properties.PLANNED_START_DATE_TIME]: {
        label: 'Planned start date/time',
        projection: [Projections.PLANNED_START_DATE_TIME],
        field: ['plannedStartDateTime'],
    },
    [Properties.ESTIMATED_END_DATE_TIME]: {
        label: 'Estimated end date/time',
        projection: [Projections.ESTIMATED_END_DATE_TIME],
        field: ['estimatedEndDateTime'],
    },
    [Properties.ESTIMATED_DURATION_IN_SECONDS]: {
        label: 'Estimated duration',
        projection: [Projections.ESTIMATED_DURATION_IN_SECONDS],
        field: ['estimatedDurationInSeconds'],
    },
    [Properties.SYSTEM_NAME]: {
        label: 'System name',
        projection: [Projections.SYSTEM_ID],
        field: ['systemId'],
    },
    [Properties.SYSTEM_ID]: {
        label: 'System ID',
        projection: [Projections.SYSTEM_ID],
        field: ['systemId'],
    },
    [Properties.TEMPLATE]: {
        label: 'Test plan template',
        projection: [Projections.TEMPLATE_ID],
        field: ['templateId'],
    },
    [Properties.TEMPLATE_ID]: {
        label: 'Template ID',
        projection: [Projections.TEMPLATE_ID],
        field: ['templateId'],
    },
    [Properties.TEST_PROGRAM]: {
        label: 'Test program name',
        projection: [Projections.TEST_PROGRAM],
        field: ['testProgram'],
    },
    [Properties.SUBSTATE]: {
        label: 'Substate',
        projection: [Projections.SUBSTATE],
        field: ['substate'],
    },
    [Properties.FIXTURE_NAMES]: {
        label: 'Fixture names',
        projection: [Projections.FIXTURE_IDS],
        field: ['fixtureIds'],
    },
    [Properties.DUT_ID]: {
        label: 'DUT',
        projection: [Projections.DUT_ID],
        field: ['dutId'],
    },
} as const;

export const OrderBy = [
    {
        value: 'ID',
        label: 'ID',
        description: `ID of the test plan`,
    },
    {
        value: 'UPDATED_AT',
        label: 'Updated At',
        description: `Latest update at time of the test plan`,
    }
] as const;

export const OrderByOptions = {
    ID: 'ID',
    UPDATED_AT: 'UPDATED_AT'
} as const;

export interface QueryTestPlansResponse {
    testPlans: TestPlanResponseProperties[],
    continuationToken?: string,
    totalCount?: number
}

export interface TestPlanResponseProperties {
    id: string;
    templateId?: string;
    name?: string;
    state?: string;
    substate?: string;
    description?: string;
    assignedTo?: string;
    workOrderId?: string;
    partNumber?: string;
    dutId?: string;
    testProgram?: string;
    workspace?: string;
    createdBy?: string;
    updatedBy?: string;
    systemId?: string;
    fixtureIds?: string[];
    plannedStartDateTime?: string;
    estimatedEndDateTime?: string;
    estimatedDurationInSeconds?: number;
    systemFilter?: string;
    createdAt?: string;
    updatedAt?: string;
    properties?: Object;
    fileIdsFromTemplate?: string[];
    dashboard?: Object;
    workOrderName?: string;
}
