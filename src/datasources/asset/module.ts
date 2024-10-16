import { DataSourcePlugin } from '@grafana/data';
import { AssetDataSource } from './AssetDataSource';
import { AssetQueryEditor } from './components/AssetQueryEditor';
import { AssetDataSourceOptions, AssetQuery } from './types/types';
import { AssetConfigEditor } from './AssetConfigEditor';


export const plugin = new DataSourcePlugin<AssetDataSource, AssetQuery, AssetDataSourceOptions>(AssetDataSource)
  .setConfigEditor(AssetConfigEditor)
  .setQueryEditor(AssetQueryEditor);
