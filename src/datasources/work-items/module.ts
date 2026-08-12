import { DataSourcePlugin } from '@grafana/data';
import { WorkItemsDataSource } from './WorkItemsDataSource';
import { WorkItemsQueryEditor } from './components/WorkItemsQueryEditor';
import { WorkItemsConfigEditor } from './WorkItemsConfigEditor';

export const plugin = new DataSourcePlugin(WorkItemsDataSource)
  .setConfigEditor(WorkItemsConfigEditor)
  .setQueryEditor(WorkItemsQueryEditor)
  .setVariableQueryEditor(() => null);
