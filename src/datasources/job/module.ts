import { DataSourcePlugin } from '@grafana/data';
import { JobDataSource } from './JobDataSource';
import { JobQueryEditor } from './components/JobQueryEditor';
import { HttpConfigEditor } from 'core/HttpConfigEditor';

export const plugin = new DataSourcePlugin(JobDataSource)
  .setConfigEditor(HttpConfigEditor)
  .setQueryEditor(JobQueryEditor);
