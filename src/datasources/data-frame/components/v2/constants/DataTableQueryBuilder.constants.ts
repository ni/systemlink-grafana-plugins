import { QueryBuilderOperations } from "core/query-builder.constants";
import { QBField } from "core/types";
import { QBFieldWithDataSourceCallback } from "datasources/data-frame/types";

export enum DataTableQueryBuilderFieldNames {
    CreatedAt = 'createdAt',
    Id = 'id',
    MetadataModifiedAt = 'metadataModifiedAt',
    Name = 'name',
    Properties = 'properties',
    RowCount = 'rowCount',
    RowsModifiedAt = 'rowsModifiedAt',
    SupportsAppend = 'supportsAppend',
    Workspace = 'workspace'
}

export const DataTableQueryBuilderFields: Record<string, QBField | QBFieldWithDataSourceCallback> = {
    CREATED_AT: {
        label: 'Created',
        dataField: DataTableQueryBuilderFieldNames.CreatedAt,
        filterOperations: [
            QueryBuilderOperations.DATE_TIME_IS_AFTER.name,
            QueryBuilderOperations.DATE_TIME_IS_BEFORE.name,
        ]
    },
    ID: {
        label: 'Data table ID',
        dataField: DataTableQueryBuilderFieldNames.Id,
        filterOperations: [
            QueryBuilderOperations.EQUALS.name,
            QueryBuilderOperations.DOES_NOT_EQUAL.name
        ]
    },
    METADATA_MODIFIED_AT: {
        label: 'Metadata modified',
        dataField: DataTableQueryBuilderFieldNames.MetadataModifiedAt,
        filterOperations: [
            QueryBuilderOperations.DATE_TIME_IS_AFTER.name,
            QueryBuilderOperations.DATE_TIME_IS_BEFORE.name
        ]
    },
    NAME: {
        label: 'Data table name',
        dataField: DataTableQueryBuilderFieldNames.Name,
        filterOperations: [
            QueryBuilderOperations.EQUALS.name,
            QueryBuilderOperations.DOES_NOT_EQUAL.name,
            QueryBuilderOperations.CONTAINS.name,
            QueryBuilderOperations.DOES_NOT_CONTAIN.name
        ]
    },
    PROPERTIES: {
        label: 'Properties',
        dataField: DataTableQueryBuilderFieldNames.Properties,
        dataType: 'object',
        filterOperations: [
            QueryBuilderOperations.KEY_VALUE_MATCH.name,
            QueryBuilderOperations.KEY_VALUE_DOES_NOT_MATCH.name,
            QueryBuilderOperations.KEY_VALUE_CONTAINS.name,
            QueryBuilderOperations.KEY_VALUE_DOES_NOT_CONTAINS.name
        ]
    },
    ROW_COUNT: {
        label: 'Rows',
        dataField: DataTableQueryBuilderFieldNames.RowCount,
        dataType: 'number',
        filterOperations: [
            QueryBuilderOperations.LESS_THAN.name,
            QueryBuilderOperations.LESS_THAN_OR_EQUAL_TO.name,
            QueryBuilderOperations.GREATER_THAN.name,
            QueryBuilderOperations.GREATER_THAN_OR_EQUAL_TO.name,
            QueryBuilderOperations.EQUALS.name,
            QueryBuilderOperations.DOES_NOT_EQUAL.name
        ]
    },
    ROWS_MODIFIED_AT: {
        label: 'Rows modified',
        dataField: DataTableQueryBuilderFieldNames.RowsModifiedAt,
        filterOperations: [
            QueryBuilderOperations.DATE_TIME_IS_AFTER.name,
            QueryBuilderOperations.DATE_TIME_IS_BEFORE.name
        ]
    },
    SUPPORTS_APPEND: {
        label: 'Supports append',
        dataField: DataTableQueryBuilderFieldNames.SupportsAppend,
        dataType: 'boolean',
        filterOperations: [
            QueryBuilderOperations.EQUALS.name,
            QueryBuilderOperations.DOES_NOT_EQUAL.name
        ]
    },
    WORKSPACE: {
        label: 'Workspace',
        dataField: DataTableQueryBuilderFieldNames.Workspace,
        filterOperations: [
            QueryBuilderOperations.EQUALS.name,
            QueryBuilderOperations.DOES_NOT_EQUAL.name
        ],
        lookup: {
            dataSource: []
        }
    }
};

export const DataTableQueryBuilderStaticFields = [
    DataTableQueryBuilderFields.ID,
    DataTableQueryBuilderFields.PROPERTIES,
    DataTableQueryBuilderFields.ROW_COUNT,
    DataTableQueryBuilderFields.SUPPORTS_APPEND
] as QBField[];
