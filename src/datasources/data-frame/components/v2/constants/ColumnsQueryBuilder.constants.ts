import { QueryBuilderOperations } from "core/query-builder.constants";
import { QBField } from "core/types";

export enum ColumnsQueryBuilderFieldNames {
    Name = 'name'
}

export const ColumnsQueryBuilderFields: Record<string, QBField> = {
    NAME: {
        label: 'Column name',
        dataField: ColumnsQueryBuilderFieldNames.Name,
        filterOperations: [
            QueryBuilderOperations.EQUALS.name,
            QueryBuilderOperations.DOES_NOT_EQUAL.name,
            QueryBuilderOperations.CONTAINS.name,
            QueryBuilderOperations.DOES_NOT_CONTAIN.name
        ]
    }
};

export const ColumnsQueryBuilderStaticFields = [
    ColumnsQueryBuilderFields.NAME
] as QBField[];
