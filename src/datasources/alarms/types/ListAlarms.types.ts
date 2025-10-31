import { AlarmsQuery } from './types';

export interface ListAlarmsQuery extends AlarmsQuery {
  filter?: string;
  take?: number;
  descending?: boolean;
}
