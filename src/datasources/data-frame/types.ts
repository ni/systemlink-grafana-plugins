import { DataQuery } from '@grafana/schema';
import { SystemLinkError } from "../../core/types";

export enum DataFrameQueryType {
  Data = 'Data',
  Metadata = 'Metadata',
}

export interface DataFrameQuery extends DataQuery {
  type: DataFrameQueryType;
  tableId?: string;
  columns?: string[];
  decimationMethod?: string;
  filterNulls?: boolean;
  applyTimeFilters?: boolean;
  queryBy?: string;
  properties?: string[];
}

export const defaultQuery: Omit<ValidDataFrameQuery, 'refId'> = {
  type: DataFrameQueryType.Data,
  tableId: '',
  columns: [],
  decimationMethod: 'LOSSY',
  filterNulls: false,
  applyTimeFilters: false,
  queryBy: '',
  properties: [],
};

export type ValidDataFrameQuery = DataFrameQuery & Required<Omit<DataFrameQuery, keyof DataQuery>>;

export type ColumnDataType = 'BOOL' | 'INT32' | 'INT64' | 'FLOAT32' | 'FLOAT64' | 'STRING' | 'TIMESTAMP';

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

export interface TableMetadata {
  columns: Column[];
  id: string;
  name: string;
  workspace: string;
  properties: Record<string, string>;
}

export interface TableMetadataList {
  tables: TableMetadata[];
  continuationToken: string;
}

export interface TableDataRows {
  frame: { columns: string[]; data: string[][] };
}

export function isSystemLinkError(error: any): error is SystemLinkError {
  return Boolean(error?.error?.code) && Boolean(error?.error?.name);
}
