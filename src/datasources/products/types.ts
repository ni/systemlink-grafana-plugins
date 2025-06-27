import { DataQuery } from '@grafana/schema'
import { QueryBuilderField } from 'smart-webcomponents-react';

export interface ProductQuery extends DataQuery {
  properties?: Properties[];
  orderBy?: string;
  descending?: boolean;
  recordCount?: number;
  queryBy?: string;
}

export interface ProductVariableQuery extends DataQuery {
  queryBy?: string;
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

export const ProductPropertiesProjectionMap = {
  'Product ID': PropertiesOptions.ID,
  'Part number': PropertiesOptions.PART_NUMBER,
  'Product name': PropertiesOptions.NAME,
  'Family': PropertiesOptions.FAMILY,
  'Updated at': PropertiesOptions.UPDATEDAT,
  'Workspace': PropertiesOptions.WORKSPACE,
  'Keywords': PropertiesOptions.KEYWORDS,
  'Properties': PropertiesOptions.PROPERTIES,
  'File IDs': PropertiesOptions.FILE_IDS
}

export const OrderBy = [
  {
    value: 'UPDATED_AT',
    label: 'Updated At',
    description: `Latest update at time of the product`,
  },
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
];

export const DefaultProductsOrderBy = 'UPDATED_AT';

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

export interface QBField extends QueryBuilderField {
  lookup?: {
    readonly?: boolean;
    dataSource: Array<{
      label: string,
      value: string
    }>;
  },
}
