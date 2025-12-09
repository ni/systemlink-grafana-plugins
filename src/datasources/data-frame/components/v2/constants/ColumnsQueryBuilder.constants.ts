import { QueryBuilderOperations } from "core/query-builder.constants";
import { QBField } from "core/types";

export enum ColumnsQueryBuilderFieldNames {
    ColumnName = 'name'
}

export const ColumnsQueryBuilderFields: Record<string, QBField> = {
    COLUMN_NAME: {
        label: 'Column name',
        dataField: ColumnsQueryBuilderFieldNames.ColumnName,
        filterOperations: [
            QueryBuilderOperations.EQUALS.name,
            QueryBuilderOperations.DOES_NOT_EQUAL.name,
            QueryBuilderOperations.CONTAINS.name,
            QueryBuilderOperations.DOES_NOT_CONTAIN.name
        ]
    }
};

export const ColumnsQueryBuilderStaticFields = [
    ColumnsQueryBuilderFields.COLUMN_NAME
] as QBField[];
