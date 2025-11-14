import { DataQuery, DataSourceJsonData } from '@grafana/data';

export enum ExecutionStatus {
  QUEUED = 'QUEUED',
  IN_PROGRESS = 'IN_PROGRESS',
  FAILED = 'FAILED',
  SUCCEEDED = 'SUCCEEDED',
  CANCELED = 'CANCELED',
  TIMED_OUT = 'TIMED_OUT',
}

export interface NotebookQuery extends DataQuery {
  id: string;
  workspace: string;
  parameters: Record<string, any>;
  output: string;
  cacheTimeout: number;
}

export const defaultQuery: Partial<NotebookQuery> = {
  id: '',
  workspace: '',
  parameters: {},
  output: '',
  cacheTimeout: 86400,
};

/**
 * These are options configured for each DataSource instance
 */
export interface NotebookDataSourceOptions extends DataSourceJsonData { }

/**
 * Value that is used in the backend, but never sent over HTTP to the frontend
 */
export interface NotebookSecureJsonData { }

export interface Notebook {
  id: string;
  name: string;
  workspace: string;
}

export interface NotebookWithMetadata extends Notebook {
  parameters: Record<string, any>;
  metadata: Record<string, any>;
}

export const isNotebookWithMeta = (notebook: Notebook | NotebookWithMetadata): notebook is NotebookWithMetadata =>
  (notebook as NotebookWithMetadata).metadata !== undefined;

export enum ErrorCode {
  NO_ERROR = 'NO_ERROR',
  NOTEBOOK_ERROR = 'NOTEBOOK_ERROR',
  NOTEBOOK_TIMEOUT_ERROR = 'NOTEBOOK_TIMEOUT_ERROR',
  NOTEBOOK_NOT_FOUND_ERROR = 'NOTEBOOK_NOT_FOUND_ERROR',
  NOTEBOOK_RESULT_TOO_BIG_ERROR = 'NOTEBOOK_RESULT_TOO_BIG_ERROR',
  NOT_PUBLISHED_ERROR = 'NOT_PUBLISHED_ERROR',
  OUT_OF_MEMORY_ERROR = 'OUT_OF_MEMORY_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export interface Execution {
  notebookId: string;
  parameters: Record<string, any>;
  status: ExecutionStatus;
  result: ExecutionResult;
  cachedResult: boolean;
  exception: string | undefined;
  errorCode: ErrorCode | undefined;
}

export enum ExecutionPriority {
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
  HIGH = 'HIGH',
}

export interface Parameter {
  id: string;
  display_name: string;
  type: string;
  options?: string[];
}

export enum ResultType {
  DATA_FRAME = 'data_frame',
  ARRAY = 'array',
  SCALAR = 'scalar',
}

export enum DataFrameFormat {
  XY = 'XY',
  INDEX = 'INDEX',
}

export interface NotebookDataFrame {
  format: DataFrameFormat;
  x?: any[];
  y: any[];
}

export interface TableColumn {
  name: string;
  type: 'string' | 'boolean' | 'number' | 'integer' | 'datetime';
  tz?: string;
}

export interface TableData {
  columns: TableColumn[];
  values: any[][];
}

export interface GraphConfig {
  plot_labels?: string[];
  axis_labels?: string[];
  tick_labels?: Array<{ x: number; label: string }>;
  title?: string;
}

export interface NotebookResultConfig {
  graph?: GraphConfig;
  title?: string;
}

export interface NotebookResult {
  id: string;
  type: ResultType;
  data?: NotebookDataFrame[] | TableData | any[];
  value?: any;
  config?: NotebookResultConfig;
}

export interface ExecutionResult {
  result: NotebookResult[];
}
