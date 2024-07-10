import { DataFrameDTO, DataQueryRequest, DataSourceInstanceSettings, FieldType, TestDataSourceResponse } from '@grafana/data';
import { BackendSrv, TemplateSrv, getBackendSrv, getTemplateSrv } from '@grafana/runtime';
import { DataSourceBase } from 'core/DataSourceBase';
import { ProductsMetaData, TestInsightQuery, TestInsightQueryType } from './types';

export class TestInsightDataSource extends DataSourceBase<TestInsightQuery> {
  constructor(
    readonly instanceSettings: DataSourceInstanceSettings,
    readonly backendSrv: BackendSrv = getBackendSrv(),
    readonly templateSrv: TemplateSrv = getTemplateSrv()
  ) {
    super(instanceSettings, backendSrv, templateSrv);
  }

  baseUrl = this.instanceSettings.url;

  defaultQuery = {
    type: TestInsightQueryType.Products,
    workspace: '',
    family: '',
    partNumber: '',
    name: ''
  };

  async runQuery(query: TestInsightQuery, options: DataQueryRequest): Promise<DataFrameDTO> {

    const responseData = await this.getProducts(
      this.templateSrv.replace(query.name, options.scopedVars),
      this.templateSrv.replace(query.partNumber, options.scopedVars),
      this.templateSrv.replace(query.family, options.scopedVars),
      this.templateSrv.replace(query.workspace, options.scopedVars),
    );
  
    return {
      refId: query.refId,
      fields: [
        { name: 'id', values: responseData.map(m => m.id) },
        { name: 'name', values: responseData.map(m => m.name) },
        { name: 'partNumber', values: responseData.map(m => m.partNumber) },
        { name: 'family', values: responseData.map(m => m.family) },
        { name: 'updatedAt', values: responseData.map(m => m.updatedAt), type: FieldType.time},
      ],
    };
  }

  async getProducts(name: string, partNumber: string, family: string, workspace: string ): Promise<ProductsMetaData[]> {
    const productFilter = [
      name && `name = "${name}"`,
      partNumber && `partNumber = "${partNumber}"`,
      family && `family = "${family}"`,
      workspace && `workspace = "${workspace}"`,
    ];

    const response = await this.post<{ products: ProductsMetaData[]}>(this.baseUrl + '/nitestmonitor/v2/query-products', {
      filter: productFilter.filter(Boolean).join(' && '),
    });    

    return response.products;
  }

  shouldRunQuery(_: TestInsightQuery): boolean {
    return true;
  }

  async testDatasource(): Promise<TestDataSourceResponse> {
    // TODO: Implement a health and authentication check
    await this.backendSrv.get(this.baseUrl! + '/nitestmonitor/v2');
    return { status: 'success', message: 'Data source connected and authentication successful!' };
  }
}
