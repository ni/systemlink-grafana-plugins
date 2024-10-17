import { DataSourceJsonData } from "@grafana/data";
import { AssetSummaryQuery } from "./AssetSummaryQuery.types";
import { CalibrationForecastQuery } from "./CalibrationForecastQuery.types";
import { ListAssetsQuery } from "./ListAssets.types";
import { AssetVariableQuery } from "./AssetVariableQuery.types";

export enum AssetQueryType {
  None = "",
  ListAssets = "List Assets",
  CalibrationForecast = "Calibration Forecast",
  AssetSummary = "Asset Summary"
}

export type AssetQuery = ListAssetsQuery | CalibrationForecastQuery | AssetSummaryQuery | AssetVariableQuery;

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
