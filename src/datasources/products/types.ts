import { DataQuery } from '@grafana/schema'

export interface ProductsQuery extends DataQuery {
  properties?: Properties[];
  queryBy: string;
  partNumber?: string;
  tags?: string[];
  family?: string;
  workspace?: string;
  orderBy?: any;
  descending?: boolean;
  recordCount?: number;
}

export enum ProductsQueryType {
  Products = 'Products',
  Summary = 'Summary',
}

export interface ProductsVariableQuery {
  queryBy: string;
}

export enum ProductQueryOutput {
  EntityCounts = 'Entity Counts',
  TestResultsCountByStatus = 'Test Results Count By Status',
  TestPlansCountByState = 'Test Plans Count By State',
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


export const PropertiesType = [
  {
    value: 'ID',
    label: 'ID',
    description: `ID of the product`,
  },
  {
    value: 'PART_NUMBER',
    label: 'Part Number',
    description: `PartNumber of the product`,
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
    description: `Updated At of the product`,
  },
  {
    value: 'KEYWORDS',
    label: 'Keywords',
    description: `Keywords of the product`,
  },
  {
    value: 'PROPERTIES',
    label: 'Properties',
    description: `Properties of the product`,
  },
  {
    value: 'FILE_IDS',
    label: 'File IDs',
    description: `File IDs of the product`,
  }
];

export const OrderBy = [
  {
    value: 'ID',
    label: 'ID',
    description: `ID of the product`,
  },
  {
    value: 'PART_NUMBER',
    label: 'Part Number',
    description: `PartNumber of the product`,
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
    description: `Updated At of the product`,
  },
]

export interface QueryProductResponse {
  products: ProductsProperties[],
  continuationToken: string,
  totalCount: number
}

export interface ProductsProperties {
  id: string;
  partNumber: string;
  name: string;
  family: string;
  updatedAt: string;
  workspace: string;
  keywords: any;
  properties: any;
  fileIds: string[];
  returnCount: number;
}
