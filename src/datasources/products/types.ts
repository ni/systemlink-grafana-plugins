import { DataQuery } from '@grafana/schema'

export interface ProductQuery extends DataQuery {
  properties?: Properties[];
  orderBy?: string;
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

export const PropertiesOptions = {
  ID: 'id',
  PART_NUMBER: 'partNumber',
  NAME: 'name',
  FAMILY: 'family',
  UPDATEDAT: 'updatedAt',
  WORKSPACE: 'workspace',
  KEYWORDS: 'keywords',
  PROPERTIES: 'properties',
  FILE_IDS: 'fileIds',
};

export const OrderBy = [
  {
    value: 'ID',
    label: 'ID',
    description: `ID of the product`,
  },
  {
    value: 'PART_NUMBER',
    label: 'Part Number',
    description: `Part number of the product`,
  },
  {
    value: 'NAME',
    label: 'Product Name',
    description: `Name of the product`,
  },
  {
    value: 'FAMILY',
    label: 'Family',
    description: `Family of the product`,
  },
  {
    value: 'WORKSPACE',
    label: 'Workspace',
    description: `Workspace of the product`,
  },
  {
    value: 'UPDATED_AT',
    label: 'Updated At',
    description: `Latest update at time of the product`,
  }
];

export interface QueryProductResponse {
  products: ProductResponseProperties[],
  continuationToken: string,
  totalCount: number
}

export interface ProductResponseProperties {
  id: string;
  partNumber: string;
  name?: string;
  family?: string;
  updatedAt?: string;
  workspace?: string;
  keywords?: any;
  properties?: Object;
  fileIds?: string[];
  returnCount?: number;
}
