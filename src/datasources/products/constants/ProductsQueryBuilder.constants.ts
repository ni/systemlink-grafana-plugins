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
            QueryBuilderOperations.EQUALS.name,
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
        ],
        lookup: {
            dataSource: []
        }
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
        ],
        lookup: {
            dataSource: []
        }
    },
    PROPERTIES: {
        label: 'Properties',
        dataField: ProductsQueryBuilderFieldNames.PROPERTIES,
        dataType: 'object',
        filterOperations: [
            QueryBuilderOperations.EQUALS.name,
        ],
        lookup: {
            dataSource: []
        }
    },
    UPDATEDAT: {
        label: 'Updated At',
        dataField: ProductsQueryBuilderFieldNames.UPDATED_AT,
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
    ProductsQueryBuilderFields.PARTNUMBER,
    ProductsQueryBuilderFields.FAMILY,
    ProductsQueryBuilderFields.NAME,
    ProductsQueryBuilderFields.PROPERTIES,
];
