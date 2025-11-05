import { QueryBuilderOperations } from "core/query-builder.constants";
import { QBField } from "core/types";

export enum ColumnsQueryBuilderFieldNames {
    Name = 'columns.Name',
    Type = 'columns.Type'
}

export const ColumnsQueryBuilderFields: Record<string, QBField> = {
    NAME: {
        label: 'Column name',
        dataField: ColumnsQueryBuilderFieldNames.Name,
        filterOperations: [
            QueryBuilderOperations.COLLECTION_PROPERTY_EQUALS.name,
            QueryBuilderOperations.COLLECTION_PROPERTY_DOES_NOT_EQUAL.name,
            QueryBuilderOperations.COLLECTION_PROPERTY_CONTAINS.name,
            QueryBuilderOperations.COLLECTION_PROPERTY_DOES_NOT_CONTAIN.name
        ]
    },
    TYPE: {
        label: 'Column type',
        dataField: ColumnsQueryBuilderFieldNames.Type,
        filterOperations: [
            QueryBuilderOperations.COLLECTION_PROPERTY_EQUALS.name,
            QueryBuilderOperations.COLLECTION_PROPERTY_DOES_NOT_EQUAL.name,
            QueryBuilderOperations.COLLECTION_PROPERTY_CONTAINS.name,
            QueryBuilderOperations.COLLECTION_PROPERTY_DOES_NOT_CONTAIN.name
        ]
    }
};

export const ColumnsQueryBuilderStaticFields = [
    ColumnsQueryBuilderFields.NAME,
    ColumnsQueryBuilderFields.TYPE
] as QBField[];
