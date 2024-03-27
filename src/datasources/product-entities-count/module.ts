import { DataSourcePlugin } from '@grafana/data';
import { ProductEntitiesCountDataSource } from './ProductEntitiesCountDataSource';
import { ProductEntitiesCountQueryEditor } from './components/ProductEntitiesCountQueryEditor';
import { HttpConfigEditor } from 'core/components/HttpConfigEditor';

export const plugin = new DataSourcePlugin(ProductEntitiesCountDataSource)
  .setConfigEditor(HttpConfigEditor)
  .setQueryEditor(ProductEntitiesCountQueryEditor);
