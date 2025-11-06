import { DataQuery } from '@grafana/schema';

export interface AlarmsQuery extends DataQuery {
  queryType?: QueryType;
}

export interface AlarmsVariableQuery extends AlarmsQuery {
  filter?: string;
  descending?: boolean;
  take?: number;
}

export enum QueryType {
  AlarmsCount = 'Alarms Count',
  ListAlarms = 'List Alarms',
  AlarmsTrend = 'Alarms Trend'
}

export interface QueryAlarmsRequest {
  filter?: string;
  transitionInclusionOption?: TransitionInclusionOption;
  take?: number;
  orderBy?: string;
  orderByDescending?: boolean;
  continuationToken?: string;
  returnCount?: boolean;
  returnMostRecentlyOccurredOnly?: boolean;
}

export interface QueryAlarmsResponse {
  alarms: Alarm[];
  totalCount?: number;
  continuationToken?: string;
}

export interface Alarm {
  instanceId: string;
  alarmId: string;
  workspace: string;
  active: boolean;
  clear: boolean;
  acknowledged: boolean;
  acknowledgedAt: string | null;
  acknowledgedBy: string | null;
  occurredAt: string;
  updatedAt: string;
  createdBy: string;
  transitions: AlarmTransition[];
  transitionOverflowCount: number;
  currentSeverityLevel: number;
  highestSeverityLevel: number;
  mostRecentSetOccurredAt: string | null;
  mostRecentTransitionOccurredAt: string | null;
  channel: string;
  condition: string;
  displayName: string;
  description: string;
  keywords: string[];
  properties: {
    [key: string]: string;
  };
  resourceType: string;
}

export enum TransitionInclusionOption {
  None = 'NONE',
  MostRecentOnly = 'MOST_RECENT_ONLY',
  All = 'ALL',
};

export interface AlarmTransition {
  transitionType: AlarmTransitionType;
  occurredAt: string;
  severityLevel: AlarmTransitionSeverityLevel;
  value: string;
  condition: string;
  shortText: string;
  detailText: string;
  keywords: string[];
  properties: {
    [key: string]: string;
  };
  [key: string]: any;
}

export enum AlarmTransitionType {
  Clear = 'CLEAR',
  Set = 'SET',
};

export enum AlarmTransitionSeverityLevel {
  Clear = -1,
  Low = 1,
  Moderate = 2,
  High = 3,
  Critical = 4,
}
