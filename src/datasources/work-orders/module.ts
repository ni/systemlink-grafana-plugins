import { DataSourcePlugin } from '@grafana/data';
import { WorkOrdersDataSource } from './WorkOrdersDataSource';
import { WorkOrdersQueryEditor } from './components/WorkOrdersQueryEditor';
import { HttpConfigEditor } from 'core/components/HttpConfigEditor';

export const plugin = new DataSourcePlugin(WorkOrdersDataSource)
  .setConfigEditor(HttpConfigEditor)
  .setQueryEditor(WorkOrdersQueryEditor);
