export enum AllFieldNames {
    LOCATION = 'Location',
    WORKSPACE = 'Workspace',
    MODEL_NAME = 'ModelName',
    VENDOR_NAME = 'VendorName',
    BUS_TYPE = 'BusType',
    ASSET_TYPE = 'AssetType',
    PART_NUMBER = 'PartNumber',
    CALIBRATION_DUE_DATE = 'ExternalCalibration.NextRecommendedDate',
}

export const takeErrorMessages = {
    greaterOrEqualToZero: 'Enter a value greater than or equal to 0',
    lessOrEqualToTenThousand: 'Enter a value less than or equal to 10,000',
};

export const QUERY_LIMIT = 1000;
