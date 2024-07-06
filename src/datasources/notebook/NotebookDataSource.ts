import { DataFrameDTO, DataQuery, DataQueryRequest, DataSourceInstanceSettings, SelectableValue, TestDataSourceResponse } from '@grafana/data';
import { DataSourceBase } from 'core/DataSourceBase';
import { NotebookQuery, NotebookDataSourceOptions } from './types';
import { BackendSrv, getBackendSrv, TemplateSrv, getTemplateSrv } from '@grafana/runtime';

// TODO: write comment about how this class is used
export class NotebookDataSource extends DataSourceBase<NotebookQuery, NotebookDataSourceOptions> {
  constructor(
    readonly instanceSettings: DataSourceInstanceSettings<NotebookDataSourceOptions>,
    readonly backendSrv: BackendSrv = getBackendSrv(),
    readonly templateSrv: TemplateSrv = getTemplateSrv()
  ) {
    super(instanceSettings, backendSrv, templateSrv);
  }

  defaultQuery = {
    parameters: {},
    output: '',
    cacheTimeout: 86400,
  };

  getNotebookOptions(search: string): Promise<SelectableValue<string>[]> {
    throw new Error('Method not implemented.');
  }

  runQuery(query: NotebookQuery, options: DataQueryRequest<DataQuery>): Promise<DataFrameDTO> {
    throw new Error('Method not implemented.');
  }
  shouldRunQuery(query: NotebookQuery): boolean {
    throw new Error('Method not implemented.');
  }

  async testDatasource(): Promise<TestDataSourceResponse> {
    await this.getNotebookOptions('');
    return { status: 'success', message: 'Data source connected and authentication successful!' };
  }
}
