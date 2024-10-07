import { DataSourcePlugin } from '@grafana/data';
import { AssetDataSource } from './AssetDataSource';
import { AssetCoordonatorQueryEditor } from './components/AssetCoordonatorQueryEditor';
import { HttpConfigEditor } from 'core/components/HttpConfigEditor';

export const plugin = new DataSourcePlugin(AssetDataSource)
  .setConfigEditor(HttpConfigEditor)
  .setQueryEditor(AssetCoordonatorQueryEditor);
