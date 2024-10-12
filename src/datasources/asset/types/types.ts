import { DataSourceJsonData } from "@grafana/data";
import { AssetSummaryQuery } from "./AssetSummaryQuery.types";
import { CalibrationForecastQuery } from "./CalibrationForecastQuery.types";
import { ListAssetsQuery } from "./ListAssets.types";

export enum AssetQueryType {
  None = "",
  ListAssets = "List Assets",
  CalibrationForecast = "Calibration Forecast",
  AssetSummary = "Asset Summary"
}

export type AssetQuery = ListAssetsQuery | CalibrationForecastQuery | AssetSummaryQuery;

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
  calibrationForecast: false,
  assetSummary: false
}
