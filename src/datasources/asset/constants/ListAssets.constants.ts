import { QueryBuilderOperations } from "../../../core/query-builder.constants";
import { QBField } from "../types/CalibrationForecastQuery.types";
import { AssetTypeOptions, BusTypeOptions } from "../types/types";

export enum ListAssetsFieldNames {
    LOCATION = 'Location',
    WORKSPACE = 'Workspace',
    MODEL_NAME = 'ModelName',
    PART_NUMBER = 'PartNumber',
    VENDOR_NAME = 'VendorName',
    BUS_TYPE = 'BusType',
    ASSET_TYPE = 'AssetType',
    CALIBRATION_DUE_DATE = 'ExternalCalibration.NextRecommendedDate'
}

export const ListAssetsFields: Record<string, QBField> = {
    LOCATION: {
        label: 'Location',
        dataField: ListAssetsFieldNames.LOCATION,
        filterOperations: [
            QueryBuilderOperations.EQUALS.name,
            QueryBuilderOperations.DOES_NOT_EQUAL.name,
            QueryBuilderOperations.IS_BLANK.name,
            QueryBuilderOperations.IS_NOT_BLANK.name
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
    PART_NUMBER: {
        label: 'Part Number',
        dataField: ListAssetsFieldNames.PART_NUMBER,
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
    CALIBRATION_DUE_DATE: {
        label: 'Calibration Due Date',
        dataField: ListAssetsFieldNames.CALIBRATION_DUE_DATE,
        filterOperations: [
            QueryBuilderOperations.LESS_THAN.name,
            QueryBuilderOperations.LESS_THAN_OR_EQUAL_TO.name,
            QueryBuilderOperations.GREATER_THAN.name,
            QueryBuilderOperations.GREATER_THAN_OR_EQUAL_TO.name
        ],
        lookup: {
            dataSource: []
        }
    }
};

export const ListAssetsStaticFields = [
    ListAssetsFields.MODEL_NAME,
    ListAssetsFields.VENDOR_NAME,
    ListAssetsFields.ASSET_TYPE,
    ListAssetsFields.BUS_TYPE,
    ListAssetsFields.PART_NUMBER
];

export const tooltips = {
    queryReturnType: 'This field specifies the return type of the query.',
    filter: `Filter the assets by various properties. This is an optional field.`,
    take: 'This field specifies the maximum number of assets to return.'
}

export const TAKE_LIMIT = 10000;
