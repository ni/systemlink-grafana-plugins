import { DataSourcePlugin } from '@grafana/data';
import { ResultsDataSource } from './ResultsDataSource';
import { ResultsQueryEditor } from './components/ResultsQueryEditor';
import { ResultsQuery } from './types/types';
import { ResultsVariableQueryEditor } from './components/variable-editors/ResultsVariableQueryEditor';

export const plugin = new DataSourcePlugin<ResultsDataSource, ResultsQuery>(ResultsDataSource)
  .setQueryEditor(ResultsQueryEditor)
  .setVariableQueryEditor(ResultsVariableQueryEditor)
