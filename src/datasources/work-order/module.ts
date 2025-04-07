import { DataSourcePlugin } from '@grafana/data';
import { WorkOrdersDataSource } from './WorkOrdersDataSource';
import { WorkOrdersQueryEditor } from './components/WorkOrderQueryEditor';
import { HttpConfigEditor } from 'core/components/HttpConfigEditor';
import { WorkOrderVariableQueryEditor } from './components/WorkOrderVariableQueryEditor';

console.log('Initializing WorkOrdersDataSource plugin');

export const plugin = new DataSourcePlugin(WorkOrdersDataSource)
  .setConfigEditor(HttpConfigEditor)
  .setQueryEditor(WorkOrdersQueryEditor)
  .setVariableQueryEditor(WorkOrderVariableQueryEditor);
