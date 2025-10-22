import { AlarmsCountQuery } from "../types/AlarmsCount.types";
import { ListAlarmsQuery } from "../types/ListAlarms.types";
import { QueryType } from "../types/types";

export const defaultAlarmsCountQuery: Omit<AlarmsCountQuery, 'refId'> = {
    queryType: QueryType.AlarmsCount,
};

export const defaultListAlarmsQuery: Omit<ListAlarmsQuery, 'refId'> = {
    queryType: QueryType.ListAlarms,
};
