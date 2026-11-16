import { DataSourcePlugin } from '@grafana/data';
import { TdmReaderDataSource } from './TdmReaderDataSource';
import { TdmReaderConfigEditor } from './components/TdmReaderConfigEditor';
import { TdmReaderQueryEditor } from './components/TdmReaderQueryEditor';
import { TdmReaderQuery } from './types';

export const plugin = new DataSourcePlugin<TdmReaderDataSource, TdmReaderQuery>(TdmReaderDataSource)
  .setConfigEditor(TdmReaderConfigEditor)
  .setQueryEditor(TdmReaderQueryEditor);
