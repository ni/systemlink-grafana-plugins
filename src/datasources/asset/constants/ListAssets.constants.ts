import { QueryBuilderOperations } from "../../../core/query-builder.constants";
import { QBField } from "../types/CalibrationForecastQuery.types";
import { AssetTypeOptions, BusTypeOptions } from "../types/types";

export enum ListAssetsFieldNames {
    LOCATION = 'Location',
    WORKSPACE = 'Workspace',
    MODEL_NAME = 'ModelName',
    VENDOR_NAME = 'VendorName',
    BUS_TYPE = 'BusType',
    ASSET_TYPE = 'AssetType',
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
    },
    MODEL_NAME: {
        label: 'Model Name',
        dataField: ListAssetsFieldNames.MODEL_NAME,
        filterOperations: [
            QueryBuilderOperations.EQUALS.name,
            QueryBuilderOperations.DOES_NOT_EQUAL.name
        ],
    },
    VENDOR_NAME: {
        label: 'Vendor Name',
        dataField: ListAssetsFieldNames.VENDOR_NAME,
        filterOperations: [
            QueryBuilderOperations.EQUALS.name,
            QueryBuilderOperations.DOES_NOT_EQUAL.name
        ],
    },
    BUS_TYPE: {
        label: 'Bus Type',
        dataField: ListAssetsFieldNames.BUS_TYPE,
        filterOperations: [
            QueryBuilderOperations.EQUALS.name,
            QueryBuilderOperations.DOES_NOT_EQUAL.name
        ],
        lookup: {
            dataSource: BusTypeOptions,
        }
    },
    ASSET_TYPE: {
        label: 'Asset Type',
        dataField: ListAssetsFieldNames.ASSET_TYPE,
        filterOperations: [
            QueryBuilderOperations.EQUALS.name,
            QueryBuilderOperations.DOES_NOT_EQUAL.name
        ],
        lookup: {
            dataSource: AssetTypeOptions,
        },
    },
};

export const ListAssetsStaticFields = [
    ListAssetsFields.MODEL_NAME,
    ListAssetsFields.VENDOR_NAME,
    ListAssetsFields.ASSET_TYPE,
    ListAssetsFields.BUS_TYPE
];
