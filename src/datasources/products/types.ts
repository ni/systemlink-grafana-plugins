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
  id = 'id',
  partNumber = 'partNumber',
  name = 'name',
  family = 'family',
  updatedAt = 'updatedAt',
  workspace = 'workspace',
  keywords = 'keywords',
  properties = 'properties',
  fileIds = 'fileIds',
}

export const PropertiesOptions = {
  ID: Properties.id,
  PART_NUMBER: Properties.partNumber,
  NAME: Properties.name,
  FAMILY: Properties.family,
  UPDATEDAT: Properties.updatedAt,
  WORKSPACE: Properties.workspace,
  KEYWORDS: Properties.keywords,
  PROPERTIES: Properties.properties,
  FILE_IDS: Properties.fileIds,
};

export const productsProjectionLabelLookup: Record<Properties, {
  label: string;
  projection: Properties;}> = {
  [Properties.id]: { label: 'Product ID', projection: Properties.id},
  [Properties.partNumber]: { label: 'Part number', projection: Properties.partNumber },
  [Properties.name]: { label: 'Product name', projection: Properties.name },
  [Properties.family]: { label: 'Family', projection: Properties.family },
  [Properties.updatedAt]: { label: 'Updated at', projection: Properties.updatedAt },
  [Properties.workspace]: { label: 'Workspace', projection: Properties.workspace },
  [Properties.keywords]: { label: 'Keywords', projection: Properties.keywords },
  [Properties.properties]: { label: 'Properties', projection: Properties.properties },
  [Properties.fileIds]: { label: 'File IDs', projection: Properties.fileIds },
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
