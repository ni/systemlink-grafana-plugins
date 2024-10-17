import { DataSourceJsonData } from "@grafana/data";
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

export interface AssetFeatureToggles {
  calibrationForecast: boolean;
  assetList: boolean;
  assetSummary: boolean;
}

export interface AssetDataSourceOptions extends DataSourceJsonData {
  featureToggles: AssetFeatureToggles;
}

export const AssetFeatureTogglesDefaults: AssetFeatureToggles = {
  assetList: true,
  calibrationForecast: true,
  assetSummary: true
}
