import { DataQuery } from '@grafana/schema';

export interface WorkOrdersQuery extends DataQuery {
    queryBy?: string;
    outputType: OutputType;
}

export enum OutputType {
    Properties = "Properties",
    TotalCount = "Total Count"
}
