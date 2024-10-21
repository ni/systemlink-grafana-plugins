import { FieldDTO } from '@grafana/data';
import { QueryBuilderField } from 'smart-webcomponents-react';
import { AssetQuery } from './types';

export interface CalibrationForecastQuery extends AssetQuery {
    groupBy: string[];
    filter?: string;
}

export interface CalibrationForecastResponse {
    calibrationForecast: CalibrationForecastModel
}

export interface CalibrationForecastModel {
    columns: FieldDTOWithDescriptor[],
}

export enum AssetCalibrationPropertyGroupByType {
    Location = "LOCATION",
    Model = "MODEL",
    Workspace = "WORKSPACE",
    Vendor = "VENDOR_NAME",
    AssetType = "ASSET_TYPE",
    BusType = "BUS_TYPE",
}

export enum AssetCalibrationTimeBasedGroupByType {
    Day = "DAY",
    Week = "WEEK",
    Month = "MONTH",
}

export type AssetCalibrationGroupByType = AssetCalibrationPropertyGroupByType | AssetCalibrationTimeBasedGroupByType;

export enum AssetCalibrationForecastKey {
    Day = "Day",
    Month = "Month",
    Week = "Week",
    Count = "Assets"
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

export interface FieldDTOWithDescriptor extends FieldDTO {
    columnDescriptors: ColumnDescriptor[]
}

export interface ColumnDescriptor {
    value: string
    type: ColumnDescriptorType
}

export enum ColumnDescriptorType {
    Time = "TIME",
    Count = "COUNT",
    StringValue = "STRING_VALUE",
    MinionId = "MINION_ID",
    WorkspaceId = "WORKSPACE_ID",
    AssetType = "ASSET_TYPE",
    BusType = "BUS_TYPE",
}

export interface QBField extends QueryBuilderField {
    lookup?: {
        readonly?: boolean;
        dataSource: Array<{
            label: string,
            value: string
        }>;
    },
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
