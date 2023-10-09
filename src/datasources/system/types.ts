import { DataQuery } from '@grafana/schema'

export enum SystemQueryType {
  Metadata = "Metadata",
  Summary = "Summary"
}

export interface SystemQuery extends DataQuery {
  queryKind: SystemQueryType;
  systemName: string;
  workspace: string;
}

export interface SystemVariableQuery {
  workspace: string;
}

export interface SystemSummary {
  connectedCount: number;
  disconnectedCount: number;
}

export interface SystemMetadata {
  id: string;
  alias: string;
  state: string;
  locked: boolean;
  systemStartTime: string;
  model: string;
  vendor: string;
  osFullName: string;
  ip4Interfaces: Record<string, string[]>;
  ip6Interfaces: Record<string, string[]>;
  workspace: string;
}
