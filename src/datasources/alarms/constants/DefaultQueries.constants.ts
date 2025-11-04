import { AlarmsCountQuery } from '../types/AlarmsCount.types';
import { AlarmsProperties, ListAlarmsQuery } from '../types/ListAlarms.types';
import { AlarmsVariableQuery, QueryType, TransitionInclusionOption } from '../types/types';
import { DEFAULT_QUERY_EDITOR_DESCENDING, DEFAULT_QUERY_EDITOR_TAKE } from './AlarmsQueryEditor.constants';

export const DEFAULT_QUERY_TYPE: QueryType = QueryType.ListAlarms;

export const defaultAlarmsCountQuery: Omit<AlarmsCountQuery, 'refId'> = {
  filter: '',
};

export const defaultListAlarmsQuery: Omit<ListAlarmsQuery, 'refId'> = {
  filter: '',
  properties: [
    AlarmsProperties.displayName,
    AlarmsProperties.currentSeverityLevel,
    AlarmsProperties.occurredAt,
    AlarmsProperties.source,
    AlarmsProperties.state,
    AlarmsProperties.workspace,
  ],
  transition: TransitionInclusionOption.None,
};

export const defaultListAlarmsVariableQuery: Omit<AlarmsVariableQuery, 'refId'> = {
  filter: '',
  take: DEFAULT_QUERY_EDITOR_TAKE,
  descending: DEFAULT_QUERY_EDITOR_DESCENDING,
};
