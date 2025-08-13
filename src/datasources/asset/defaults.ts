import { QUERY_LIMIT } from "./constants/constants"
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
    take: QUERY_LIMIT,
}

export const defaultListAssetsVariable = {
    filter: "",
    take: QUERY_LIMIT,
}
