import { DataQuery } from '@grafana/schema'

export interface PartNumberQuery extends DataQuery {
}

export interface QueryProductsResponse {
  products: Product[];
}

export interface Product {
  partNumber: string;
  id: string;
}
