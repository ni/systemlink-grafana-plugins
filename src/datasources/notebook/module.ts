import { DataSourcePlugin } from '@grafana/data';
import { NotebookDataSource } from './NotebookDataSource';
import { NotebookQueryEditor } from './components/NotebookQueryEditor';
import { getConfigEditor } from 'core/components/HttpConfigEditor';
import { NotebookDataSourceServer } from './NotebookDataSourceServer';
import { NotebookDataSourceEnterprise } from './NotebookDataSourceEnterprise';

export const plugin = new DataSourcePlugin(
  new Proxy(NotebookDataSource, {
    construct(_, args: ConstructorParameters<typeof NotebookDataSource>) {
      return args[0].jsonData.isServer ? new NotebookDataSourceServer(...args) : new NotebookDataSourceEnterprise(...args);
    }
  })
)
  .setConfigEditor(getConfigEditor(true))
  .setQueryEditor(NotebookQueryEditor);
