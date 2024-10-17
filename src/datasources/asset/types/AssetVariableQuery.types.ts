import { DataQuery } from '@grafana/schema'

export interface AssetVariableQuery extends DataQuery {
  filter: string;
}
