import { Alarm, AlarmsQuery, AlarmTransition, AlarmTransitionType } from './types';

export interface AlarmsTrendQuery extends AlarmsQuery {
  filter?: string;
}

export type AlarmWithNumericTimeInTransitions = { transitions: AlarmTransitionWithNumericTime[] } & Alarm;

export type AlarmTransitionWithNumericTime = { occurredAtAsNumber: number } & AlarmTransition;

export interface AlarmTransitionEvent {
  occurredAtAsNumber: number;
  alarmId: string;
  type: AlarmTransitionType;
}
