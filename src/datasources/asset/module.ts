import { DataSourcePlugin } from '@grafana/data';
import { AssetDataSource } from './AssetDataSource';
import { AssetQueryEditor } from './components/AssetQueryEditor';
import { HttpConfigEditor } from 'core/components/HttpConfigEditor';

export const plugin = new DataSourcePlugin(AssetDataSource)
  .setConfigEditor(HttpConfigEditor)
  .setQueryEditor(AssetQueryEditor);
