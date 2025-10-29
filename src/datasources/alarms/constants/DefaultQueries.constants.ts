import { AlarmsCountQuery } from '../types/AlarmsCount.types';
import { ListAlarmsQuery } from '../types/ListAlarms.types';
import { QueryType } from '../types/types';

export const DEFAULT_QUERY_TYPE: QueryType = QueryType.AlarmsCount;

export const defaultAlarmsCountQuery: Omit<AlarmsCountQuery, 'refId'> = {
  filter: '',
};

export const defaultListAlarmsQuery: Omit<ListAlarmsQuery, 'refId'> = {
  filter: '',
};
