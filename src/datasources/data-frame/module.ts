import { DataSourcePlugin } from '@grafana/data';
import { DataFrameDataSource } from './DataFrameDataSource';
import { DataFrameConfigEditor } from './components/DataFrameConfigEditor';
import { DataFrameVariableQueryEditorV2 } from './components/v2/DataFrameVariableQueryEditorV2';
import { DataFrameQueryEditorV2 } from './components/v2/DataFrameQueryEditorV2';

export const plugin = new DataSourcePlugin(DataFrameDataSource)
  .setConfigEditor(DataFrameConfigEditor)
  .setQueryEditor(DataFrameQueryEditorV2)
  .setVariableQueryEditor(DataFrameVariableQueryEditorV2);
