import { DataSourcePlugin } from '@grafana/data';
import { TagDataSource } from './TagDataSource';
import { QueryEditor } from './components/QueryEditor';
import { HttpConfigEditor } from 'core/HttpConfigEditor';

export const plugin = new DataSourcePlugin(TagDataSource)
  .setConfigEditor(HttpConfigEditor)
  .setQueryEditor(QueryEditor);
