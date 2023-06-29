import { DataSourcePlugin } from '@grafana/data';
import { TagDataSource } from './TagDataSource';
import { ConfigEditor } from './components/ConfigEditor';
import { QueryEditor } from './components/QueryEditor';

export const plugin = new DataSourcePlugin(TagDataSource)
  .setConfigEditor(ConfigEditor)
  .setQueryEditor(QueryEditor);
