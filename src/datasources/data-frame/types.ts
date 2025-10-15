import { DataQuery } from '@grafana/schema';
import { SystemLinkError } from "../../core/types";
import { DataSourceJsonData, QueryEditorProps } from '@grafana/data';
import { DataFrameDataSourceV1 } from './datasources/v1/DataFrameDataSourceV1';

export enum DataFrameQueryType {
  Data = 'Data',
  Properties = 'Properties',
}

export interface DataFrameQueryV1 extends DataQuery {
  type: DataFrameQueryType;
  tableId?: string;
  columns?: string[];
  decimationMethod?: string;
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

export type ValidDataFrameQueryV1 = DataFrameQueryV1 & Required<Omit<DataFrameQueryV1, keyof DataQuery>>;

export type ColumnDataType = 'BOOL' | 'INT32' | 'INT64' | 'FLOAT32' | 'FLOAT64' | 'STRING' | 'TIMESTAMP';

export type PropsV1 = QueryEditorProps<DataFrameDataSourceV1, DataFrameQueryV1, DataFrameDataSourceOptions>;

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
