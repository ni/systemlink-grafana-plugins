import { DataQuery } from '@grafana/schema'

export interface TagQuery extends DataQuery {
  queryText?: string;
  constant: number;
}
