import { DataSourcePlugin } from '@grafana/data';
import { AssetDataSource } from './AssetDataSource';
import { AssetQueryEditor } from './components/AssetQueryEditor';
import { AssetDataSourceOptions, AssetQuery } from './types/types';
import { AssetConfigEditor } from './AssetConfigEditor';
import { AssetVariableQueryEditor } from './components/variable-editor/AssetVariableQueryEditor';


export const plugin = new DataSourcePlugin<AssetDataSource, AssetQuery, AssetDataSourceOptions>(AssetDataSource)
  .setConfigEditor(AssetConfigEditor)
  .setQueryEditor(AssetQueryEditor)
  .setVariableQueryEditor(AssetVariableQueryEditor);
