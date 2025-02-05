import { DataSourcePlugin } from '@grafana/data';
import { ProductsDataSource } from './ProductsDataSource';
import { ProductsQueryEditor } from './components/ProductsQueryEditor';
import { HttpConfigEditor } from 'core/components/HttpConfigEditor';
import { ProductsVariableQueryEditor } from './components/ProductsVariableQueryEditor';

export const plugin = new DataSourcePlugin(ProductsDataSource)
  .setConfigEditor(HttpConfigEditor)
  .setQueryEditor(ProductsQueryEditor)
  .setVariableQueryEditor(ProductsVariableQueryEditor);
