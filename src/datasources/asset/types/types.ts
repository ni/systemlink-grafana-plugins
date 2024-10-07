import { AssetSummaryQuery } from "./AssetSummaryQuery.types";
import { CalibrationForecastQuery } from "./CalibrationForecastQuery.types";
import { ListAssetsQuery } from "./ListAssets.types";

export enum AssetQueryType {
  ListAssets = "List Assets",
  CalibrationForecast = "Calibration Forecast",
  AssetSummary = "Asset Summary"
}

export type AssetQuery = ListAssetsQuery | CalibrationForecastQuery | AssetSummaryQuery;
