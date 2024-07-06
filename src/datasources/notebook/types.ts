import { DataSourceJsonData } from '@grafana/data';
import { DataQuery } from '@grafana/schema'

export interface NotebookDataSourceOptions extends DataSourceJsonData {
  isServer?: boolean;
}

export interface NotebookQuery extends DataQuery {
  parameters: any;
  output: string
  cacheTimeout: number;

  // Server
  path?: string;

  // Enterprise
  id?: string;
  workspace?: string;

  queryText?: string;
  constant?: number;
}

export interface PagedWebapps {
  continuationToken: string;
  webapps: any[];
}

