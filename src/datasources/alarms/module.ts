import { DataSourcePlugin } from '@grafana/data';
import { AlarmsDataSource } from './AlarmsDataSource';
import { AlarmsQueryEditor } from './components/AlarmsQueryEditor';
import { HttpConfigEditor } from 'core/components/HttpConfigEditor';
import { AlarmsVariableQueryEditor } from './components/AlarmsVariableQueryEditor';

export const plugin = new DataSourcePlugin(AlarmsDataSource)
  .setConfigEditor(HttpConfigEditor)
  .setQueryEditor(AlarmsQueryEditor)
  .setVariableQueryEditor(AlarmsVariableQueryEditor);
