import { DataQuery } from '@grafana/schema'

export enum QueryType {
  Metadata = "Metadata",
  Summary = "Summary"
}

export interface SystemQuery extends DataQuery {
  queryKind: QueryType
}

export interface SystemSummary {
  connectedCount: number,
  disconnectedCount: number
}

export interface SystemInfo {
  id: string,
  alias: string,
  connectionStatus: string,
  lockedStatus: string,
  systemStartTime: string,
  model: string,
  vendor: string,
  operatingSystem: string,
  ipAddress: string,
  workspace: string
}
