import { DataQuery } from '@grafana/schema'

export interface TestPlansQuery extends DataQuery {
    properties?: Properties[];
    outputType: OutputType;
    orderBy?: string;
    descending?: boolean;
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

export const PropertiesProjectionMap: Record<Properties, { label: string, projection: string[], field: string[] }> = {
    [Properties.ASSIGNED_TO]: {
        label: 'Assigned to',
        projection: ['ASSIGNED_TO'],
        field: ['assignedTo'],
    },
    [Properties.CREATED_AT]: {
        label: 'Created at',
        projection: ['CREATED_AT'],
        field: ['createdAt'],
    },
    [Properties.CREATED_BY]: {
        label: 'Created by',
        projection: ['CREATED_BY'],
        field: ['createdBy'],
    },
    [Properties.DESCRIPTION]: {
        label: 'Description',
        projection: ['DESCRIPTION'],
        field: ['description'],
    },
    [Properties.ID]: {
        label: 'ID',
        projection: ['ID'],
        field: ['id'],
    },
    [Properties.NAME]: {
        label: 'Name',
        projection: ['NAME'],
        field: ['name'],
    },
    [Properties.PROPERTIES]: {
        label: 'Properties',
        projection: ['PROPERTIES'],
        field: ['properties'],
    },
    [Properties.STATE]: {
        label: 'State',
        projection: ['STATE'],
        field: ['state'],
    },
    [Properties.UPDATED_AT]: {
        label: 'Updated at',
        projection: ['UPDATED_AT'],
        field: ['updatedAt'],
    },
    [Properties.UPDATED_BY]: {
        label: 'Updated by',
        projection: ['UPDATED_BY'],
        field: ['updatedBy'],
    },
    [Properties.WORKSPACE]: {
        label: 'Workspace',
        projection: ['WORKSPACE'],
        field: ['workspace'],
    },
    [Properties.WORK_ORDER]: {
        label: 'Work order',
        projection: ['WORK_ORDER_NAME', 'WORK_ORDER_ID'],
        field: ['workOrderName', 'workOrderId']
    },
    [Properties.WORK_ORDER_ID]: {
        label: 'Work order ID',
        projection: ['WORK_ORDER_ID'],
        field: ['workOrderId'],
    },
    [Properties.PRODUCT]: {
        label: 'Product (Part number)',
        projection: ['PART_NUMBER'],
        field: ['partNumber'],
    },
    [Properties.PLANNED_START_DATE_TIME]: {
        label: 'Planned start date/time',
        projection: ['PLANNED_START_DATE_TIME'],
        field: ['plannedStartDateTime'],
    },
    [Properties.ESTIMATED_END_DATE_TIME]: {
        label: 'Estimated end date/time',
        projection: ['ESTIMATED_END_DATE_TIME'],
        field: ['estimatedEndDateTime'],
    },
    [Properties.ESTIMATED_DURATION_IN_SECONDS]: {
        label: 'Estimated duration',
        projection: ['ESTIMATED_DURATION_IN_SECONDS'],
        field: ['estimatedDurationInSeconds'],
    },
    [Properties.SYSTEM_NAME]: {
        label: 'System name',
        projection: ['SYSTEM_ID'],
        field: ['systemId'],
    },
    [Properties.SYSTEM_ID]: {
        label: 'System ID',
        projection: ['SYSTEM_ID'],
        field: ['systemId'],
    },
    [Properties.TEMPLATE]: {
        label: 'Test plan template',
        projection: ['TEMPLATE_ID'],
        field: ['templateId'],
    },
    [Properties.TEMPLATE_ID]: {
        label: 'Template ID',
        projection: ['TEMPLATE_ID'],
        field: ['templateId'],
    },
    [Properties.TEST_PROGRAM]: {
        label: 'Test program name',
        projection: ['TEST_PROGRAM'],
        field: ['testProgram'],
    },
    [Properties.SUBSTATE]: {
        label: 'Substate',
        projection: ['SUBSTATE'],
        field: ['substate'],
    },
    [Properties.FIXTURE_NAMES]: {
        label: 'Fixture names',
        projection: ['FIXTURE_IDS'],
        field: ['fixtureIds'],
    },
    [Properties.DUT_ID]: {
        label: 'DUT',
        projection: ['DUT_ID'],
        field: ['dutId'],
    },
};

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
];

export const OrderByOptions = {
    ID: 'ID',
    UPDATED_AT: 'UPDATED_AT'
};

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
