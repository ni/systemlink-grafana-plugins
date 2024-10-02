import { DataSourcePlugin } from '@grafana/data';
import { AssetDataSource } from './AssetDataSource';
import { AssetQueryEditor } from './components/AssetQueryEditor';
import { HttpConfigEditor } from 'core/components/HttpConfigEditor';
import { AssetVariableQueryEditor } from "./components/AssetVariableQueryEditor";

export const plugin = new DataSourcePlugin(AssetDataSource)
  .setConfigEditor(HttpConfigEditor)
  .setQueryEditor(AssetQueryEditor)
  .setVariableQueryEditor(AssetVariableQueryEditor);
