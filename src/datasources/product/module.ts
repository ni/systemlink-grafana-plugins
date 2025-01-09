import { DataSourcePlugin } from '@grafana/data';
import { ProductDataSource } from './ProductDataSource';
import { ProductQueryEditor } from './components/ProductQueryEditor';
import { HttpConfigEditor } from 'core/components/HttpConfigEditor';

export const plugin = new DataSourcePlugin(ProductDataSource)
  .setConfigEditor(HttpConfigEditor)
  .setQueryEditor(ProductQueryEditor);
