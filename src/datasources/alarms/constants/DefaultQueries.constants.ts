import { AlarmsCountQuery } from '../types/AlarmsCount.types';
import { QueryType } from '../types/types';

export const defaultAlarmsCountQuery: Omit<AlarmsCountQuery, 'refId'> = {
    queryType: QueryType.AlarmsCount,
    filter: "",
};
