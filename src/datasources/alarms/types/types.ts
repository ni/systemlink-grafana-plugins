import { DataQuery } from '@grafana/schema';

export interface AlarmsQuery extends DataQuery {
  queryType?: QueryType;
};

export enum QueryType {
  AlarmsCount = 'AlarmsCount'
};
