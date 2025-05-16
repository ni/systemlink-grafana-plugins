import { DataQuery } from '@grafana/schema'

export interface WorkOrdersQuery extends DataQuery {
    queryBy?: string;
}
