import { DataSourcePlugin } from '@grafana/data';
import { AzureDevopsDataSource } from './AzureDevopsDataSource';
import { AzureDevopsQueryEditor } from './components/AzureDevopsQueryEditor';
import { HttpConfigEditor } from 'core/components/HttpConfigEditor';

export const plugin = new DataSourcePlugin(AzureDevopsDataSource)
  .setConfigEditor(HttpConfigEditor)
  .setQueryEditor(AzureDevopsQueryEditor)
  .setVariableQueryEditor(() => null);
