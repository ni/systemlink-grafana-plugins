import { DataSourcePlugin } from '@grafana/data';
import { SystemDataSource } from './SystemDataSource';
import { SystemQueryEditor } from './components/SystemQueryEditor';
import { HttpConfigEditor } from 'core/components/HttpConfigEditor';

export const plugin = new DataSourcePlugin(SystemDataSource)
  .setConfigEditor(HttpConfigEditor)
  .setQueryEditor(SystemQueryEditor);
