import { QueryBuilderOperations } from "../../../core/query-builder.constants";
import { AssetTypeOptions, BusTypeOptions, QBField } from "../types/CalibrationForecastQuery.types";

export enum AssetCalibrationFieldNames {
    LOCATION = 'Location',
    WORKSPACE = 'Workspace',
    MODEL_NAME = 'ModelName',
    VENDOR_NAME = 'VendorName',
    BUS_TYPE = 'BusType',
    ASSET_TYPE = 'AssetType',
}

export const AssetCalibrationFields: Record<string, QBField> = {
    LOCATION: {
        label: 'Location',
        dataField: AssetCalibrationFieldNames.LOCATION,
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
        dataField: AssetCalibrationFieldNames.WORKSPACE,
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
        dataField: AssetCalibrationFieldNames.MODEL_NAME,
        filterOperations: [
            QueryBuilderOperations.EQUALS.name,
            QueryBuilderOperations.DOES_NOT_EQUAL.name
        ],
    },
    VENDOR_NAME: {
        label: 'Vendor Name',
        dataField: AssetCalibrationFieldNames.VENDOR_NAME,
        filterOperations: [
            QueryBuilderOperations.EQUALS.name,
            QueryBuilderOperations.DOES_NOT_EQUAL.name
        ],
    },
    BUS_TYPE: {
        label: 'Bus Type',
        dataField: AssetCalibrationFieldNames.BUS_TYPE,
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
        dataField: AssetCalibrationFieldNames.ASSET_TYPE,
        filterOperations: [
            QueryBuilderOperations.EQUALS.name,
            QueryBuilderOperations.DOES_NOT_EQUAL.name
        ],
        lookup: {
            dataSource: AssetTypeOptions,
        },
    },
};

export const AssetCalibrationStaticFields = [
    AssetCalibrationFields.MODEL_NAME,
    AssetCalibrationFields.VENDOR_NAME,
    AssetCalibrationFields.ASSET_TYPE,
    AssetCalibrationFields.BUS_TYPE
];
