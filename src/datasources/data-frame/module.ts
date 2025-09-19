import { DataSourcePlugin } from '@grafana/data';
import { DataFrameDataSource } from './DataFrameDataSource';
import { DataFrameQueryEditorWrapper } from './components/DataFrameQueryEditorWrapper';
import { DataFrameVariableQueryEditor } from './components/DataFrameVariableQueryEditor';
import { DataFrameConfigEditor } from './components/DataFrameConfigEditor';

export const plugin = new DataSourcePlugin(DataFrameDataSource)
  .setConfigEditor(DataFrameConfigEditor)
  .setQueryEditor(DataFrameQueryEditorWrapper)
  .setVariableQueryEditor(DataFrameVariableQueryEditor);
