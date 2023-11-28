import {DataQuery} from '@grafana/schema'

export interface AssetUtilizationQuery extends DataQuery {
    assetIdentifier?: string
    isNIAsset?: IsNIAsset,
    minionId?: string,
    isPeak: IsPeak,
    timeFrequency: UtilizationTimeFrequency
    utilizationCategory: UtilizationCategory
    peakDays: Weekday[]
}

export type ValidAssetUtilizationQuery = AssetUtilizationQuery & Required<Omit<AssetUtilizationQuery, keyof DataQuery>>;

export enum IsNIAsset {
    NIASSET = 'NIASSET',
    NOTNIASSET = 'NOTNIASSET',
    BOTH = 'BOTH'
}

export enum IsPeak {
    PEAK = 'PEAK',
    NONPEAK = 'NONPEAK',
}

export enum Weekday {
    Sunday = 0,
    Monday = 1,
    Tuesday = 2,
    Wednesday = 3,
    Thursday = 4,
    Friday = 5,
    Saturday = 6,
}

export enum UtilizationCategory {
    TEST = 'TEST',
    ALL = 'ALL',
}

export enum TagQueryType {
    Current = 'Current',
    History = 'History',
}

export enum UtilizationTimeFrequency {
    DAILY = 'DAILY',
    HOURLY = 'HOURLY',
}

export type ColumnDataType = 'BOOL' | 'INT32' | 'INT64' | 'FLOAT32' | 'FLOAT64' | 'STRING' | 'TIMESTAMP';

export interface Column {
    name: string;
    dataType: ColumnDataType;
    columnType: 'INDEX' | 'NULLABLE' | 'NORMAL';
    properties: Record<string, string>;
}

export type NumberTuple = [number, number]

export interface AssetUtilizationHistory {
    utilizationIdentifier: string,
    assetIdentifier: string,
    minionId: string,
    category: string,
    taskName: string,
    userName: string,
    startTimestamp: string,
    endTimestamp?: string,
    heartbeatTimestamp?: string,
}

export interface ServicePolicyModel {
    calibrationPolicy: {
        daysForApproachingCalibrationDueDate: number
    },
    workingHoursPolicy: {
        startTime: string,
        endTime: string
    }
}

export interface Interval<T> {
    'startTimestamp': T,
    'endTimestamp': T
}

export interface IntervalWithHeartbeat<T> extends Interval<T> {
    'heartbeatTimestamp': T
}

export interface WorkspaceResponse {
    totalCount: number,
    workspaces: Workspace[]
}

export interface Workspace {
    "default": Boolean,
    "enabled": Boolean,
    "id": string,
    "name": string
}

export interface AssetUtilizationHistoryResponse {
    assetUtilizations: AssetUtilizationHistory[];
    continuationToken: string;
}

export enum SingleOrHistorical {
    SINGLE = 'SINGLE',
    HISTORICAL = 'HISTORICAL'
}

export const defaultQuery: Omit<ValidAssetUtilizationQuery, 'refId'> = {
    assetIdentifier: '',
    isNIAsset: IsNIAsset.BOTH,
    minionId: '',
    isPeak: IsPeak.PEAK,
    timeFrequency: UtilizationTimeFrequency.DAILY,
    utilizationCategory: UtilizationCategory.ALL,
    peakDays: [Weekday.Monday, Weekday.Tuesday, Weekday.Wednesday, Weekday.Thursday, Weekday.Friday],
};

export interface SystemLinkError {
    error: {
        args: string[];
        code: number;
        message: string;
        name: string;
    }
}

export type AssetUtilizationOrderBy =
    'UTILIZATION_IDENTIFIER'
    | 'ASSET_IDENTIFIER'
    | 'MINION_ID'
    | 'CATEGORY'
    | 'TASK_NAME'
    | 'USER_NAME'
    | 'START_TIMESTAMP'

export function isSystemLinkError(error: any): error is SystemLinkError {
    return Boolean(error?.error?.code) && Boolean(error?.error?.name);
}

export interface TableMetadata {
    columns: Column[];
    id: string;
    name: string;
    workspace: string;
}

export interface AssetsResponse {
    assets: AssetModel[],
    totalCount: number
}

export interface AssetModel {
    modelName: string,
    modelNumber: number,
    serialNumber: string,
    vendorName: string,
    vendorNumber: number,
    busType: 'BUILT_IN_SYSTEM' | 'PCI_PXI' | 'USB' | 'GPIB' | 'VXI' | 'SERIAL' | 'TCP_IP' | 'CRIO' | 'SCXI' | 'CDAQ' | 'SWITCH_BLOCK' | 'SCC' | 'FIRE_WIRE' | 'ACCESSORY' | 'CAN' | 'SWITCH_BLOCK_DEVICE' | 'SLSC',
    name: string,
    assetType: 'GENERIC' | 'DEVICE_UNDER_TEST' | 'FIXTURE' | 'SYSTEM',
    firmwareVersion: string,
    hardwareVersion: string,
    visaResourceName: string,
    temperatureSensors: any[], // todo TemperatureSensorModel
    supportsSelfCalibration: boolean,
    supportsExternalCalibration: boolean,
    customCalibrationInterval: number,
    selfCalibration: any, // todo SelfCalibrationModel
    isNIAsset: boolean,
    workspace: string,
    fileIds: string[],
    supportsSelfTest: boolean,
    supportsReset: boolean,
    id: string,
    location: AssetLocationModel,
    calibrationStatus: 'OK' | 'APPROACHING_RECOMMENDED_DUE_DATE' | 'PAST_RECOMMENDED_DUE_DATE',
    isSystemController: boolean,
    externalCalibration: any, // todo ExternalCalibrationModel
    discoveryType: 'Manual' | 'Automatic',
    properties: string,
    keywords: string,
    lastUpdatedTimestamp: string,
}

export interface AssetPresenceWithSystemConnectionModel {
    assetPresence: AssetPresence,
    systemConnection: SystemConnection
}

export interface AssetLocationModel {
    minionId: string,
    parent: string,
    resourceUri: string,
    slotNumber: number,
    systemName: string,
    state: AssetPresenceWithSystemConnectionModel
}

export interface UtilizationWithPercentageModel {
    startTimestamp: string,
    endTimestamp: string,
    assetIdentifier: string,
    assetName?: string,
    minionId?: string,
    category?: string,
    percentage: string,
}

export enum ContainOperator {
    CONTAIN,
    NOTCONTAIN
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
    LocationSystemName = 'Location.SystemName',
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
    IsSystemController = 'IsSystemController'
}

export enum AssetPresence {
    INITIALIZING = "INITIALIZING",
    UNKNOWN = "UNKNOWN",
    NOT_PRESENT = "NOT_PRESENT",
    PRESENT = "PRESENT"
}

export enum SystemConnection {
    APPROVED = "APPROVED",
    DISCONNECTED = "DISCONNECTED",
    CONNECTED_UPDATE_PENDING = "CONNECTED_UPDATE_PENDING",
    CONNECTED_UPDATE_SUCCESSFUL = "CONNECTED_UPDATE_SUCCESSFUL",
    CONNECTED_UPDATE_FAILED = "CONNECTED_UPDATE_FAILED",
    UNSUPPORTED = "UNSUPPORTED",
    ACTIVATED = "ACTIVATED"
}
