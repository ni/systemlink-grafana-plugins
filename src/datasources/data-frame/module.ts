import { DataSourcePlugin } from '@grafana/data';
import { DataFrameDataSource } from './DataFrameDataSource';
import { DataFrameQueryEditor } from './components/DataFrameQueryEditor';
import { HttpConfigEditor } from 'core/HttpConfigEditor';

export const plugin = new DataSourcePlugin(DataFrameDataSource)
  .setConfigEditor(HttpConfigEditor)
  .setQueryEditor(DataFrameQueryEditor);
