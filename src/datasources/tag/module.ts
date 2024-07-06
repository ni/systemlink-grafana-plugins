import { DataSourcePlugin } from '@grafana/data';
import { TagDataSource } from './TagDataSource';
import { TagQueryEditor } from './components/TagQueryEditor';
import { getConfigEditor } from 'core/components/HttpConfigEditor';

export const plugin = new DataSourcePlugin(TagDataSource)
  .setConfigEditor(getConfigEditor(false))
  .setQueryEditor(TagQueryEditor);
