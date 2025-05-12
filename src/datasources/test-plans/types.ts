import { DataQuery } from '@grafana/schema'

export interface TestPlansQuery extends DataQuery {
    outputType: OutputType;
}

export enum OutputType {
    Properties = "Properties",
    TotalCount = "Total Count"
}
