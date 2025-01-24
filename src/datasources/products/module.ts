import { DataSourcePlugin } from '@grafana/data';
import { ProductsDataSource } from './ProductsDataSource';
import { ProductsQueryEditor } from './components/ProductsQueryEditor';
import { HttpConfigEditor } from 'core/components/HttpConfigEditor';

export const plugin = new DataSourcePlugin(ProductsDataSource)
  .setConfigEditor(HttpConfigEditor)
  .setQueryEditor(ProductsQueryEditor);
