import { QueryBuilderOperations } from "core/query-builder.constants";
import { QBField } from "core/types";


export enum TestPlansQueryBuilderFieldNames {
    AssignedTo = 'assignedTo',
    CreatedAt = 'created',
    CreatedBy = 'createdBy',
    Description = 'description',
    DUTIdentifier = 'DUTIdentifier',
    EstimatedDurationInDays = 'estimatedDurationInDays',
    EstimatedDurationInHours = 'estimatedDurationInHours',
    EstimatedEndDate = 'estimatedEndDate',
    FixtureIdentifier = 'fixtureIdentifier',
    Name = 'name',
    PlannedStartDate = 'plannedStartDate',
    Product = 'product',
    Properties = 'properties',
    State = 'state',
    SystemAliasName = 'systemAliasName',
    TestPlanID = 'testPlanID',
    TestProgram = 'testProgram',
    UpdatedAt = 'updatedAt',
    UpdatedBy = 'updatedBy',
    WorkOrderID = 'workOrderID',
    Workspace = 'workspace',
}

export const TestPlansQueryBuilderFields: Record<string, QBField> = {
    ASSIGNED_TO: {
        label: 'Assigned to',
        dataField: TestPlansQueryBuilderFieldNames.AssignedTo,
        filterOperations: [
            QueryBuilderOperations.EQUALS.name,
            QueryBuilderOperations.DOES_NOT_EQUAL.name,
            QueryBuilderOperations.IS_BLANK.name,
            QueryBuilderOperations.IS_NOT_BLANK.name
        ]
    },
    CREATED_AT: {
        label: 'Created',
        dataField: TestPlansQueryBuilderFieldNames.CreatedAt,
        filterOperations: [
            QueryBuilderOperations.DATE_TIME_IS_AFTER.name,
            QueryBuilderOperations.DATE_TIME_IS_BEFORE.name,
        ]
    },
    CREATED_BY: {
        label: 'Created by',
        dataField: TestPlansQueryBuilderFieldNames.CreatedBy,
        filterOperations: [
            QueryBuilderOperations.EQUALS.name,
            QueryBuilderOperations.DOES_NOT_EQUAL.name
        ]
    },
    DESCRIPTION: {
        label: 'Description',
        dataField: TestPlansQueryBuilderFieldNames.Description,
        filterOperations: [
            QueryBuilderOperations.CONTAINS.name,
            QueryBuilderOperations.DOES_NOT_CONTAIN.name
        ]
    },
    DUT_IDENTIFIER: {
        label: 'DUT identifier',
        dataField: TestPlansQueryBuilderFieldNames.DUTIdentifier,
        filterOperations: [
            QueryBuilderOperations.EQUALS.name,
            QueryBuilderOperations.DOES_NOT_EQUAL.name,
            QueryBuilderOperations.IS_BLANK.name,
            QueryBuilderOperations.IS_NOT_BLANK.name
        ]
    },
    ESTIMATED_DURATION_IN_DAYS: {
        label: 'Estimated duration (days)',
        dataField: TestPlansQueryBuilderFieldNames.EstimatedDurationInDays,
        filterOperations: [
            QueryBuilderOperations.EQUALS.name,
            QueryBuilderOperations.DOES_NOT_EQUAL.name,
            QueryBuilderOperations.GREATER_THAN.name,
            QueryBuilderOperations.GREATER_THAN_OR_EQUAL_TO.name,
            QueryBuilderOperations.LESS_THAN.name,
            QueryBuilderOperations.LESS_THAN_OR_EQUAL_TO.name
        ]
    },
    ESTIMATED_DURATION_IN_HOURS: {
        label: 'Estimated duration (hours)',
        dataField: TestPlansQueryBuilderFieldNames.EstimatedDurationInHours,
        filterOperations: [
            QueryBuilderOperations.EQUALS.name,
            QueryBuilderOperations.DOES_NOT_EQUAL.name,
            QueryBuilderOperations.GREATER_THAN.name,
            QueryBuilderOperations.GREATER_THAN_OR_EQUAL_TO.name,
            QueryBuilderOperations.LESS_THAN.name,
            QueryBuilderOperations.LESS_THAN_OR_EQUAL_TO.name
        ]
    },
    ESTIMATED_END_DATE: {
        label: 'Estimated end date',
        dataField: TestPlansQueryBuilderFieldNames.EstimatedEndDate,
        filterOperations: [
            QueryBuilderOperations.DATE_TIME_IS_AFTER.name,
            QueryBuilderOperations.DATE_TIME_IS_BEFORE.name,
            QueryBuilderOperations.IS_BLANK.name,
            QueryBuilderOperations.IS_NOT_BLANK.name
        ]
    },
    FIXTURE_IDENTIFIER: {
        label: 'Fixture identifier',
        dataField: TestPlansQueryBuilderFieldNames.FixtureIdentifier,
        filterOperations: [
            QueryBuilderOperations.LIST_EQUALS.name,
            QueryBuilderOperations.LIST_DOES_NOT_EQUAL.name,
            QueryBuilderOperations.LIST_IS_EMPTY.name,
            QueryBuilderOperations.LIST_IS_NOT_EMPTY.name
        ]
    },
    NAME: {
        label: 'Name',
        dataField: TestPlansQueryBuilderFieldNames.Name,
        filterOperations: [
            QueryBuilderOperations.EQUALS.name,
            QueryBuilderOperations.DOES_NOT_EQUAL.name,
            QueryBuilderOperations.CONTAINS.name,
            QueryBuilderOperations.DOES_NOT_CONTAIN.name
        ]
    },
    PLANNED_START_DATE: {
        label: 'Planned start date',
        dataField: TestPlansQueryBuilderFieldNames.PlannedStartDate,
        filterOperations: [
            QueryBuilderOperations.DATE_TIME_IS_AFTER.name,
            QueryBuilderOperations.DATE_TIME_IS_BEFORE.name,
            QueryBuilderOperations.IS_BLANK.name,
            QueryBuilderOperations.IS_NOT_BLANK.name
        ]
    },
    PRODUCT: {
        label: 'Product name (Part number)',
        dataField: TestPlansQueryBuilderFieldNames.Product,
        filterOperations: [
            QueryBuilderOperations.EQUALS.name,
            QueryBuilderOperations.DOES_NOT_EQUAL.name
        ]
    },
    PROPERTIES: {
        label: 'Properties',
        dataField: TestPlansQueryBuilderFieldNames.Properties,
        dataType: 'object',
        filterOperations: [
            QueryBuilderOperations.KEY_VALUE_MATCH.name,
            QueryBuilderOperations.KEY_VALUE_DOES_NOT_MATCH.name,
            QueryBuilderOperations.KEY_VALUE_CONTAINS.name,
            QueryBuilderOperations.KEY_VALUE_DOES_NOT_CONTAINS.name
        ]
    },
    STATE: {
        label: 'State',
        dataField: TestPlansQueryBuilderFieldNames.State,
        filterOperations: [
            QueryBuilderOperations.EQUALS.name,
            QueryBuilderOperations.DOES_NOT_EQUAL.name
        ]
    },
    SYSTEM_ALIAS_NAME: {
        label: 'System alias name',
        dataField: TestPlansQueryBuilderFieldNames.SystemAliasName,
        filterOperations: [
            QueryBuilderOperations.EQUALS.name,
            QueryBuilderOperations.DOES_NOT_EQUAL.name,
            QueryBuilderOperations.IS_BLANK.name,
            QueryBuilderOperations.IS_NOT_BLANK.name
        ]
    },
    TEST_PLAN_ID: {
        label: 'Test plan ID',
        dataField: TestPlansQueryBuilderFieldNames.TestPlanID,
        filterOperations: [
            QueryBuilderOperations.EQUALS.name,
            QueryBuilderOperations.DOES_NOT_EQUAL.name
        ]
    },
    TEST_PROGRAM: {
        label: 'Test program',
        dataField: TestPlansQueryBuilderFieldNames.TestProgram,
        filterOperations: [
            QueryBuilderOperations.EQUALS.name,
            QueryBuilderOperations.DOES_NOT_EQUAL.name,
            QueryBuilderOperations.CONTAINS.name,
            QueryBuilderOperations.DOES_NOT_CONTAIN.name,
            QueryBuilderOperations.IS_BLANK.name,
            QueryBuilderOperations.IS_NOT_BLANK.name
        ]
    },
    UPDATED_AT: {
        label: 'Updated at',
        dataField: TestPlansQueryBuilderFieldNames.UpdatedAt,
        filterOperations: [
            QueryBuilderOperations.DATE_TIME_IS_AFTER.name,
            QueryBuilderOperations.DATE_TIME_IS_BEFORE.name
        ]
    },
    UPDATED_BY: {
        label: 'Updated by',
        dataField: TestPlansQueryBuilderFieldNames.UpdatedBy,
        filterOperations: [
            QueryBuilderOperations.EQUALS.name,
            QueryBuilderOperations.DOES_NOT_EQUAL.name
        ]
    },
    WORK_ORDER_ID: {
        label: 'Work order ID',
        dataField: TestPlansQueryBuilderFieldNames.WorkOrderID,
        filterOperations: [
            QueryBuilderOperations.EQUALS.name,
            QueryBuilderOperations.DOES_NOT_EQUAL.name,
            QueryBuilderOperations.IS_BLANK.name,
            QueryBuilderOperations.IS_NOT_BLANK.name
        ]
    },
    WORKSPACE: {
        label: 'Workspace',
        dataField: TestPlansQueryBuilderFieldNames.Workspace,
        filterOperations: [
            QueryBuilderOperations.EQUALS.name,
            QueryBuilderOperations.DOES_NOT_EQUAL.name
        ]
    }
}

export const TestPlansQueryBuilderStaticFields = [
    TestPlansQueryBuilderFields.ASSIGNED_TO,
    TestPlansQueryBuilderFields.CREATED_BY,
    TestPlansQueryBuilderFields.DESCRIPTION,
    TestPlansQueryBuilderFields.DUT_IDENTIFIER,
    TestPlansQueryBuilderFields.ESTIMATED_DURATION_IN_DAYS,
    TestPlansQueryBuilderFields.ESTIMATED_DURATION_IN_HOURS,
    TestPlansQueryBuilderFields.FIXTURE_IDENTIFIER,
    TestPlansQueryBuilderFields.NAME,
    TestPlansQueryBuilderFields.PRODUCT,
    TestPlansQueryBuilderFields.PROPERTIES,
    TestPlansQueryBuilderFields.STATE,
    TestPlansQueryBuilderFields.SYSTEM_ALIAS_NAME,
    TestPlansQueryBuilderFields.TEST_PLAN_ID,
    TestPlansQueryBuilderFields.TEST_PROGRAM,
    TestPlansQueryBuilderFields.UPDATED_BY,
    TestPlansQueryBuilderFields.WORK_ORDER_ID,
    TestPlansQueryBuilderFields.WORKSPACE
];
