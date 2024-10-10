import { DataSourceJsonData } from "@grafana/data";
import { AssetSummaryQuery } from "./AssetSummaryQuery.types";
import { CalibrationForecastQuery } from "./CalibrationForecastQuery.types";
import { ListAssetsQuery } from "./ListAssets.types";

export enum AssetQueryType {
  ListAssets = "List Assets",
  CalibrationForecast = "Calibration Forecast",
  AssetSummary = "Asset Summary"
}

export type AssetQuery = ListAssetsQuery | CalibrationForecastQuery | AssetSummaryQuery;

export interface AssetDataSourceOptions extends DataSourceJsonData {
  calibrationForecastEnabled: boolean | null;
  assetListEnabled: boolean | null;
  assetSummaryEnabled: boolean | null;
}
