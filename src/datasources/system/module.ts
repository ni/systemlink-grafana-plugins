import { DataSourcePlugin } from '@grafana/data';
import { SystemDataSource } from './SystemDataSource';
import { SystemQueryEditor } from './components/SystemQueryEditor';
import { SystemVariableQueryEditor } from './components/SystemVariableQueryEditor';
import { SystemConfigEditor } from './SystemConfigEditor';

export const plugin = new DataSourcePlugin(SystemDataSource)
  .setConfigEditor(SystemConfigEditor)
  .setQueryEditor(SystemQueryEditor)
  .setVariableQueryEditor(SystemVariableQueryEditor);
