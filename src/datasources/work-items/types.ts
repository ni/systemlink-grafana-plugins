import { DataSourceJsonData } from '@grafana/data';
import { DataQuery } from '@grafana/schema';

export interface WorkItemsDataSourceOptions extends DataSourceJsonData {
}

export interface WorkItemsQuery extends DataQuery {
  init?: boolean;
}
