import { DataQuery } from '@grafana/schema'

export enum SystemQueryType {
  Properties = "Properties",
  Summary = "Summary"
}

export interface SystemQuery extends DataQuery {
  queryKind: SystemQueryType;
  systemName: string;
  workspace: string;
  filter?: string;
}

export interface SystemVariableQuery {
  workspace: string;
  queryReturnType?: SystemQueryReturnType;
  filter?: string;
}

export interface SystemSummary {
  connectedCount: number;
  disconnectedCount: number;
}

export interface SystemProperties {
  id: string;
  alias?: string;
  state: string;
  locked?: boolean;
  systemStartTime?: string;
  model?: string;
  vendor?: string;
  osFullName?: string;
  ip4Interfaces?: Record<string, string[]>;
  ip6Interfaces?: Record<string, string[]>;
  workspace: string;
  scanCode?: string;
  minionId?: string;
}

export enum SystemQueryReturnType {
  MinionId = 'Minion Id',
  ScanCode = 'Scan Code'
}

export enum ConnectionStatus {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTED_REFRESH_FAILED = 'CONNECTED_REFRESH_FAILED',
  CONNECTED = 'CONNECTED',
  VIRTUAL = 'VIRTUAL',
  APPROVED = 'APPROVED',
  CONNECTED_REFRESH_PENDING = 'CONNECTED_REFRESH_PENDING',
  ACTIVATED_WITHOUT_CONNECTION = 'ACTIVATED_WITHOUT_CONNECTION',
}

export const ConnectionStatusOptions = [
  { label: 'Disconnected', value: ConnectionStatus.DISCONNECTED },
  { label: 'Connected refresh failed', value: ConnectionStatus.CONNECTED_REFRESH_FAILED },
  { label: 'Connected', value: ConnectionStatus.CONNECTED },
  { label: 'Virtual', value: ConnectionStatus.VIRTUAL },
  { label: 'Approved', value: ConnectionStatus.APPROVED },
  { label: 'Connected refresh pending', value: ConnectionStatus.CONNECTED_REFRESH_PENDING },
  { label: 'Activated without connection', value: ConnectionStatus.ACTIVATED_WITHOUT_CONNECTION },
];
