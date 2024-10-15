import { QueryBuilderOperations } from "core/query-builder.constants";
import { AssetTypeOptions, BusTypeOptions, QBField } from "./types";

export const AssetCalibrationFields: Record<string, QBField> = {
    LOCATION: {
        label: 'Location',
        dataField: 'Location',
        filterOperations: [
            QueryBuilderOperations.EQUALS.name,
            QueryBuilderOperations.DOES_NOT_EQUAL.name
        ],
    },
    WORKSPACE: {
        label: 'Workspace',
        dataField: 'Workspace',
        dataType: 'string',
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
        dataField: 'ModelName',
        filterOperations: [
            QueryBuilderOperations.EQUALS.name,
            QueryBuilderOperations.DOES_NOT_EQUAL.name,
            QueryBuilderOperations.CONTAINS.name,
            QueryBuilderOperations.DOES_NOT_CONTAIN.name
        ],
    },
    VENDOR_NAME: {
        label: 'Vendor Name',
        dataField: 'VendorName',
        filterOperations: [
            QueryBuilderOperations.EQUALS.name,
            QueryBuilderOperations.DOES_NOT_EQUAL.name,
            QueryBuilderOperations.CONTAINS.name,
            QueryBuilderOperations.DOES_NOT_CONTAIN.name
        ],
    },
    BUS_TYPE: {
        label: 'Bus Type',
        dataField: 'BusType',
        filterOperations: [
            QueryBuilderOperations.EQUALS.name,
            QueryBuilderOperations.DOES_NOT_EQUAL.name
        ],
        lookup: {
            dataSource: BusTypeOptions,
            readonly: true,
        }
    },
    ASSET_TYPE: {
        label: 'Asset Type',
        dataField: 'AssetType',
        filterOperations: [
            QueryBuilderOperations.EQUALS.name,
            QueryBuilderOperations.DOES_NOT_EQUAL.name
        ],
        lookup: {
            dataSource: AssetTypeOptions,
            readonly: true,
        },
    },
};

export const AssetCalibrationStaticFields = [
    AssetCalibrationFields.LOCATION,
    AssetCalibrationFields.MODEL_NAME,
    AssetCalibrationFields.VENDOR_NAME,
    AssetCalibrationFields.ASSET_TYPE,
    AssetCalibrationFields.BUS_TYPE
];

export const AssetComputedDataFields = {
    'Location': '(Location.PhysicalLocation = "{value}" || Location.MinionId = "{value}")',
}

export const assetSummaryFields = {
    TOTAL: 'Total',
    ACTIVE: 'Active',
    NOT_ACTIVE: 'Not active',
    APPROACHING_DUE_DATE: 'Approaching due date',
    PAST_DUE_DATE: 'Past due date'
};
