import { DataQuery } from '@grafana/schema'

export interface ProductEntitiesCountQuery extends DataQuery {
  queryText?: string;
  constant: number;
}

export interface QueryCountResponse {
  totalCount: number;
}

export interface QuerySpecsResponse {
  specs: any[];
}
