import { DataSourcePlugin } from '@grafana/data';
import { DataFrameQueryEditorWrapper } from './components/DataFrameQueryEditorWrapper';
import { DataFrameVariableQueryEditorWrapper } from './components/DataFrameVariableQueryEditorWrapper';
import { DataFrameConfigEditor } from './components/DataFrameConfigEditor';
import { DataFrameDataSource } from './DataFrameDataSource';

export const plugin = new DataSourcePlugin(DataFrameDataSource)
  .setConfigEditor(DataFrameConfigEditor)
  .setQueryEditor(DataFrameQueryEditorWrapper)
  .setVariableQueryEditor(DataFrameVariableQueryEditorWrapper);
