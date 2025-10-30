import { AlarmsCountQuery } from '../types/AlarmsCount.types';
import { AlarmsProperties, ListAlarmsQuery } from '../types/ListAlarms.types';
import { QueryType } from '../types/types';

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
    ]
};
