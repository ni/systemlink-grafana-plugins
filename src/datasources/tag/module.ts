import { DataSourcePlugin } from '@grafana/data';
import { TagDataSource } from './TagDataSource';
import { TagQueryEditor } from './components/TagQueryEditor';
import { TagConfigEditor } from "./TagConfigEditor";
import { TagDataSourceOptions, TagQuery } from "./types";

export const plugin = new DataSourcePlugin<TagDataSource, TagQuery, TagDataSourceOptions>(TagDataSource)
  .setConfigEditor(TagConfigEditor)
  .setQueryEditor(TagQueryEditor);
