import { DataSourcePlugin } from '@grafana/data';
import { ResultsDataSource } from './ResultsDataSource';
import { ResultsQueryEditor } from './components/ResultsQueryEditor';
import { HttpConfigEditor } from 'core/components/HttpConfigEditor';

export const plugin = new DataSourcePlugin(ResultsDataSource)
  .setConfigEditor(HttpConfigEditor)
  .setQueryEditor(ResultsQueryEditor);
