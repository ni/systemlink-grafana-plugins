import { DataQuery } from '@grafana/schema'

export interface AssetMetadataQuery extends DataQuery {
  type: AssetQueryType,
  workspace: string,
  minionIds: string[]
}

export interface AssetUtilizationQuery extends DataQuery {
  type: AssetQueryType,
  workspace: string,
  entityType: EntityType
  assetIdentifiers: string[],
  minionIds: string[],
}

export type AssetQuery = AssetMetadataQuery | AssetUtilizationQuery;

export enum EntityType {
  Asset = "Asset",
  System = "System"
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


export enum AssetQueryType {
  Metadata = "Metadata",
  Utilization = "Utilization"
}

export enum AssetQueryLabel {
  Metadata = "Metadata",
  Utilization = "Utilization"
}


export interface AssetsResponse {
  assets: AssetModel[],
  totalCount: number
}

export interface AssetUtilizationHistory {
  utilizationIdentifier: string,
  assetIdentifier: string,
  minionId: string,
  category: string,
  taskName?: string,
  userName?: string,
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

export interface IntervalsWithPeakFlag<T> extends Interval<T> {
  isWorking: boolean
}

export interface IntervalWithHeartbeat<T> extends Interval<T> {
  'heartbeatTimestamp': T
}

export interface AssetModel {
  modelName: string,
  modelNumber: number,
  serialNumber: string,
  vendorName: string,
  vendorNumber: number,
  busType: 'BUILT_IN_SYSTEM' | 'PCI_PXI' | 'USB' | 'GPIB' | 'VXI' | 'SERIAL' | 'TCP_IP' | 'CRIO' | 'SCXI' | 'CDAQ' | 'SWITCH_BLOCK' | 'SCC' | 'FIRE_WIRE' | 'ACCESSORY' | 'CAN' | 'SWITCH_BLOCK_DEVICE' | 'SLSC' | string,
  name: string,
  assetType: 'GENERIC' | 'DEVICE_UNDER_TEST' | 'FIXTURE' | 'SYSTEM' | string,
  firmwareVersion: string,
  hardwareVersion: string,
  visaResourceName: string,
  temperatureSensors: any[],
  supportsSelfCalibration: boolean,
  supportsExternalCalibration: boolean,
  customCalibrationInterval?: number,
  selfCalibration?: any,
  isNIAsset: boolean,
  workspace: string,
  fileIds: string[],
  supportsSelfTest: boolean,
  supportsReset: boolean,
  id: string,
  location: AssetLocationModel,
  calibrationStatus: 'OK' | 'APPROACHING_RECOMMENDED_DUE_DATE' | 'PAST_RECOMMENDED_DUE_DATE' | string,
  isSystemController: boolean,
  externalCalibration?: ExternalCalibrationModel,
  discoveryType: 'MANUAL' | 'AUTOMATIC' | string,
  properties: Record<string, string>,
  keywords: string[],
  lastUpdatedTimestamp: string,
}

export interface AssetPresenceWithSystemConnectionModel {
  assetPresence: "INITIALIZING" | "UNKNOWN" | "NOT_PRESENT" | "PRESENT" | string,
  // to be compatible with both SLS and SLE
  systemConnection?: "APPROVED" | "DISCONNECTED" | "CONNECTED_UPDATE_PENDING" | "CONNECTED_UPDATE_SUCCESSFUL" | "CONNECTED_UPDATE_FAILED" | "UNSUPPORTED" | "ACTIVATED" | "CONNECTED" | string
}

export interface AssetLocationModel {
  minionId: string,
  parent: string,
  resourceUri: string,
  slotNumber: number,
  state: AssetPresenceWithSystemConnectionModel,
  physicalLocation?: string
}

export interface ExternalCalibrationModel {
  temperatureSensors: any[],
  isLimited?: boolean,
  date: string,
  recommendedInterval: number,
  nextRecommendedDate: string,
  nextCustomDueDate?: string,
  comments: string,
  entryType: "AUTOMATIC" | "MANUAL" | string,
  operator: ExternalCalibrationOperatorModel
}

export interface ExternalCalibrationOperatorModel {
  displayName: string;
  userId: string
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
  IsSystemController = 'IsSystemController'
}

export interface AssetUtilizationHistoryResponse {
  assetUtilizations: AssetUtilizationHistory[];
  continuationToken: string;
}

export interface QueryAssetUtilizationHistoryRequest {
  utilizationFilter?: string,
  assetFilter?: string,
  continuationToken?: string,
  take?: number,
  orderBy?: AssetUtilizationOrderBy,
  orderByDescending?: boolean
}

export enum AssetUtilizationOrderBy {
  UTILIZATION_IDENTIFIER = 'UTILIZATION_IDENTIFIER',
  ASSET_IDENTIFIER = 'ASSET_IDENTIFIER',
  MINION_ID = 'MINION_ID',
  CATEGORY = 'CATEGORY',
  TASK_NAME = 'TASK_NAME',
  USER_NAME = 'USER_NAME',
  START_TIMESTAMP = 'START_TIMESTAMP',
}
