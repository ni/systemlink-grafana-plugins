import { DataQuery } from '@grafana/schema'

export interface SystemQuery extends DataQuery {
  queryText?: string;
  constant: number;
}
