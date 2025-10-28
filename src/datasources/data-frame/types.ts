import { DataQuery } from '@grafana/schema';
import { QueryBuilderOption, SystemLinkError } from "../../core/types";
import { DataSourceJsonData, QueryEditorProps } from '@grafana/data';
import { DataFrameDataSource } from './DataFrameDataSource';
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
  filter?: string;
  type: DataFrameQueryType;
  columns?: string[];
  decimationMethod?: string;
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

export const defaultQueryV2: Omit<ValidDataFrameQueryV2, 'refId'> = {
  filter: '',
  type: DataFrameQueryType.Data,
  columns: [],
  decimationMethod: 'LOSSY',
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
  columnCount = 'COLUMN_COUNT',
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

export const DataTableProjectionLabelLookup: Record<DataTableProperties, {
  label: string,
  projection: readonly DataTableProjections[],
  type: DataTableProjectionType;
}> = {
  [DataTableProperties.Name]: {
    label: 'Data table name',
    projection: [DataTableProjections.Name],
    type: DataTableProjectionType.DataTable
  },
  [DataTableProperties.Id]: {
    label: 'Data table ID',
    projection: [DataTableProjections.Id],
    type: DataTableProjectionType.DataTable
  },
  [DataTableProperties.RowCount]: {
    label: 'Rows',
    projection: [DataTableProjections.RowCount],
    type: DataTableProjectionType.DataTable
  },
  [DataTableProperties.ColumnCount]: {
    label: 'Columns',
    projection: [DataTableProjections.columnCount],
    type: DataTableProjectionType.DataTable
  },
  [DataTableProperties.CreatedAt]: {
    label: 'Created',
    projection: [DataTableProjections.CreatedAt],
    type: DataTableProjectionType.DataTable
  },
  [DataTableProperties.Workspace]: {
    label: 'Workspace',
    projection: [DataTableProjections.Workspace],
    type: DataTableProjectionType.DataTable
  },
  [DataTableProperties.MetadataModifiedAt]: {
    label: 'Metadata modified',
    projection: [DataTableProjections.MetadataModifiedAt],
    type: DataTableProjectionType.DataTable
  },
  [DataTableProperties.MetadataRevision]: {
    label: 'Metadata revision',
    projection: [DataTableProjections.MetadataRevision],
    type: DataTableProjectionType.DataTable
  },
  [DataTableProperties.RowsModifiedAt]: {
    label: 'Rows modified',
    projection: [DataTableProjections.RowsModifiedAt],
    type: DataTableProjectionType.DataTable
  },
  [DataTableProperties.ColumnName]: {
    label: 'Column name',
    projection: [DataTableProjections.ColumnName],
    type: DataTableProjectionType.Column
  },
  [DataTableProperties.ColumnDataType]: {
    label: 'Column data type',
    projection: [DataTableProjections.ColumnDataType],
    type: DataTableProjectionType.Column
  },
  [DataTableProperties.ColumnType]: {
    label: 'Column type',
    projection: [DataTableProjections.ColumnType],
    type: DataTableProjectionType.Column
  },
  [DataTableProperties.ColumnProperties]: {
    label: 'Column properties',
    projection: [DataTableProjections.ColumnProperties],
    type: DataTableProjectionType.Column
  },
  [DataTableProperties.SupportsAppend]: {
    label: 'Supports append',
    projection: [DataTableProjections.SupportsAppend],
    type: DataTableProjectionType.DataTable
  },
  [DataTableProperties.Properties]: {
    label: 'Data table properties',
    projection: [DataTableProjections.Properties],
    type: DataTableProjectionType.DataTable
  },
};
export type ValidDataFrameQuery = ValidDataFrameQueryV1 | ValidDataFrameQueryV2;

export type ValidDataFrameQueryV1 = DataFrameQueryV1 & Required<Omit<DataFrameQueryV1, keyof DataQuery>>;

export type ValidDataFrameQueryV2 = DataFrameQueryV2 & Required<Omit<DataFrameQueryV2, keyof DataQuery>>;

export type ColumnDataType = 'BOOL' | 'INT32' | 'INT64' | 'FLOAT32' | 'FLOAT64' | 'STRING' | 'TIMESTAMP';

export type Props = PropsV1 | PropsV2;

export type PropsV1 = QueryEditorProps<DataFrameDataSource, DataFrameQueryV1, DataFrameDataSourceOptions>;

export type PropsV2 = QueryEditorProps<DataFrameDataSource, DataFrameQuery, DataFrameDataSourceOptions>;

export type DataTableDataSourceCallback = (query: string) => Promise<QueryBuilderOption[]>;

export type DataSourceCallback = (query: string, callback: Function) => Promise<void>;

export interface QBFieldWithDataSourceCallback extends QueryBuilderField {
  lookup?: {
    readonly?: boolean;
    dataSource?: DataSourceCallback;
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
