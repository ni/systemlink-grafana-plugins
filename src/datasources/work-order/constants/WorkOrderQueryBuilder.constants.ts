import { QueryBuilderOperations } from "core/query-builder.constants";
import { QBField } from "datasources/products/types";

export enum WorkOrderQueryBuilderFieldNames {
    ID = "Id",
    NAME = "Name",
    TYPE = "Type",
    STATE = "State",
    DESCRIPTION = "Description",
    ASSIGNED_TO = "AssignedTo",
    WORKSPACE = "Workspace",
    REQUESTED_BY = "RequestedBy",
    CREATED_BY = "CreatedBy",
    UPDATED_BY = "UpdatedBy",
    CREATED_AT = "CreatedAt",
    UPDATED_AT = "UpdatedAt",
    EARLIEST_START_DATE = "EarliestStartDate",
    DUE_DATE = "DueDate",
    PROPERTIES = "Properties"
}

export const WorkOrderQueryBuilderFields: Record<string, QBField> = {
    ID: {
        label: 'Work order ID',
        dataField: WorkOrderQueryBuilderFieldNames.ID,
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
        dataField: WorkOrderQueryBuilderFieldNames.NAME,
        filterOperations: [
            QueryBuilderOperations.EQUALS.name,
            QueryBuilderOperations.DOES_NOT_EQUAL.name,
            QueryBuilderOperations.CONTAINS.name,
            QueryBuilderOperations.DOES_NOT_CONTAIN.name
        ]
    },
    TYPE: {
        label: 'Type',
        dataField: WorkOrderQueryBuilderFieldNames.TYPE,
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
        dataField: WorkOrderQueryBuilderFieldNames.STATE,
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
        dataField: WorkOrderQueryBuilderFieldNames.DESCRIPTION,
        filterOperations: [
            QueryBuilderOperations.CONTAINS.name,
            QueryBuilderOperations.DOES_NOT_CONTAIN.name
        ]
    },
    ASSIGNEDTO: {
        label: 'Assigned To',
        dataField: WorkOrderQueryBuilderFieldNames.ASSIGNED_TO,
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
        dataField: WorkOrderQueryBuilderFieldNames.WORKSPACE,
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
        dataField: WorkOrderQueryBuilderFieldNames.REQUESTED_BY,
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
        dataField: WorkOrderQueryBuilderFieldNames.CREATED_BY,
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
        dataField: WorkOrderQueryBuilderFieldNames.UPDATED_BY,
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
        dataField: WorkOrderQueryBuilderFieldNames.CREATED_AT,
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
        dataField: WorkOrderQueryBuilderFieldNames.UPDATED_AT,
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
        dataField: WorkOrderQueryBuilderFieldNames.EARLIEST_START_DATE,
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
        dataField: WorkOrderQueryBuilderFieldNames.DUE_DATE,
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
        dataField: WorkOrderQueryBuilderFieldNames.PROPERTIES,
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

export const WorkOrderQueryBuilderStaticFields = [
    WorkOrderQueryBuilderFields.NAME,
    WorkOrderQueryBuilderFields.PROPERTIES,
    WorkOrderQueryBuilderFields.DESCRIPTION,
    WorkOrderQueryBuilderFields.ID,
    WorkOrderQueryBuilderFields.STATE
];
