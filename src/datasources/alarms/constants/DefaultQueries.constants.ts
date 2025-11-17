import { AlarmsCountQuery } from '../types/AlarmsCount.types';
import { AlarmsTrendQuery } from '../types/AlarmsTrend.types';
import { AlarmsSpecificProperties, ListAlarmsQuery } from '../types/ListAlarms.types';
import { AlarmsVariableQuery, QueryType } from '../types/types';
import { DEFAULT_QUERY_EDITOR_DESCENDING, DEFAULT_QUERY_EDITOR_TAKE, DEFAULT_QUERY_EDITOR_TRANSITION_INCLUSION_OPTION } from './AlarmsQueryEditor.constants';

export const DEFAULT_QUERY_TYPE: QueryType = QueryType.ListAlarms;

export const defaultAlarmsCountQuery: Omit<AlarmsCountQuery, 'refId'> = {
  filter: '',
};

export const defaultListAlarmsQuery: Omit<ListAlarmsQuery, 'refId'> = {
  filter: '',
  properties: [
    AlarmsSpecificProperties.displayName,
    AlarmsSpecificProperties.currentSeverityLevel,
    AlarmsSpecificProperties.occurredAt,
    AlarmsSpecificProperties.source,
    AlarmsSpecificProperties.state,
    AlarmsSpecificProperties.workspace,
  ],
  take: DEFAULT_QUERY_EDITOR_TAKE,
  descending: DEFAULT_QUERY_EDITOR_DESCENDING,
  transitionInclusionOption: DEFAULT_QUERY_EDITOR_TRANSITION_INCLUSION_OPTION,
};

export const defaultAlarmsTrendQuery: Omit<AlarmsTrendQuery, 'refId'> = {
  filter: '',
  groupBySeverity: true
};

export const defaultListAlarmsVariableQuery: Omit<AlarmsVariableQuery, 'refId'> = {
  filter: '',
  take: DEFAULT_QUERY_EDITOR_TAKE,
  descending: DEFAULT_QUERY_EDITOR_DESCENDING,
};
