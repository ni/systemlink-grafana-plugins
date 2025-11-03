import { DataQuery } from '@grafana/schema';
import { QueryBuilderOption, SystemLinkError } from "../../core/types";
import { DataSourceJsonData, QueryEditorProps } from '@grafana/data';
import { DataFrameDataSource } from './DataFrameDataSource';
import { TAKE_LIMIT } from './constants';
import { QueryBuilderField } from 'smart-webcomponents-react';

export enum DataFrameQueryType {
  Data = 'Data',
  Properties = 'Properties',
}

export type DataFrameQuery = DataFrameQueryV1 | DataFrameQueryV2;

export interface DataFrameQueryV1 extends DataQuery {
  type: DataFrameQueryType;
  tableId?: string;
  columns?: string[];
  decimationMethod?: string;
  filterNulls?: boolean;
  applyTimeFilters?: boolean;
}

export interface DataFrameQueryV2 extends DataQuery {
  type: DataFrameQueryType;
  dataTableFilter?: string;
  dataTableProperties?: DataTableProperties[];
  columnProperties?: DataTableProperties[];
  take?: number;
  columns?: string[];
  decimationMethod?: string;
  xColumn?: string | null;
  includeIndexColumns?: boolean;
  filterNulls?: boolean;
  applyTimeFilters?: boolean;
}

export const defaultQueryV1: Omit<ValidDataFrameQueryV1, 'refId'> = {
  type: DataFrameQueryType.Data,
  tableId: '',
  columns: [],
  decimationMethod: 'LOSSY',
  filterNulls: false,
  applyTimeFilters: false
};

export const DataFrameFeatureTogglesDefaults: DataFrameFeatureToggles = {
  queryByDataTableProperties: false,
};

export enum DataTableProperties {
  Name = 'Name',
  Id = 'Id',
  RowCount = 'RowCount',
  ColumnCount = 'ColumnCount',
  CreatedAt = 'CreatedAt',
  Workspace = 'Workspace',
  MetadataModifiedAt = 'MetadataModifiedAt',
  MetadataRevision = 'MetadataRevision',
  RowsModifiedAt = 'RowsModifiedAt',
  ColumnName = 'ColumnName',
  ColumnDataType = 'ColumnDataType',
  ColumnType = 'ColumnType',
  ColumnProperties = 'ColumnProperties',
  SupportsAppend = 'SupportsAppend',
  Properties = 'Properties'
}

export enum DataTableProjections {
  Name = 'NAME',
  Id = 'ID',
  RowCount = 'ROW_COUNT',
  ColumnCount = 'COLUMN_COUNT',
  CreatedAt = 'CREATED_AT',
  Workspace = 'WORKSPACE',
  MetadataModifiedAt = 'METADATA_MODIFIED_AT',
  MetadataRevision = 'METADATA_REVISION',
  RowsModifiedAt = 'ROWS_MODIFIED_AT',
  ColumnName = 'COLUMN_NAME',
  ColumnDataType = 'COLUMN_DATA_TYPE',
  ColumnType = 'COLUMN_COLUMN_TYPE',
  ColumnProperties = 'COLUMN_PROPERTIES',
  SupportsAppend = 'SUPPORTS_APPEND',
  Properties = 'PROPERTIES'
}

export enum DataTableProjectionType {
  DataTable = 'dataTable',
  Column = 'column'
}

export const defaultDatatableProperties: DataTableProperties[] = [
  DataTableProperties.Name,
  DataTableProperties.Id,
  DataTableProperties.RowCount,
  DataTableProperties.ColumnCount,
  DataTableProperties.CreatedAt,
  DataTableProperties.Workspace
];

export const defaultQueryV2: Omit<ValidDataFrameQueryV2, 'refId'> = {
  type: DataFrameQueryType.Data,
  dataTableFilter: '',
  dataTableProperties: defaultDatatableProperties,
  columnProperties: [],
  take: TAKE_LIMIT,
  columns: [],
  decimationMethod: 'LOSSY',
  xColumn: null,
  includeIndexColumns: false,
  filterNulls: false,
  applyTimeFilters: false
};

export const DataTableProjectionLabelLookup: Record<DataTableProperties, {
  label: string,
  projection: DataTableProjections,
  type: DataTableProjectionType,
  field: string;
}> = {
  [DataTableProperties.Name]: {
    label: 'Data table name',
    projection: DataTableProjections.Name,
    type: DataTableProjectionType.DataTable,
    field: 'name'
  },
  [DataTableProperties.Id]: {
    label: 'Data table ID',
    projection: DataTableProjections.Id,
    type: DataTableProjectionType.DataTable,
    field: 'id'
  },
  [DataTableProperties.RowCount]: {
    label: 'Rows',
    projection: DataTableProjections.RowCount,
    type: DataTableProjectionType.DataTable,
    field: 'rowCount'
  },
  [DataTableProperties.ColumnCount]: {
    label: 'Columns',
    projection: DataTableProjections.ColumnCount,
    type: DataTableProjectionType.DataTable,
    field: 'columnCount'
  },
  [DataTableProperties.CreatedAt]: {
    label: 'Created',
    projection: DataTableProjections.CreatedAt,
    type: DataTableProjectionType.DataTable,
    field: 'createdAt'
  },
  [DataTableProperties.Workspace]: {
    label: 'Workspace',
    projection: DataTableProjections.Workspace,
    type: DataTableProjectionType.DataTable,
    field: 'workspace'
  },
  [DataTableProperties.MetadataModifiedAt]: {
    label: 'Metadata modified',
    projection: DataTableProjections.MetadataModifiedAt,
    type: DataTableProjectionType.DataTable,
    field: 'metadataModifiedAt'
  },
  [DataTableProperties.MetadataRevision]: {
    label: 'Metadata revision',
    projection: DataTableProjections.MetadataRevision,
    type: DataTableProjectionType.DataTable,
    field: 'metadataRevision'
  },
  [DataTableProperties.RowsModifiedAt]: {
    label: 'Rows modified',
    projection: DataTableProjections.RowsModifiedAt,
    type: DataTableProjectionType.DataTable,
    field: 'rowsModifiedAt'
  },
  [DataTableProperties.ColumnName]: {
    label: 'Column name',
    projection: DataTableProjections.ColumnName,
    type: DataTableProjectionType.Column,
    field: 'name'
  },
  [DataTableProperties.ColumnDataType]: {
    label: 'Column data type',
    projection: DataTableProjections.ColumnDataType,
    type: DataTableProjectionType.Column,
    field: 'dataType'
  },
  [DataTableProperties.ColumnType]: {
    label: 'Column type',
    projection: DataTableProjections.ColumnType,
    type: DataTableProjectionType.Column,
    field: 'columnType'
  },
  [DataTableProperties.ColumnProperties]: {
    label: 'Column properties',
    projection: DataTableProjections.ColumnProperties,
    type: DataTableProjectionType.Column,
    field: 'properties'
  },
  [DataTableProperties.SupportsAppend]: {
    label: 'Supports append',
    projection: DataTableProjections.SupportsAppend,
    type: DataTableProjectionType.DataTable,
    field: 'supportsAppend'
  },
  [DataTableProperties.Properties]: {
    label: 'Data table properties',
    projection: DataTableProjections.Properties,
    type: DataTableProjectionType.DataTable,
    field: 'properties'
  },
};

export type ValidDataFrameQuery = ValidDataFrameQueryV1 | ValidDataFrameQueryV2;

export type ValidDataFrameQueryV1 = DataFrameQueryV1 & Required<Omit<DataFrameQueryV1, keyof DataQuery>>;

export type ValidDataFrameQueryV2 = DataFrameQueryV2 & Required<Omit<DataFrameQueryV2, keyof DataQuery>>;

export type ColumnDataType = 'BOOL' | 'INT32' | 'INT64' | 'FLOAT32' | 'FLOAT64' | 'STRING' | 'TIMESTAMP';

export type Props = PropsV1 | PropsV2;

export type PropsV1 = QueryEditorProps<DataFrameDataSource, DataFrameQueryV1, DataFrameDataSourceOptions>;

export type PropsV2 = QueryEditorProps<DataFrameDataSource, DataFrameQuery, DataFrameDataSourceOptions>;

export type DataSourceQBLookupCallback = (query: string) => Promise<QueryBuilderOption[]>;

export type QBFieldLookupCallback = (query: string, callback: Function) => Promise<void>;

export interface QBFieldWithDataSourceCallback extends QueryBuilderField {
  lookup?: {
    readonly?: boolean;
    dataSource?: QBFieldLookupCallback;
  },
}

export interface Column {
  name: string;
  dataType: ColumnDataType;
  columnType: 'INDEX' | 'NULLABLE' | 'NORMAL';
  properties: Record<string, string>;
}

export interface ColumnFilter {
  column: string;
  operation:
  | 'EQUALS'
  | 'LESS_THAN'
  | 'LESS_THAN_EQUALS'
  | 'GREATER_THAN'
  | 'GREATER_THAN_EQUALS'
  | 'NOT_EQUALS'
  | 'CONTAINS'
  | 'NOT_CONTAINS';
  value: string | null;
}

export interface TableProperties {
  columns: Column[];
  id: string;
  name: string;
  workspace: string;
  properties: Record<string, string>;
}

export interface TablePropertiesList {
  tables: TableProperties[];
  continuationToken: string;
}

export interface TableDataRows {
  frame: { columns: string[]; data: string[][]; };
}

export interface DataFrameFeatureToggles {
  queryByDataTableProperties: boolean;
}

export interface DataFrameDataSourceOptions extends DataSourceJsonData {
  featureToggles: DataFrameFeatureToggles;
}

export function isSystemLinkError(error: any): error is SystemLinkError {
  return Boolean(error?.error?.code) && Boolean(error?.error?.name);
}
