import { DataSourcePlugin } from '@grafana/data';
import { HttpConfigEditor } from 'core/components/HttpConfigEditor';
import { WorkItemsDataSource } from './WorkItemsDataSource';
import { WorkItemsQueryEditor } from './components/WorkItemsQueryEditor';
import { WorkItemsVariableQueryEditor } from './components/WorkItemsVariableQueryEditor';

export const plugin = new DataSourcePlugin(WorkItemsDataSource)
  .setConfigEditor(HttpConfigEditor)
  .setQueryEditor(WorkItemsQueryEditor)
  .setVariableQueryEditor(WorkItemsVariableQueryEditor);
