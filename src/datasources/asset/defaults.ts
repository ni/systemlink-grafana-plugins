import { AssetQueryType } from "./types";

export const defaultAssetSummaryQuery = {
}

export const defaultCalibrationForecastQuery = {
}

export const defaultListAssetsQuery = {
    workspace: "",
    minionIds: []
}

export const defaultAssetQuery = defaultListAssetsQuery;

export const defaultAssetQueryType = AssetQueryType.ListAssets;
