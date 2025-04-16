import { QueryBuilderOperations } from "core/query-builder.constants";
import { QBField } from "datasources/products/types";

export enum TestPlansQueryBuilderFieldNames {
    ID = "id",
    NAME = "name",
    TYPE = "type",
    STATE = "state",
    DESCRIPTION = "description",
    ASSIGNED_TO = "assignedTo",
    WORKSPACE = "workspace",
    REQUESTED_BY = "requestedBy",
    CREATED_BY = "createdBy",
    UPDATED_BY = "updatedBy",
    CREATED_AT = "createdAt",
    UPDATED_AT = "updatedAt",
    EARLIEST_START_DATE = "earliestStartDate",
    DUE_DATE = "dueDate",
    PROPERTIES = "properties"
}

export const TestPlansQueryBuilderFields: Record<string, QBField> = {
    ID: {
        label: 'Work order ID',
        dataField: TestPlansQueryBuilderFieldNames.ID,
        filterOperations: [
            QueryBuilderOperations.EQUALS.name,
            QueryBuilderOperations.DOES_NOT_EQUAL.name
        ],
        lookup: {
            dataSource: []
        }
    },
    NAME: {
        label: 'Name',
        dataField: TestPlansQueryBuilderFieldNames.NAME,
        filterOperations: [
            QueryBuilderOperations.EQUALS.name,
            QueryBuilderOperations.DOES_NOT_EQUAL.name,
            QueryBuilderOperations.CONTAINS.name,
            QueryBuilderOperations.DOES_NOT_CONTAIN.name
        ],
        lookup: {
            dataSource: []
        }
    },
    TYPE: {
        label: 'Type',
        dataField: TestPlansQueryBuilderFieldNames.TYPE,
        filterOperations: [
            QueryBuilderOperations.EQUALS.name,
            QueryBuilderOperations.DOES_NOT_EQUAL.name
        ],
        lookup: {
            dataSource: [
                {
                    label: 'Test Request',
                    value: 'TestRequest'
                }
            ]
        }
    },
    STATE: {
        label: 'State',
        dataField: TestPlansQueryBuilderFieldNames.STATE,
        filterOperations: [
            QueryBuilderOperations.EQUALS.name,
            QueryBuilderOperations.DOES_NOT_EQUAL.name
        ],
        lookup: {
            dataSource: [
                {
                    label: 'New',
                    value: 'New'
                },
                {
                    label: 'Defined',
                    value: 'Defined'
                },
                {
                    label: 'Reviewed',
                    value: 'Reviewed'
                },
                {
                    label: 'Scheduled',
                    value: 'Scheduled'
                },
                {
                    label: 'In Progress',
                    value: 'InProgress'
                },
                {
                    label: 'Pending Approval',
                    value: 'PendingApproval'
                },
                {
                    label: 'Closed',
                    value: 'Closed'
                },
                {
                    label: 'Canceled',
                    value: 'Canceled'
                }
            ]
        }
    },
    DESCRIPTION: {
        label: 'Description',
        dataField: TestPlansQueryBuilderFieldNames.DESCRIPTION,
        filterOperations: [
            QueryBuilderOperations.CONTAINS.name,
            QueryBuilderOperations.DOES_NOT_CONTAIN.name
        ],
        lookup: {
            dataSource: []
        }
    },
    ASSIGNEDTO: {
        label: 'Assigned To',
        dataField: TestPlansQueryBuilderFieldNames.ASSIGNED_TO,
        filterOperations: [
            QueryBuilderOperations.EQUALS.name,
            QueryBuilderOperations.DOES_NOT_EQUAL.name,
            QueryBuilderOperations.IS_BLANK.name,
            QueryBuilderOperations.IS_NOT_BLANK.name
        ],
        lookup: {
            dataSource: []
        }
    },
    WORKSPACE: {
        label: 'Workspace',
        dataField: TestPlansQueryBuilderFieldNames.WORKSPACE,
        filterOperations: [
            QueryBuilderOperations.EQUALS.name,
            QueryBuilderOperations.DOES_NOT_EQUAL.name,
        ],
        lookup: {
            dataSource: []
        }
    },
    REQUESTEDBY: {
        label: 'Requested By',
        dataField: TestPlansQueryBuilderFieldNames.REQUESTED_BY,
        filterOperations: [
            QueryBuilderOperations.EQUALS.name,
            QueryBuilderOperations.DOES_NOT_EQUAL.name,
            QueryBuilderOperations.IS_BLANK.name,
            QueryBuilderOperations.IS_NOT_BLANK.name
        ],
        lookup: {
            dataSource: []
        }
    },
    CREATEDBY: {
        label: 'Created By',
        dataField: TestPlansQueryBuilderFieldNames.CREATED_BY,
        filterOperations: [
            QueryBuilderOperations.EQUALS.name,
            QueryBuilderOperations.DOES_NOT_EQUAL.name
        ],
        lookup: {
            dataSource: []
        }
    },
    UPDATEDBY: {
        label: 'Updated By',
        dataField: TestPlansQueryBuilderFieldNames.UPDATED_BY,
        filterOperations: [
            QueryBuilderOperations.EQUALS.name,
            QueryBuilderOperations.DOES_NOT_EQUAL.name
        ],
        lookup: {
            dataSource: []
        }
    },
    CREATEDAT: {
        label: 'Created At',
        dataField: TestPlansQueryBuilderFieldNames.CREATED_AT,
        filterOperations: [
            QueryBuilderOperations.EQUALS.name,
            QueryBuilderOperations.DOES_NOT_EQUAL.name
        ],
        lookup: {
            dataSource: []
        }
    },
    UPDATEDAT: {
        label: 'Updated At',
        dataField: TestPlansQueryBuilderFieldNames.UPDATED_AT,
        filterOperations: [
            QueryBuilderOperations.EQUALS.name,
            QueryBuilderOperations.DOES_NOT_EQUAL.name,
            QueryBuilderOperations.GREATER_THAN.name,
            QueryBuilderOperations.GREATER_THAN_OR_EQUAL_TO.name,
            QueryBuilderOperations.LESS_THAN.name,
            QueryBuilderOperations.LESS_THAN_OR_EQUAL_TO.name
        ],
        lookup: {
            dataSource: []
        }
    },
    EARLIESTSTARTDATE: {
        label: 'Earliest Start Date',
        dataField: TestPlansQueryBuilderFieldNames.EARLIEST_START_DATE,
        filterOperations: [
            QueryBuilderOperations.EQUALS.name,
            QueryBuilderOperations.DOES_NOT_EQUAL.name,
            QueryBuilderOperations.GREATER_THAN.name,
            QueryBuilderOperations.GREATER_THAN_OR_EQUAL_TO.name,
            QueryBuilderOperations.LESS_THAN.name,
            QueryBuilderOperations.LESS_THAN_OR_EQUAL_TO.name
        ],
        lookup: {
            dataSource: []
        }
    },
    DUEDATE: {
        label: 'Due Date',
        dataField: TestPlansQueryBuilderFieldNames.DUE_DATE,
        filterOperations: [
            QueryBuilderOperations.EQUALS.name,
            QueryBuilderOperations.DOES_NOT_EQUAL.name,
            QueryBuilderOperations.GREATER_THAN.name,
            QueryBuilderOperations.GREATER_THAN_OR_EQUAL_TO.name,
            QueryBuilderOperations.LESS_THAN.name,
            QueryBuilderOperations.LESS_THAN_OR_EQUAL_TO.name
        ],
        lookup: {
            dataSource: []
        }
    },
    PROPERTIES: {
        label: 'Properties',
        dataField: TestPlansQueryBuilderFieldNames.PROPERTIES,
        dataType: 'object',
        filterOperations: [
            QueryBuilderOperations.KEY_VALUE_MATCH.name,
            QueryBuilderOperations.KEY_VALUE_DOES_NOT_MATCH.name,
            QueryBuilderOperations.KEY_VALUE_CONTAINS.name,
            QueryBuilderOperations.KEY_VALUE_DOES_NOT_CONTAINS.name,
            QueryBuilderOperations.KEY_VALUE_IS_GREATER_THAN.name,
            QueryBuilderOperations.KEY_VALUE_IS_GREATER_THAN_OR_EQUAL.name,
            QueryBuilderOperations.KEY_VALUE_IS_LESS_THAN.name,
            QueryBuilderOperations.KEY_VALUE_IS_LESS_THAN_OR_EQUAL.name,
            QueryBuilderOperations.KEY_VALUE_IS_NUMERICAL_EQUAL.name,
            QueryBuilderOperations.KEY_VALUE_IS_NUMERICAL_NOT_EQUAL.name
        ]
    }
}

export const TestPlansQueryBuilderStaticFields = [
    TestPlansQueryBuilderFields.ID,
    TestPlansQueryBuilderFields.NAME,
    TestPlansQueryBuilderFields.TYPE,
    TestPlansQueryBuilderFields.STATE,
    TestPlansQueryBuilderFields.DESCRIPTION,
    TestPlansQueryBuilderFields.ASSIGNEDTO,
    TestPlansQueryBuilderFields.WORKSPACE,
    TestPlansQueryBuilderFields.REQUESTEDBY,
    TestPlansQueryBuilderFields.CREATEDBY,
    TestPlansQueryBuilderFields.UPDATEDBY,
    TestPlansQueryBuilderFields.CREATEDAT,
    TestPlansQueryBuilderFields.UPDATEDAT,
    TestPlansQueryBuilderFields.EARLIESTSTARTDATE,
    TestPlansQueryBuilderFields.DUEDATE,
    TestPlansQueryBuilderFields.PROPERTIES
];
