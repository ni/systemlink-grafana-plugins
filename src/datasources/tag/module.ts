import { DataSourcePlugin } from '@grafana/data';
import { TagDataSource } from './TagDataSource';
import { TagQueryEditor } from './components/TagQueryEditor';
import { HttpConfigEditor } from 'core/components/HttpConfigEditor';

export const plugin = new DataSourcePlugin(TagDataSource)
  .setConfigEditor(HttpConfigEditor)
  .setQueryEditor(TagQueryEditor);
