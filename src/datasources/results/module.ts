import { DataSourcePlugin } from '@grafana/data';
import { ResultsDataSource } from './ResultsDataSource';
import { ResultsQueryEditor } from './components/ResultsQueryEditor';
import { ResultsQuery } from './types/types';
import { ResultsVariableQueryEditor } from './components/variable-editors/ResultsVariableQueryEditor';
import { HttpConfigEditor } from 'core/components/HttpConfigEditor';

export const plugin = new DataSourcePlugin<ResultsDataSource, ResultsQuery>(ResultsDataSource)
  .setConfigEditor(HttpConfigEditor)
  .setQueryEditor(ResultsQueryEditor)
  .setVariableQueryEditor(ResultsVariableQueryEditor)
