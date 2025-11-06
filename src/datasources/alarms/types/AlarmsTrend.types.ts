import { AlarmsQuery } from './types';

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
