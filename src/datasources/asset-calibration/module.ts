import { DataSourcePlugin } from '@grafana/data';
import { AssetCalibrationDataSource } from './AssetCalibrationDataSource';
import { HttpConfigEditor } from 'core/components/HttpConfigEditor';
import { AssetCalibrationQueryEditor } from './components/AssetCalibrationQueryEditor';

export const plugin = new DataSourcePlugin(AssetCalibrationDataSource)
  .setConfigEditor(HttpConfigEditor)
  .setQueryEditor(AssetCalibrationQueryEditor);
