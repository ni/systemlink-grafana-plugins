import { DataQuery, DataSourceJsonData } from '@grafana/schema'
import { QueryBuilderField } from 'smart-webcomponents-react';

export interface AlarmsQuery extends DataQuery {
  queryKind: AlarmQueryType;
}

export enum AlarmQueryType {
  ListAlarms = "List Alarms",
  AlarmCount = "Alarm Count",
  AlarmTrend = "Alarm Trend",
}

export interface QBField extends QueryBuilderField {
  lookup?: {
    readonly?: boolean;
    dataSource: Array<{
      label: string,
      value: string
    }>;
  },
}

export interface AlarmDataSourceOptions extends DataSourceJsonData {
}
