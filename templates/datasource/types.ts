import { DataQuery } from '@grafana/schema'

export interface MyQuery extends DataQuery {
  queryText?: string;
  constant: number;
}
