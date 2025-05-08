import { AlarmsQuery } from "../types";

export interface AlarmVariableQuery extends AlarmsQuery {
  filter: string;
}
