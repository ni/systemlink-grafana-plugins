import { DataSourcePlugin } from '@grafana/data';
import { DataFrameDataSource } from './DataFrameDataSource';
import { DataFrameQueryEditor } from './components/DataFrameQueryEditor';
import { getConfigEditor } from 'core/components/HttpConfigEditor';
import { DataFrameVariableQueryEditor } from './components/DataFrameVariableQueryEditor';

export const plugin = new DataSourcePlugin(DataFrameDataSource)
  .setConfigEditor(getConfigEditor(false))
  .setQueryEditor(DataFrameQueryEditor)
  .setVariableQueryEditor(DataFrameVariableQueryEditor);
