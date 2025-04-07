import { DataSourcePlugin } from '@grafana/data';
import { TestPlansDataSource } from '../test-plan/TestPlansDataSource';
import { TestPlansQueryEditor } from '../test-plan/components/TestPlanQueryEditor';
import { HttpConfigEditor } from 'core/components/HttpConfigEditor';
import { TestPlanVariableQueryEditor } from '../test-plan/components/TestPlanVariableQueryEditor';

console.log('Initializing TestPlansDataSource plugin');

export const plugin = new DataSourcePlugin(TestPlansDataSource)
  .setConfigEditor(HttpConfigEditor)
  .setQueryEditor(TestPlansQueryEditor)
  .setVariableQueryEditor(TestPlanVariableQueryEditor);
