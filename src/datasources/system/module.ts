import { DataSourcePlugin } from '@grafana/data';
import { SystemDataSource } from './SystemDataSource';
import { SystemQueryEditor } from './components/SystemQueryEditor';
import { getConfigEditor } from 'core/components/HttpConfigEditor';
import { SystemVariableQueryEditor } from './components/SystemVariableQueryEditor';

export const plugin = new DataSourcePlugin(SystemDataSource)
  .setConfigEditor(getConfigEditor(false))
  .setQueryEditor(SystemQueryEditor)
  .setVariableQueryEditor(SystemVariableQueryEditor);
