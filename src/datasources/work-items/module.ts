import { DataSourcePlugin } from '@grafana/data';
import { WorkItemsDataSource } from './WorkItemsDataSource';
import { WorkItemsQueryEditor } from './components/WorkItemsQueryEditor';
import { WorkItemsVariableQueryEditor } from './components/WorkItemsVariableQueryEditor';
import { HttpConfigEditor } from 'core/components/HttpConfigEditor';

export const plugin = new DataSourcePlugin(WorkItemsDataSource)
  .setConfigEditor(HttpConfigEditor)
  .setQueryEditor(WorkItemsQueryEditor)
  .setVariableQueryEditor(WorkItemsVariableQueryEditor);
