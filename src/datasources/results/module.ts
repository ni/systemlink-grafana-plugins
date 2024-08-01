import { DataSourcePlugin } from '@grafana/data';
import { TestResultsDataSource } from './ResultsDataSource';
import { ResultsQueryEditor as TestResultsQueryEditor } from './components/ResultsQueryEditor';
import { HttpConfigEditor } from 'core/components/HttpConfigEditor';
import { ResultsVariableQueryEditor } from './components/resultsVariableQueryEditor';

export const plugin = new DataSourcePlugin(TestResultsDataSource)
  .setConfigEditor(HttpConfigEditor)
  .setQueryEditor(TestResultsQueryEditor)
  .setVariableQueryEditor(ResultsVariableQueryEditor);
