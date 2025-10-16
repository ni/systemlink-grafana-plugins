import { AlarmsQuery } from './types';

export interface AlarmsCountQuery extends AlarmsQuery {
  filter?: string;
}
