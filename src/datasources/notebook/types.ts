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
  parameters: any;
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
  parameters: { [key: string]: any };
  metadata: { [key: string]: any };
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
  parameters: { [key: string]: any };
  status: ExecutionStatus;
  result: any;
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
