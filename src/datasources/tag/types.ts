import { DataQuery } from '@grafana/schema'

export interface TagQuery extends DataQuery {
  path: string;
}
