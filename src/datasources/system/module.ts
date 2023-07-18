import { DataSourcePlugin } from '@grafana/data';
import { SystemDataSource } from './SystemDataSource';
import { SystemQueryEditor } from './components/SystemQueryEditor';
import { HttpConfigEditor } from 'core/HttpConfigEditor';

export const plugin = new DataSourcePlugin(SystemDataSource)
  .setConfigEditor(HttpConfigEditor)
  .setQueryEditor(SystemQueryEditor);
