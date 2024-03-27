import { DataQuery } from '@grafana/schema'

export interface ProductQuery extends DataQuery {
  partNumber: string;
}

export interface QueryProductsResponse {
  products: Product[];
}

export interface Product {
  id: string;
  partNumber: string;
  name: string;
  family: string;
  updatedAt: Date;
  keywords: any;
  properties: any;
  fileIds: string[];
}
