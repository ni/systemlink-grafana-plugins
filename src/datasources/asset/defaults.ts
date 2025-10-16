import { QUERY_LIMIT } from "./constants/constants"
import { AssetFilterPropertiesOption, OutputType } from "./types/ListAssets.types"
import { AssetQueryReturnType } from "./types/types"

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

export const defaultProjectionForListAssetsVariable = [AssetFilterPropertiesOption.VendorName, AssetFilterPropertiesOption.VendorNumber, AssetFilterPropertiesOption.ModelName, AssetFilterPropertiesOption.ModelNumber, AssetFilterPropertiesOption.SerialNumber, AssetFilterPropertiesOption.AssetIdentifier, AssetFilterPropertiesOption.AssetName]

export const defaultListAssetsVariable = {
    filter: "",
    take: QUERY_LIMIT,
    queryReturnType: AssetQueryReturnType.AssetTagPath,
}
