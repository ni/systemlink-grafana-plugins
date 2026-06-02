import { DataSourcePlugin } from '@grafana/data';
import { DataFrameDataSource } from './DataFrameDataSource';
import { DataFrameQueryEditorWrapper } from './components/DataFrameQueryEditorWrapper';
import { DataFrameVariableQueryEditorWrapper } from './components/DataFrameVariableQueryEditorWrapper';
import { HttpConfigEditor } from 'core/components/HttpConfigEditor';

export const plugin = new DataSourcePlugin(DataFrameDataSource)
  .setConfigEditor(HttpConfigEditor)
  .setQueryEditor(DataFrameQueryEditorWrapper)
  .setVariableQueryEditor(DataFrameVariableQueryEditorWrapper);
