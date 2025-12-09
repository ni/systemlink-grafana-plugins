import { AlarmTrendQuery } from '../types/AlarmTrend.types';
import { AlarmsSpecificProperties, ListAlarmsQuery, OutputType } from '../types/ListAlarms.types';
import { AlarmsVariableQuery, QueryType } from '../types/types';
import { DEFAULT_QUERY_EDITOR_DESCENDING, DEFAULT_QUERY_EDITOR_TAKE, DEFAULT_QUERY_EDITOR_TRANSITION_INCLUSION_OPTION } from './AlarmsQueryEditor.constants';

export const DEFAULT_QUERY_TYPE: QueryType = QueryType.ListAlarms;

export const defaultListAlarmsQuery: Omit<ListAlarmsQuery, 'refId'> = {
  outputType: OutputType.Properties,
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

export const defaultAlarmTrendQuery: Omit<AlarmTrendQuery, 'refId'> = {
  filter: '',
  groupBySeverity: true
};

export const defaultListAlarmsVariableQuery: Omit<AlarmsVariableQuery, 'refId'> = {
  filter: '',
  take: DEFAULT_QUERY_EDITOR_TAKE,
  descending: DEFAULT_QUERY_EDITOR_DESCENDING,
};
