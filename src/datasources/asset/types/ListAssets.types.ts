import { AssetModel } from 'datasources/asset-common/types';
import { AssetQuery } from './types';

export interface ListAssetsQuery extends AssetQuery {
    filter: string;
    outputType?: OutputType;
    take?: number;
    properties?: AssetFilterPropertiesOption[];
}

export interface QueryListAssetRequestBody {
    filter?: string;
    returnCount?: boolean;
    take?: number;
    projection?: string;
}

export enum AssetFilterPropertiesOption {
    AssetIdentifier = 'AssetIdentifier',
    SerialNumber = 'SerialNumber',
    ModelName = 'ModelName',
    ModelNumber = 'ModelNumber',
    VendorName = 'VendorName',
    VendorNumber = 'VendorNumber',
    AssetName = 'AssetName',
    AssetType = 'AssetType',
    FirmwareVersion = 'FirmwareVersion',
    VisaResourceName = 'VisaResourceName',
    PartNumber = 'PartNumber',
    LastUpdatedTimestamp = 'LastUpdatedTimestamp',
    BusType = 'BusType',
    IsNIAsset = 'IsNIAsset',
    Keywords = 'Keywords',
    Properties = 'Properties',
    Location = 'Location',
    MinionId = 'Location.MinionId',
    ParentName = 'ParentName',
    SupportsSelfCalibration = 'SupportsSelfCalibration',
    DiscoveryType = 'DiscoveryType',
    SupportsSelfTest = 'SupportsSelfTest',
    SupportsReset = 'SupportsReset',
    SelfCalibration = 'SelfCalibration.CalibrationDate',
    SupportsExternalCalibration = 'SupportsExternalCalibration',
    ExternalCalibrationDate = 'ExternalCalibration.ResolvedDuedate',
    IsSystemController = 'IsSystemController',
    Workspace = 'Workspace',
    CalibrationStatus = 'CalibrationStatus',
}

export enum EntityType {
    Asset = "Asset",
    System = "System"
}

export enum OutputType {
    Properties = 'Properties',
    TotalCount = 'Total Count',
}

export const AssetFilterProperties: Record<AssetFilterPropertiesOption, {
    label: string;
    value: AssetFilterPropertiesOption;
    field: keyof AssetModel;
}> = {
    [AssetFilterPropertiesOption.AssetIdentifier]: {
        label: 'id',
        value: AssetFilterPropertiesOption.AssetIdentifier,
        field: 'id',
    },
    [AssetFilterPropertiesOption.SerialNumber]: {
        label: 'serial number',
        value: AssetFilterPropertiesOption.SerialNumber,
        field: 'serialNumber',
    },
    [AssetFilterPropertiesOption.ModelName]: {
        label: 'model name',
        value: AssetFilterPropertiesOption.ModelName,
        field: 'modelName',
    },
    [AssetFilterPropertiesOption.ModelNumber]: {
        label: 'model number',
        value: AssetFilterPropertiesOption.ModelNumber,
        field: 'modelNumber',
    },
    [AssetFilterPropertiesOption.VendorName]: {
        label: 'vendor name',
        value: AssetFilterPropertiesOption.VendorName,
        field: 'vendorName',
    },
    [AssetFilterPropertiesOption.VendorNumber]: {
        label: 'vendor number',
        value: AssetFilterPropertiesOption.VendorNumber,
        field: 'vendorNumber',
    },
    [AssetFilterPropertiesOption.AssetName]: {
        label: 'name',
        value: AssetFilterPropertiesOption.AssetName,
        field: 'name',
    },
    [AssetFilterPropertiesOption.AssetType]: {
        label: 'asset type',
        value: AssetFilterPropertiesOption.AssetType,
        field: 'assetType',
    },
    [AssetFilterPropertiesOption.FirmwareVersion]: {
        label: 'firmware version',
        value: AssetFilterPropertiesOption.FirmwareVersion,
        field: 'firmwareVersion',
    },
    [AssetFilterPropertiesOption.VisaResourceName]: {
        label: 'visa resource name',
        value: AssetFilterPropertiesOption.VisaResourceName,
        field: 'visaResourceName',
    },
    [AssetFilterPropertiesOption.PartNumber]: {
        label: 'part number',
        value: AssetFilterPropertiesOption.PartNumber,
        field: 'partNumber',
    },
    [AssetFilterPropertiesOption.LastUpdatedTimestamp]: {
        label: 'last updated timestamp',
        value: AssetFilterPropertiesOption.LastUpdatedTimestamp,
        field: 'lastUpdatedTimestamp',
    },
    [AssetFilterPropertiesOption.BusType]: {
        label: 'bus type',
        value: AssetFilterPropertiesOption.BusType,
        field: 'busType',
    },
    [AssetFilterPropertiesOption.IsNIAsset]: {
        label: 'is NI asset',
        value: AssetFilterPropertiesOption.IsNIAsset,
        field: 'isNIAsset',
    },
    [AssetFilterPropertiesOption.Keywords]: {
        label: 'keywords',
        value: AssetFilterPropertiesOption.Keywords,
        field: 'keywords',
    },
    [AssetFilterPropertiesOption.Properties]: {
        label: 'properties',
        value: AssetFilterPropertiesOption.Properties,
        field: 'properties',
    },
    [AssetFilterPropertiesOption.MinionId]: {
        label: 'minionId',
        value: AssetFilterPropertiesOption.MinionId,
        field: 'location',
    },
    [AssetFilterPropertiesOption.Location]: {
        label: 'location',
        value: AssetFilterPropertiesOption.Location,
        field: 'location',
    },
    [AssetFilterPropertiesOption.ParentName]: {
        label: 'parent name',
        value: AssetFilterPropertiesOption.ParentName,
        field: 'location',
    },
    [AssetFilterPropertiesOption.SupportsSelfCalibration]: {
        label: 'supports self calibration',
        value: AssetFilterPropertiesOption.SupportsSelfCalibration,
        field: 'supportsSelfCalibration',
    },
    [AssetFilterPropertiesOption.SupportsSelfTest]: {
        label: 'supports self test',
        value: AssetFilterPropertiesOption.SupportsSelfTest,
        field: 'supportsSelfTest',
    },
    [AssetFilterPropertiesOption.SupportsReset]: {
        label: 'supports reset',
        value: AssetFilterPropertiesOption.SupportsReset,
        field: 'supportsReset',
    },
    [AssetFilterPropertiesOption.DiscoveryType]: {
        label: 'discovery type',
        value: AssetFilterPropertiesOption.DiscoveryType,
        field: 'discoveryType',
    },
    [AssetFilterPropertiesOption.SelfCalibration]: {
        label: 'self calibration',
        value: AssetFilterPropertiesOption.SelfCalibration,
        field: 'selfCalibration',
    },
    [AssetFilterPropertiesOption.SupportsExternalCalibration]: {
        label: 'supports external calibration',
        value: AssetFilterPropertiesOption.SupportsExternalCalibration,
        field: 'supportsExternalCalibration',
    },
    [AssetFilterPropertiesOption.ExternalCalibrationDate]: {
        label: 'calibration due date',
        value: AssetFilterPropertiesOption.ExternalCalibrationDate,
        field: 'externalCalibration',
    },
    [AssetFilterPropertiesOption.IsSystemController]: {
        label: 'is system controller',
        value: AssetFilterPropertiesOption.IsSystemController,
        field: 'isSystemController',
    },
    [AssetFilterPropertiesOption.Workspace]: {
        label: 'workspace',
        value: AssetFilterPropertiesOption.Workspace,
        field: 'workspace',
    },
    [AssetFilterPropertiesOption.CalibrationStatus]: {
        label: 'calibration status',
        value: AssetFilterPropertiesOption.CalibrationStatus,
        field: 'calibrationStatus',
    },

}
