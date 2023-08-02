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

export interface SystemMetadata {
  id: string,
  alias: string,
  state: string,
  locked: string,
  systemStartTime: string,
  model: string,
  vendor: string,
  osFullName: string,
  ip4Interfaces: Record<string, string[]>,
  ip6Interfaces: Record<string, string[]>,
  workspace: string
}

export interface VariableQuery {
  id: string,
  alias: string
}
