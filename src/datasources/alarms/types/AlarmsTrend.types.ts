import { AlarmsQuery, AlarmTransition, AlarmTransitionSeverityLevel, AlarmTransitionType, Alarm } from './types';

export interface AlarmsTrendQuery extends AlarmsQuery {
  filter?: string;
  groupBySeverity?: boolean;
}

export enum AlarmTrendSeverityLevelLabel {
  Low = 'Low',
  Moderate = 'Moderate',
  High = 'High',
  Critical = 'Critical',
}

export type AlarmWithNumericTimeInTransitions = { transitions: AlarmTransitionWithNumericTime[] } & Alarm;

export type AlarmTransitionWithNumericTime = { occurredAtAsNumber: number } & AlarmTransition;

export interface AlarmTransitionEvent {
  occurredAtAsNumber: number;
  alarmId: string;
  type: AlarmTransitionType;
  severityLevel: AlarmTransitionSeverityLevel;
}
