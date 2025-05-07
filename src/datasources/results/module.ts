import { DataSourcePlugin } from '@grafana/data';
import { ResultsDataSource } from './ResultsDataSource';
import { ResultsQueryEditor } from './components/ResultsQueryEditor';
import { ResultsConfigEditor } from './ResultsConfigEditor';
import { ResultsDataSourceOptions, ResultsQuery } from './types/types';

export const plugin = new DataSourcePlugin<ResultsDataSource, ResultsQuery, ResultsDataSourceOptions>(ResultsDataSource)
  .setConfigEditor(ResultsConfigEditor)
  .setQueryEditor(ResultsQueryEditor);
