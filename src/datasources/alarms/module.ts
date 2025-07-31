import { DataSourcePlugin } from '@grafana/data';
import { AlarmsDataSource } from './AlarmsDataSource';
import { AlarmsQueryEditor } from './components/AlarmsQueryEditor';
import { HttpConfigEditor } from './components/HttpConfigEditor';
import { WorkOrdersVariableQueryEditor } from 'datasources/work-orders/components/WorkOrdersVariableQueryEditor';

export const plugin = new DataSourcePlugin(AlarmsDataSource)
  .setConfigEditor(HttpConfigEditor)
  .setQueryEditor(AlarmsQueryEditor)
  .setVariableQueryEditor(WorkOrdersVariableQueryEditor);
