import {
  AssetQueryType,
} from "./types";
import { SelectableValue } from "@grafana/data";
import { enumToOptions } from "../../core/utils";


export const assetQueryTypeOptions: SelectableValue[] = enumToOptions(AssetQueryType)
