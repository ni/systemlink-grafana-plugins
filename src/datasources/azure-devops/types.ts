import { DataQuery } from '@grafana/schema'

export interface AzureDevopsQuery extends DataQuery {
  queryText?: string;
  constant: number;
}
