import { DataSourcePlugin } from '@grafana/data';
import { DataFrameDataSource } from './DataFrameDataSource';
import { DataFrameQueryEditorWrapper } from './components/DataFrameQueryEditorWrapper';
import { DataFrameVariableQueryEditorWrapper } from './components/DataFrameVariableQueryEditorWrapper';
import { DataFrameConfigEditor } from './components/DataFrameConfigEditor';

export const plugin = new DataSourcePlugin(DataFrameDataSource)
  .setConfigEditor(DataFrameConfigEditor)
  .setQueryEditor(DataFrameQueryEditorWrapper)
  .setVariableQueryEditor(DataFrameVariableQueryEditorWrapper);
