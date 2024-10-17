import { DataQuery } from '@grafana/schema'
import { AssetQueryType } from './types';

export interface ListAssetsQuery extends DataQuery {
    queryType: AssetQueryType;
    filter: string;
}

export enum AssetFilterProperties {
    AssetIdentifier = 'AssetIdentifier',
    SerialNumber = 'SerialNumber',
    ModelName = 'ModelName',
    VendorName = 'VendorName',
    VendorNumber = 'VendorNumber',
    AssetName = 'AssetName',
    FirmwareVersion = 'FirmwareVersion',
    HardwareVersion = 'HardwareVersion',
    BusType = 'BusType',
    IsNIAsset = 'IsNIAsset',
    Keywords = 'Keywords',
    Properties = 'Properties',
    LocationMinionId = 'Location.MinionId',
    LocationSlotNumber = 'Location.SlotNumber',
    LocationAssetStateSystemConnection = 'Location.AssetState.SystemConnection',
    LocationAssetStateAssetPresence = 'Location.AssetState.AssetPresence',
    SupportsSelfCalibration = 'SupportsSelfCalibration',
    SelfCalibrationCalibrationDate = 'SelfCalibration.CalibrationDate',
    SupportsExternalCalibration = 'SupportsExternalCalibration',
    CustomCalibrationInterval = 'CustomCalibrationInterval',
    CalibrationStatus = 'CalibrationStatus',
    ExternalCalibrationCalibrationDate = 'ExternalCalibration.CalibrationDate',
    ExternalCalibrationNextRecommendedDate = 'ExternalCalibration.NextRecommendedDate',
    ExternalCalibrationRecommendedInterval = 'ExternalCalibration.RecommendedInterval',
    ExternalCalibrationComments = 'ExternalCalibration.Comments',
    ExternalCalibrationIsLimited = 'ExternalCalibration.IsLimited',
    ExternalCalibrationOperatorDisplayName = 'ExternalCalibration.Operator.DisplayName',
    IsSystemController = 'IsSystemController',
    Workspace = 'Workspace'
}

export enum EntityType {
    Asset = "Asset",
    System = "System"
}
