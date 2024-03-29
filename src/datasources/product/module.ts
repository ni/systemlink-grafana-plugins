import { DataSourcePlugin } from '@grafana/data';
import { productDataSource } from './productDataSource';
import { productQueryEditor } from './components/productQueryEditor';
import { HttpConfigEditor } from 'core/components/HttpConfigEditor';

export const plugin = new DataSourcePlugin(productDataSource)
  .setConfigEditor(HttpConfigEditor)
  .setQueryEditor(productQueryEditor);
