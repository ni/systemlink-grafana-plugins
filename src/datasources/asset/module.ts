import { DataSourcePlugin } from '@grafana/data';
import { AssetCoordonatorDataSource } from './AssetCoordonatorDataSource';
import { AssetCoordonatorQueryEditor } from './components/AssetCoordonatorQueryEditor';
import { HttpConfigEditor } from 'core/components/HttpConfigEditor';

export const plugin = new DataSourcePlugin(AssetCoordonatorDataSource)
  .setConfigEditor(HttpConfigEditor)
  .setQueryEditor(AssetCoordonatorQueryEditor);
