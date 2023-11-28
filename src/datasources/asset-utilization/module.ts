import {DataSourcePlugin} from '@grafana/data';
import {AssetUtilizationDataSource} from './AssetUtilizationDataSource';
import {AssetUtilizationQueryEditor} from './components/AssetUtilizationQueryEditor';
import {HttpConfigEditor} from 'core/components/HttpConfigEditor';

export const plugin = new DataSourcePlugin(AssetUtilizationDataSource)
    .setConfigEditor(HttpConfigEditor)
    .setQueryEditor(AssetUtilizationQueryEditor);
