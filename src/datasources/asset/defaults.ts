import { OutputType } from "./types/ListAssets.types"

export const defaultAssetSummaryQuery = {
}

export const defaultCalibrationForecastQuery = {
    filter: "",
    groupBy: []
}

export const defaultListAssetsQuery = {
    filter: "",
    outputType: OutputType.Properties,
    take: 1000,
}
