import { AlarmsQuery, AlarmTransition, AlarmTransitionType } from './types';

export interface AlarmsTrendQuery extends AlarmsQuery {
  filter?: string;
}

export type AlarmTransitionWithNumericTime = AlarmTransition & { occurredAtAsNumber: number };

export interface AlarmTransitionEvent {
  occurredAtAsNumber: number;
  alarmId: string;
  type: AlarmTransitionType;
}
