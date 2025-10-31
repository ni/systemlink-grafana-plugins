import { AlarmsCountQuery } from '../types/AlarmsCount.types';
import { ListAlarmsQuery } from '../types/ListAlarms.types';
import { QueryType } from '../types/types';
import { DEFAULT_QUERY_EDITOR_DESCENDING, DEFAULT_QUERY_EDITOR_TAKE } from './AlarmsQueryEditor.constants';

export const DEFAULT_QUERY_TYPE: QueryType = QueryType.ListAlarms;

export const defaultAlarmsCountQuery: Omit<AlarmsCountQuery, 'refId'> = {
  filter: '',
};

export const defaultListAlarmsQuery: Omit<ListAlarmsQuery, 'refId'> = {
  filter: '',
  take: DEFAULT_QUERY_EDITOR_TAKE,
  descending: DEFAULT_QUERY_EDITOR_DESCENDING,
};
