import { DataQuery } from '@grafana/schema'

export interface TestInsightQuery extends DataQuery {
  type: TestInsightQueryType;
  family: string;
  partNumber: string;
  name: string;
  workspace: string;
}

export enum TestInsightQueryType {
  Products = 'Products',
  Results = 'Results'
}

export interface ProductsMetaData {
  id: string;
  partNumber: string;
  name: string;
  family: string;
  updatedAt: string;
}
