import { AlarmsQuery, AlarmTransition, AlarmTransitionSeverityLevel, AlarmTransitionType } from './types';

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

export type AlarmTransitionWithNumericTime = AlarmTransition & { occurredAtAsNumber: number };

export interface AlarmTransitionEvent {
  occurredAtAsNumber: number;
  alarmId: string;
  type: AlarmTransitionType;
  severityLevel: AlarmTransitionSeverityLevel
}
