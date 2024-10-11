import { DataQuery } from '@grafana/schema'

export interface ProductsQuery extends DataQuery {
  properties?: Properties[];
  queryBy?: string;
  workspace?: string;
  orderBy?: any;
  descending?: boolean;
  recordCount?: number;
}

export enum Properties {
  id = 'ID',
  partNumber = 'PART_NUMBER',
  name = 'NAME',
  family = 'FAMILY',
  updatedAt = 'UPDATED_AT',
  workspace = 'WORKSPACE',
  keywords = 'KEYWORDS',
  properties = 'PROPERTIES',
  fileIds = 'FILE_IDS',
}
