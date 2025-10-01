import { DataSourcePlugin } from '@grafana/data';
import { AssetDataSource } from './AssetDataSource';
import { AssetQueryEditor } from './components/AssetQueryEditor';
import { AssetQuery } from './types/types';
import { AssetConfigEditor } from './AssetConfigEditor';
import { AssetVariableQueryEditor } from './components/variable-editor/AssetVariableQueryEditor';
import { FeatureToggleDataSourceOptions } from 'core/feature-toggle';

export const plugin = new DataSourcePlugin<AssetDataSource, AssetQuery, FeatureToggleDataSourceOptions>(AssetDataSource)
  .setConfigEditor(AssetConfigEditor)
  .setQueryEditor(AssetQueryEditor)
  .setVariableQueryEditor(AssetVariableQueryEditor);
