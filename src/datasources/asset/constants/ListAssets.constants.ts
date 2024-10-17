import { QueryBuilderOperations } from "../../../core/query-builder.constants";
import { QBField } from "../types/CalibrationForecastQuery.types";

export enum ListAssetsFieldNames {
    LOCATION = 'Location',
    WORKSPACE = 'Workspace'
}

export const ListAssetsFields: Record<string, QBField> = {
    LOCATION: {
        label: 'Location',
        dataField: ListAssetsFieldNames.LOCATION,
        filterOperations: [
            QueryBuilderOperations.EQUALS.name,
            QueryBuilderOperations.DOES_NOT_EQUAL.name
        ],
        lookup: {
            dataSource: []
        }
    },
    WORKSPACE: {
        label: 'Workspace',
        dataField: ListAssetsFieldNames.WORKSPACE,
        filterOperations: [
            QueryBuilderOperations.EQUALS.name,
            QueryBuilderOperations.DOES_NOT_EQUAL.name
        ],
        lookup: {
            dataSource: []
        }
    }
};

export const QUERY_LIMIT = 1000;
