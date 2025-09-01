import { QUERY_LIMIT } from "./constants/constants"
import { AssetFilterPropertiesOption, OutputType } from "./types/ListAssets.types"

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
    properties: [AssetFilterPropertiesOption.VendorName, AssetFilterPropertiesOption.AssetName, AssetFilterPropertiesOption.ModelName, AssetFilterPropertiesOption.Workspace, AssetFilterPropertiesOption.Location],
}

export const defaultListAssetsQueryForOldPannels = {
    filter: "",
    outputType: OutputType.Properties,
    take: QUERY_LIMIT,
    properties: Object.values(AssetFilterPropertiesOption),
}

export const defaultListAssetsVariable = {
    filter: "",
    take: QUERY_LIMIT,
}
