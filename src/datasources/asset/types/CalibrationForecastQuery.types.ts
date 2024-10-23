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
