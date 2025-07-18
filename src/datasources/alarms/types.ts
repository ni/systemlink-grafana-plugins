import { DataQuery } from '@grafana/schema';

export interface AlarmsQuery extends DataQuery {
  queryBy?: string;
  groupBySeverity?: boolean;
  properties?: AlarmPropertiesOptions[];
  orderBy?: string;
  descending?: boolean;
  take?: number;
}

export enum AlarmPropertiesOptions {
  ID = 'ID',
  NAME = 'NAME',
  SEVERITY = 'SEVERITY',
  SEVERITY_LABEL = 'SEVERITY_LABEL',
  STATE = 'STATE',
  MESSAGE = 'MESSAGE',
  CREATED_AT = 'CREATED_AT',
  UPDATED_AT = 'UPDATED_AT',
  WORKSPACE = 'WORKSPACE',
}
