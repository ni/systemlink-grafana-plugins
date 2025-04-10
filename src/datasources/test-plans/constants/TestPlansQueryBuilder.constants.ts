import { QueryBuilderOperations } from "core/query-builder.constants";
import { QBField } from "datasources/products/types";

export enum TestPlansQueryBuilderFieldNames {
    NAME = "name",
    STATE = "state",
    WORKSPACE = "workspace"
}

export const TestPlansQueryBuilderFields: Record<string, QBField> = {
    NAME: {
        label: 'Name',
        dataField: TestPlansQueryBuilderFieldNames.NAME,
        filterOperations: [
            QueryBuilderOperations.EQUALS.name,
            QueryBuilderOperations.DOES_NOT_EQUAL.name,
            QueryBuilderOperations.CONTAINS.name,
            QueryBuilderOperations.DOES_NOT_CONTAIN.name,
            QueryBuilderOperations.IS_BLANK.name,
            QueryBuilderOperations.IS_NOT_BLANK.name
        ]
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
                { label: 'New', value: 'NEW' },
                { label: 'Defined', value: 'DEFINED' },
                { label: 'Reviewed', value: 'REVIEWED' },
                { label: 'Scheduled', value: 'SCHEDULED' },
                { label: 'In Progress', value: 'IN_PROGRESS' },
                { label: 'Pending Approval', value: 'PENDING_APPROVAL' },
                { label: 'Closed', value: 'CLOSED' },
                { label: 'Canceled', value: 'CANCELED' },

            ]
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
    }
};

export const TestPlansQueryBuilderStaticFields = [
    TestPlansQueryBuilderFields.NAME,
    TestPlansQueryBuilderFields.STATE,
    TestPlansQueryBuilderFields.WORKSPACE,
];
