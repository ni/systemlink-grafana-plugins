import { DataQuery, DataSourceJsonData } from '@grafana/data';

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
export interface NotebookDataSourceOptions extends DataSourceJsonData {}

/**
 * Value that is used in the backend, but never sent over HTTP to the frontend
 */
export interface NotebookSecureJsonData {}

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

export interface Execution {
  notebookId: string;
  parameters: { [key: string]: any };
  status: 'QUEUED' | 'IN_PROGRESS' | 'FAILED' | 'SUCCEEDED' | 'CANCELED' | 'TIMED_OUT';
  result: any;
  cachedResult: boolean;
  exception: string | undefined;
  errorCode: "NO_ERROR" | "NOTEBOOK_ERROR" | "NOTEBOOK_TIMEOUT_ERROR" | "NOTEBOOK_NOT_FOUND_ERROR" | "NOTEBOOK_RESULT_TOO_BIG_ERROR" | "NOT_PUBLISHED_ERROR" | "OUT_OF_MEMORY_ERROR" | "UNKNOWN_ERROR" | undefined;
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
