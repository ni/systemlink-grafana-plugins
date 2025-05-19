import { DataQuery } from '@grafana/schema'

export interface TestPlansQuery extends DataQuery {
    properties?: TestPlanProperties[];
    outputType: OutputType;
    orderBy?: string;
    descending?: boolean;
    recordCount?: number;
}

export enum OutputType {
    Properties = "Properties",
    TotalCount = "Total Count"
}

export interface TestPlanProperties {
    id: Properties;
    label: string,
    projection?: string[],
    field: string[]
}

// export enum Properties {
//     ASSIGNED_TO = 'Assigned to',
//     CREATED_AT = 'Created at',
//     CREATED_BY = 'Created by',
//     DESCRIPTION = 'Description',
//     ID = 'ID',
//     NAME = 'Name',
//     PROPERTIES = 'Properties',
//     STATE = 'State',
//     UPDATED_AT = 'Updated at',
//     UPDATED_BY = 'Updated by',
//     WORKSPACE = 'Workspace',
//     WORK_ORDER = 'Work order name (Work oder ID)',
//     PRODUCT = 'Product (Part number)',
//     PLANNED_START_DATE_TIME = 'Planned start date',
//     ESTIMATED_END_DATE_TIME = 'Estimated end date',
//     ESTIMATED_DURATION_IN_SECONDS = 'Estimated duration',
//     SYSTEM_ID = 'System',
//     TEMPLATE_ID = 'Test plan template (Template ID)',
//     TEST_PROGRAM = 'Test program name',
//     SUBSTATE = 'Substate',
//     FIXTURE_IDS = 'List of Fixture name (Fixture ID)',
//     DUT_ID = 'DUT',
// }

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
    SYSTEM_ID = 'SYSTEM_ID',
    TEMPLATE = 'TEMPLATE',
    TEMPLATE_ID = 'TEMPLATE_ID',
    TEST_PROGRAM = 'TEST_PROGRAM',
    SUBSTATE = 'SUBSTATE',
    FIXTURE_IDS = 'FIXTURE_IDS',
    DUT_ID = 'DUT_ID',
};

export const PropertiesWithProjections: Map<Properties, TestPlanProperties> = new Map([
    [Properties.ASSIGNED_TO, { id: Properties.ASSIGNED_TO, label: 'Assigned to', field: ['assignedTo'] }],
    [Properties.CREATED_AT, { id: Properties.CREATED_AT, label: 'Created at', field: ['createdAt'] }],
    [Properties.CREATED_BY, { id: Properties.CREATED_BY, label: 'Created by', field: ['createdBy'] }],
    [Properties.DESCRIPTION, { id: Properties.DESCRIPTION, label: 'Description', field: ['description'] }],
    [Properties.ID, { id: Properties.ID, label: 'ID', field: ['id'] }],
    [Properties.NAME, { id: Properties.NAME, label: 'Name', field: ['name'] }],
    [Properties.PROPERTIES, { id: Properties.PROPERTIES, label: 'Properties', field: ['properties'] }],
    [Properties.STATE, { id: Properties.STATE, label: 'State', field: ['state'] }],
    [Properties.UPDATED_AT, { id: Properties.UPDATED_AT, label: 'Updated at', field: ['updatedAt'] }],
    [Properties.UPDATED_BY, { id: Properties.UPDATED_BY, label: 'Updated by', field: ['updatedBy'] }],
    [Properties.WORKSPACE, { id: Properties.WORKSPACE, label: 'Workspace name (Workspace ID)', field: ['workspace'] }],
    [Properties.WORK_ORDER, { id: Properties.WORK_ORDER, label: 'Work order', projection: ['WORK_ORDER_ID', 'WORK_ORDER_NAME'], field: ['workOrderId', 'workOrderName'] }],
    [Properties.WORK_ORDER_ID, { id: Properties.WORK_ORDER_ID, label: 'Work order ID', field: ['workOrderId'] }],
    [Properties.PRODUCT, { id: Properties.PRODUCT, label: 'Product (Part number)', projection: ['PART_NUMBER'], field: ['partNumber'] }],
    [Properties.PLANNED_START_DATE_TIME, { id: Properties.PLANNED_START_DATE_TIME, label: 'Planned start date time', field: ['plannedStartDateTime'] }],
    [Properties.ESTIMATED_END_DATE_TIME, { id: Properties.ESTIMATED_END_DATE_TIME, label: 'Estimated end date time', field: ['estimatedEndDateTime'] }],
    [Properties.ESTIMATED_DURATION_IN_SECONDS, { id: Properties.ESTIMATED_DURATION_IN_SECONDS, label: 'Estimated duration in seconds (seconds)', field: ['estimatedDurationInSeconds'] }],
    [Properties.SYSTEM_ID, { id: Properties.SYSTEM_ID, label: 'System name (System ID)', field: ['systemId'] }],
    [Properties.TEMPLATE_ID, { id: Properties.TEMPLATE_ID, label: 'Template ID', field: ['templateId'] }],
    [Properties.TEMPLATE, { id: Properties.TEMPLATE, label: 'Test plan template', field: [], projection: ['TEMPLATE_ID'] }],
    [Properties.TEST_PROGRAM, { id: Properties.TEST_PROGRAM, label: 'Test program name', field: ['testProgram'] }],
    [Properties.SUBSTATE, { id: Properties.SUBSTATE, label: 'Substate', field: ['substate'] }],
    [Properties.FIXTURE_IDS, { id: Properties.FIXTURE_IDS, label: 'List of Fixture names', field: ['fixtureIds'] }],
    [Properties.DUT_ID, { id: Properties.DUT_ID, label: 'DUT', field: ['dutId'] }]
]);

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
    continuationToken: string,
    totalCount: number
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
    dutIdd?: string;
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

export interface QueryProductResponse {
    products: ProductResponseProperties[],
    continuationToken: string,
    totalCount: number
}

export interface ProductResponseProperties {
    partNumber: string;
    name?: string;
}

export interface QueryTemplatesResponse {
    testPlanTemplates: TemplateResponseProperties[],
    continuationToken: string,
}

export interface TemplateResponseProperties {
    id: string;
    name: string;
}

export interface AssetModel {
    name: string,
    id: string
}
export interface AssetsResponse {
    assets: AssetModel[],
    totalCount: number
}
