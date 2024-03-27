import { DataFrameDTO, DataQueryRequest, DataSourceInstanceSettings, TestDataSourceResponse, dateTime } from '@grafana/data';
import { BackendSrv, TemplateSrv, getBackendSrv, getTemplateSrv } from '@grafana/runtime';
import { DataSourceBase } from 'core/DataSourceBase';
import { Product, ProductQuery, QueryProductsResponse } from './types';

export class ProductDataSource extends DataSourceBase<ProductQuery> {
  constructor(
    readonly instanceSettings: DataSourceInstanceSettings,
    readonly backendSrv: BackendSrv = getBackendSrv(),
    readonly templateSrv: TemplateSrv = getTemplateSrv()
  ) {
    super(instanceSettings, backendSrv, templateSrv);
  }

  baseUrl = this.instanceSettings.url;
  queryProductsUrl = this.baseUrl+'/nitestmonitor/v2/query-products';

  defaultQuery = {
    partNumber: ''
  };

  async runQuery(query: ProductQuery,  options: DataQueryRequest): Promise<DataFrameDTO> {
    const partNumber = this.templateSrv.replace(query.partNumber, options.scopedVars);
    const product = await this.getProductDetails(partNumber);
    return {
      refId: query.refId,
      fields: [
        { name: 'Name', values: [product.name] },
        { name: 'Family', values: [product.family] },
        { name: 'Part Number', values: [product.partNumber] },
        { name: 'Updated', values: [dateTime(product.updatedAt).format('MMM DD, YYYY, h:mm:ss A')] },
      ]
    };
  }

  async getProductDetails(partNumber: string): Promise<Product> {
    return await this.post<QueryProductsResponse>(`${this.queryProductsUrl}`, {
      filter: `partNumber = "${partNumber}"`,
      take: 1
    }).then(response => response.products[0]);
  }

  shouldRunQuery(query: ProductQuery): boolean {
    return true;
  }

  async testDatasource(): Promise<TestDataSourceResponse> {
    // TODO: Implement a health and authentication check
    await this.backendSrv.get(this.baseUrl + '/up');
    return { status: 'success', message: 'Data source connected and authentication successful!' };
  }
}
