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
