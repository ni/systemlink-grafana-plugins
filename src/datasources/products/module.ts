import { DataSourcePlugin } from '@grafana/data';
import { productsDataSource } from './productsDataSource';
import { productsQueryEditor } from './components/productsQueryEditor';
import { HttpConfigEditor } from 'core/components/HttpConfigEditor';

export const plugin = new DataSourcePlugin(productsDataSource)
  .setConfigEditor(HttpConfigEditor)
  .setQueryEditor(productsQueryEditor);
