import { DataQuery } from '@grafana/schema'

export interface AssetQuery extends DataQuery {
  type: AssetQueryType,
  workspace: string,
  minionIds: string[]
}

export enum AssetQueryType {
  Metadata = "Metadata",
}

export enum EntityType {
  Asset = "Asset",
  System = "System"
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
  customCalibrationInterval?: number,
  selfCalibration?: any, // todo SelfCalibrationModel
  isNIAsset: boolean,
  workspace: string,
  fileIds: string[],
  supportsSelfTest: boolean,
  supportsReset: boolean,
  id: string,
  location: AssetLocationModel,
  calibrationStatus: 'OK' | 'APPROACHING_RECOMMENDED_DUE_DATE' | 'PAST_RECOMMENDED_DUE_DATE',
  isSystemController: boolean,
  externalCalibration?: ExternalCalibrationModel,
  discoveryType: 'MANUAL' | 'AUTOMATIC',
  properties: Record<string, string>,
  keywords: string[],
  lastUpdatedTimestamp: string,
}

export interface AssetPresenceWithSystemConnectionModel {
  assetPresence: AssetPresence,
  systemConnection?: SystemConnection
}

export interface AssetLocationModel {
  minionId: string,
  parent: string,
  resourceUri: string,
  slotNumber: number,
  systemName: string,
  state: AssetPresenceWithSystemConnectionModel
}

export interface ExternalCalibrationModel {
  temperatureSensors: any[],
  isLimited?: boolean,
  date: string,
  recommendedInterval: number,
  nextRecommendedDate: string,
  nextCustomDueDate?: string,
  comments: string,
  entryType: ExternalCalibrationEntryType,
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

export enum ExternalCalibrationEntryType {
  AUTOMATIC = 'AUTOMATIC',
  MANUAL = 'MANUAL'
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

