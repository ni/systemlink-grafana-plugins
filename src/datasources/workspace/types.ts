import { DataQuery } from '@grafana/schema'

export interface WorkspaceQuery extends DataQuery {
  queryText?: string;
  constant: number;
}
