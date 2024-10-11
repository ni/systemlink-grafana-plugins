import { DataFrameDTO, DataQueryRequest, DataSourceInstanceSettings, FieldType, TestDataSourceResponse } from '@grafana/data';
import { BackendSrv, TemplateSrv, getBackendSrv, getTemplateSrv } from '@grafana/runtime';
import { DataSourceBase } from 'core/DataSourceBase';
import { Properties, ProductsQuery } from './types';

export class ProductsDataSource extends DataSourceBase<ProductsQuery> {
  constructor(
    readonly instanceSettings: DataSourceInstanceSettings,
    readonly backendSrv: BackendSrv = getBackendSrv(),
    readonly templateSrv: TemplateSrv = getTemplateSrv()
  ) {
    super(instanceSettings, backendSrv, templateSrv);
  }

  baseUrl = this.instanceSettings.url;

  queryProductsUrl = this.baseUrl + '/nitestmonitor/v2/query-products';


  defaultQuery = {
    properties: [Properties.id],
  };

  async getWorkspaceNames(): Promise<{ label: string, value: string }[]> {
    const workspaces = await this.getWorkspaces();
    const workspaceOptions = workspaces.map(w => ({ label: w.name, value: w.id }));
    const variables = this.getVariableOptions().map(v => ({ label: v, value: v }))
    workspaceOptions?.unshift(...variables)
    return workspaceOptions;
  }

  getVariableOptions() {
    return getTemplateSrv()
      .getVariables()
      .map(v => '$' + v.name);
  };

  async runQuery(query: ProductsQuery, { range }: DataQueryRequest): Promise<DataFrameDTO> {
    return {
      refId: query.refId,
      fields: [
        { name: 'Time', values: [range.from.valueOf(), range.to.valueOf()], type: FieldType.time },

      ],
    };
  }

  shouldRunQuery(query: ProductsQuery): boolean {
    return true;
  }

  async testDatasource(): Promise<TestDataSourceResponse> {
    // TODO: Implement a health and authentication check
    await this.backendSrv.get(this.baseUrl! + '/nitestmonitor/v2');
    return { status: 'success', message: 'Data source connected and authentication successful!' }
  }
}
