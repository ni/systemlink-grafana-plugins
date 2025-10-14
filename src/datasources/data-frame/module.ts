import { DataSourcePlugin } from '@grafana/data';
import { DataFrameDataSourceV1 } from './DataFrameDataSourceV1';
import { DataFrameQueryEditorWrapper } from './components/DataFrameQueryEditorWrapper';
import { DataFrameVariableQueryEditorWrapper } from './components/DataFrameVariableQueryEditorWrapper';
import { DataFrameConfigEditor } from './components/DataFrameConfigEditor';

export const plugin = new DataSourcePlugin(DataFrameDataSourceV1)
  .setConfigEditor(DataFrameConfigEditor)
  .setQueryEditor(DataFrameQueryEditorWrapper)
  .setVariableQueryEditor(DataFrameVariableQueryEditorWrapper);
