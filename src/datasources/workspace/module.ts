import { DataSourcePlugin } from '@grafana/data';
import { WorkspaceDataSource } from './WorkspaceDataSource';
import { WorkspaceQueryEditor } from './components/WorkspaceQueryEditor';
import { HttpConfigEditor } from 'core/components/HttpConfigEditor';

export const plugin = new DataSourcePlugin(WorkspaceDataSource)
  .setConfigEditor(HttpConfigEditor)
  .setQueryEditor(WorkspaceQueryEditor);
