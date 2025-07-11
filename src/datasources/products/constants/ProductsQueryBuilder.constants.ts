import { QueryBuilderOperations } from "core/query-builder.constants";
import { QBField } from "datasources/products/types";

export enum ProductsQueryBuilderFieldNames {
    PART_NUMBER = "PartNumber",
    FAMILY = "Family",
    NAME = "Name",
    PROPERTIES = "Properties",
    UPDATED_AT = "UpdatedAt",
    WORKSPACE = "Workspace"
}

export const ProductsQueryBuilderFields: Record<string, QBField> = {
    PARTNUMBER: {
        label: 'Part Number',
        dataField: ProductsQueryBuilderFieldNames.PART_NUMBER,
        filterOperations: [
            QueryBuilderOperations.SOURCE_EQUALS.name,
            QueryBuilderOperations.DOES_NOT_EQUAL.name,
            QueryBuilderOperations.STARTS_WITH.name,
            QueryBuilderOperations.ENDS_WITH.name,
            QueryBuilderOperations.CONTAINS.name,
            QueryBuilderOperations.DOES_NOT_CONTAIN.name,
            QueryBuilderOperations.IS_BLANK.name,
            QueryBuilderOperations.IS_NOT_BLANK.name
        ],
        lookup: {
            dataSource: []
        }
    },
    FAMILY: {
        label: 'Family',
        dataField: ProductsQueryBuilderFieldNames.FAMILY,
        filterOperations: [
            QueryBuilderOperations.EQUALS.name,
            QueryBuilderOperations.DOES_NOT_EQUAL.name,
            QueryBuilderOperations.CONTAINS.name,
            QueryBuilderOperations.DOES_NOT_CONTAIN.name,
            QueryBuilderOperations.IS_BLANK.name,
            QueryBuilderOperations.IS_NOT_BLANK.name
        ]
    },
    NAME: {
        label: 'Name',
        dataField: ProductsQueryBuilderFieldNames.NAME,
        filterOperations: [
            QueryBuilderOperations.EQUALS.name,
            QueryBuilderOperations.DOES_NOT_EQUAL.name,
            QueryBuilderOperations.CONTAINS.name,
            QueryBuilderOperations.DOES_NOT_CONTAIN.name,
            QueryBuilderOperations.IS_BLANK.name,
            QueryBuilderOperations.IS_NOT_BLANK.name
        ]
    },
    PROPERTIES: {
        label: 'Properties',
        dataField: ProductsQueryBuilderFieldNames.PROPERTIES,
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
    },
    UPDATEDAT: {
        label: 'Updated At',
        dataField: ProductsQueryBuilderFieldNames.UPDATED_AT,
        filterOperations: [
            QueryBuilderOperations.DATE_TIME_IS_AFTER.name,
            QueryBuilderOperations.DATE_TIME_IS_BEFORE.name,
        ],
        lookup: {
            dataSource: []
        }
    },
    WORKSPACE: {
        label: 'Workspace',
        dataField: ProductsQueryBuilderFieldNames.WORKSPACE,
        filterOperations: [
            QueryBuilderOperations.EQUALS.name,
            QueryBuilderOperations.DOES_NOT_EQUAL.name,
        ],
        lookup: {
            dataSource: []
        }
    }
}

export const ProductsQueryBuilderStaticFields = [
    ProductsQueryBuilderFields.NAME,
    ProductsQueryBuilderFields.PROPERTIES,
];
