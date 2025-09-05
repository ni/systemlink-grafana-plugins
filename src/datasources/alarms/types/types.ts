import { DataQuery } from '@grafana/schema';

export interface AlarmsQuery extends DataQuery {
  queryType?: QueryType;
}

export enum QueryType {
  AlarmsCount = 'AlarmsCount',
}

export interface QueryAlarmsRequestBody {
  take: number;
  returnCount: boolean;
};

export interface QueryAlarmsResponse {
  totalCount?: number;
  continuationToken?: string;
}
