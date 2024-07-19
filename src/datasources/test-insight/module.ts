import { DataSourcePlugin } from '@grafana/data';
import { TestInsightDataSource } from './TestInsightDataSource';
import { TestInsightQueryEditor } from './components/TestInsightQueryEditor';
import { HttpConfigEditor } from 'core/components/HttpConfigEditor';

export const plugin = new DataSourcePlugin(TestInsightDataSource)
  .setConfigEditor(HttpConfigEditor)
  .setQueryEditor(TestInsightQueryEditor)
