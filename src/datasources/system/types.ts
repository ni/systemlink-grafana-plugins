import { DataQuery } from '@grafana/schema'

export enum QueryType {
  Metadata = "Metadata",
  Summary = "Summary"
}

export interface SystemQuery extends DataQuery {
  queryClass: QueryType
}

export interface SystemSummary {
  connectedCount: number,
  disconnectedCount: number
}
