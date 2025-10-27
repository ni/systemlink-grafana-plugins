import { DataQuery } from "@grafana/schema";

export enum AssetQueryType {
  None = "",
  ListAssets = "List Assets",
  CalibrationForecast = "Calibration Forecast",
  AssetSummary = "Asset Summary"
}

export interface AssetQuery extends DataQuery {
  type: AssetQueryType
}

export enum AssetQueryReturnType {
  AssetTagPath = 'Asset Tag Path',
  AssetId = 'Asset Id'
}

export enum BusType {
  BUILT_IN_SYSTEM = 'BUILT_IN_SYSTEM',
  PCI_PXI = 'PCI_PXI',
  USB = 'USB',
  GPIB = 'GPIB',
  VXI = 'VXI',
  SERIAL = 'SERIAL',
  TCP_IP = 'TCP_IP',
  CRIO = 'CRIO',
  SCXI = 'SCXI',
  CDAQ = 'CDAQ',
  SWITCH_BLOCK = 'SWITCH_BLOCK',
  SCC = 'SCC',
  FIRE_WIRE = 'FIRE_WIRE',
  ACCESSORY = 'ACCESSORY',
  CAN = 'CAN',
  SWITCH_BLOCK_DEVICE = 'SWITCH_BLOCK_DEVICE',
  SLSC = 'SLSC'
}

export const BusTypeOptions = [
  { label: 'Built-in-system', value: BusType.BUILT_IN_SYSTEM },
  { label: 'PCI/PXI', value: BusType.PCI_PXI },
  { label: 'USB', value: BusType.USB },
  { label: 'GPIB', value: BusType.GPIB },
  { label: 'VXI', value: BusType.VXI },
  { label: 'Serial', value: BusType.SERIAL },
  { label: 'TCP/IP', value: BusType.TCP_IP },
  { label: 'CompactRIO', value: BusType.CRIO },
  { label: 'SCXI', value: BusType.SCXI },
  { label: 'cDAQ', value: BusType.CDAQ },
  { label: 'SwitchBlock', value: BusType.SWITCH_BLOCK },
  { label: 'SCC', value: BusType.SCC },
  { label: 'FireWire', value: BusType.FIRE_WIRE },
  { label: 'ACCESSORY', value: BusType.ACCESSORY },
  { label: 'CAN', value: BusType.CAN },
  { label: 'SwitchBlock device', value: BusType.SWITCH_BLOCK_DEVICE },
  { label: 'SLSC', value: BusType.SLSC },
];

export enum AssetType {
  GENERIC = 'GENERIC',
  DEVICE_UNDER_TEST = 'DEVICE_UNDER_TEST',
  FIXTURE = 'FIXTURE',
  SYSTEM = 'SYSTEM'
};

export const AssetTypeOptions = [
  { label: 'Generic', value: AssetType.GENERIC },
  { label: 'Device under test', value: AssetType.DEVICE_UNDER_TEST },
  { label: 'Fixture', value: AssetType.FIXTURE },
  { label: 'System', value: AssetType.SYSTEM },
];
