import { DataSourcePlugin } from '@grafana/data';
import { TestPlansDataSource } from './TestPlansDataSource';
import { TestPlansQueryEditor } from './components/TestPlansQueryEditor';
import { HttpConfigEditor } from 'core/components/HttpConfigEditor';
import { TestPlansVariableQueryEditor } from './components/TestPlansVariableQueryEditor';

export const plugin = new DataSourcePlugin(TestPlansDataSource)
  .setConfigEditor(HttpConfigEditor)
  .setQueryEditor(TestPlansQueryEditor)
  .setVariableQueryEditor(TestPlansVariableQueryEditor);
