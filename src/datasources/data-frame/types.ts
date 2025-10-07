import { DataQuery } from '@grafana/schema';
import { SystemLinkError } from "../../core/types";
import { DataSourceJsonData, QueryEditorProps } from '@grafana/data';
import { DataFrameDataSource } from './DataFrameDataSource';

export enum DataFrameQueryType {
  Data = 'Data',
  Properties = 'Properties',
}

export interface DataFrameQuery extends DataQuery {
  type: DataFrameQueryType;
  tableId?: string;
  columns?: string[];
  decimationMethod?: string;
  filterNulls?: boolean;
  applyTimeFilters?: boolean;
}

export const defaultQuery: Omit<ValidDataFrameQuery, 'refId'> = {
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

export const DataTableProjectionLabelLookup: Record<DataTableProperties, {
  label: string,
  projection: readonly DataTableProjections[]
}> = {
  [DataTableProperties.Name]: {
    label: 'Data table name',
    projection: [DataTableProjections.Name],
  },
  [DataTableProperties.Id]: {
    label: 'Data table ID',
    projection: [DataTableProjections.Id],
  },
  [DataTableProperties.RowCount]: {
    label: 'Number of rows',
    projection: [DataTableProjections.RowCount],
  },
  [DataTableProperties.ColumnCount]: {
    label: 'Number of columns',
    projection: [DataTableProjections.columnCount],
  },
  [DataTableProperties.CreatedAt]: {
    label: 'Created at',
    projection: [DataTableProjections.CreatedAt],
  },
  [DataTableProperties.Workspace]: {
    label: 'Workspace',
    projection: [DataTableProjections.Workspace],
  },
  [DataTableProperties.MetadataModifiedAt]: {
    label: 'Metadata modified at',
    projection: [DataTableProjections.MetadataModifiedAt],
  },
  [DataTableProperties.MetadataRevision]: {
    label: 'Metadata revision',
    projection: [DataTableProjections.MetadataRevision],
  },
  [DataTableProperties.RowsModifiedAt]: {
    label: 'Rows modified at',
    projection: [DataTableProjections.RowsModifiedAt],
  },
  [DataTableProperties.ColumnName]: {
    label: 'Column name',
    projection: [DataTableProjections.ColumnName],
  },
  [DataTableProperties.ColumnDataType]: {
    label: 'Column data type',
    projection: [DataTableProjections.ColumnDataType],
  },
  [DataTableProperties.ColumnType]: {
    label: 'Column type',
    projection: [DataTableProjections.ColumnType],
  },
  [DataTableProperties.ColumnProperties]: {
    label: 'Column properties',
    projection: [DataTableProjections.ColumnProperties],
  },
  [DataTableProperties.SupportsAppend]: {
    label: 'Supports append',
    projection: [DataTableProjections.SupportsAppend],
  },
  [DataTableProperties.Properties]: {
    label: 'Properties',
    projection: [DataTableProjections.Properties],
  },
}

export type ValidDataFrameQuery = DataFrameQuery & Required<Omit<DataFrameQuery, keyof DataQuery>>;

export type ColumnDataType = 'BOOL' | 'INT32' | 'INT64' | 'FLOAT32' | 'FLOAT64' | 'STRING' | 'TIMESTAMP';

export type Props = QueryEditorProps<DataFrameDataSource, DataFrameQuery, DataFrameDataSourceOptions>;

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
  frame: { columns: string[]; data: string[][] };
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
