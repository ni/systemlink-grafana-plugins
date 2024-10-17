import { QueryBuilderOperations } from "../../../core/query-builder.constants";
import { QBField } from "../types/CalibrationForecastQuery.types";
import { AssetFilterProperties } from "../types/ListAssets.types";

export enum ListAssetsFieldNames {
    LOCATION = 'Location',
    WORKSPACE = 'Workspace'
}

export const ListAssetsFields: Record<string, QBField> = {
    LOCATION: {
        label: 'Location',
        dataField: AssetFilterProperties.LocationMinionId,
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
        dataField: AssetFilterProperties.Workspace,
        filterOperations: [
            QueryBuilderOperations.EQUALS.name,
            QueryBuilderOperations.DOES_NOT_EQUAL.name
        ],
        lookup: {
            dataSource: []
        }
    }
};
