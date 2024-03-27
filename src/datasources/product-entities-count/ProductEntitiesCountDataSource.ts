import { DataFrameDTO, DataQueryRequest, DataSourceInstanceSettings, TestDataSourceResponse } from '@grafana/data';
import { BackendSrv, TemplateSrv, getBackendSrv, getTemplateSrv } from '@grafana/runtime';
import { DataSourceBase } from 'core/DataSourceBase';
import { QueryCountResponse, QuerySpecsResponse } from './types';
import { Product, ProductQuery, QueryProductsResponse } from 'datasources/product/types';

export class ProductEntitiesCountDataSource extends DataSourceBase<ProductQuery> {
  constructor(
    readonly instanceSettings: DataSourceInstanceSettings,
    readonly backendSrv: BackendSrv = getBackendSrv(),
    readonly templateSrv: TemplateSrv = getTemplateSrv()
  ) {
    super(instanceSettings, backendSrv, templateSrv);
  }


  baseUrl = this.instanceSettings.url;
  // TODO: set base path of the service
  queryProductsUrl = this.baseUrl+'/nitestmonitor/v2/query-products';
  querySpecsUrl = this.baseUrl+'/nispec/v1/query-specs';
  queryTestPlansUrl = this.baseUrl+'/niworkorder/v1/query-testplans'
  queryResultsUrl = this.baseUrl+'/nitestmonitor/v2/query-results'
  queryAssetsUrl = this.baseUrl+'/niapm/v1/query-assets'

  defaultQuery = {
    partNumber: "part-number",
  };

  async runQuery(query: ProductQuery,  options: DataQueryRequest): Promise<DataFrameDTO> {
    const partNumber = this.templateSrv.replace(query.partNumber, options.scopedVars);
    const product = await this.getProductDetails(partNumber);
    const specsCount = await this.getSpecs(product.id);
    const testPlansCount = await this.getTestPlansCount(partNumber);
    const resultsCount = await this.getResultsCount(partNumber);
    const dutsCount = await this.getDutsCount(partNumber);
    const passedResultsCount = await this.getResultsCountByStatus(partNumber, 'Passed');
    const failedResultsCount = await this.getResultsCountByStatus(partNumber, 'Failed');

    return {
      refId: query.refId,
      fields: [
        { name: 'Specs Count', values: [specsCount]},
        { name: 'Test Plans Count', values: [testPlansCount]},
        { name: 'Results Count', values: [resultsCount]},
        { name: 'Duts Count', values: [dutsCount] },
        { name: 'Passed Results', values: [passedResultsCount] },
        { name: 'Failed Results', values: [failedResultsCount]}
      ],
    };
  }

  async getProductDetails(partNumber: string): Promise<Product> {
    return await this.post<QueryProductsResponse>(`${this.queryProductsUrl}`, {
      filter: `partNumber = "${partNumber}"`,
      take: 1
    }).then(response => response.products[0]);
  }

  async getSpecs(productId: string): Promise<number> {
    return await this.post<QuerySpecsResponse>(`${this.querySpecsUrl}`, {
      productIds: [
        productId
      ],
      take: 1000
    }).then(response => response.specs.length);
  }

  async getTestPlansCount(partNumber: string): Promise<number> {
    const response = await this.post<QueryCountResponse>(`${this.queryTestPlansUrl}`, {
      filter: `partNumber = "${partNumber}"`,
      returnCount: true,
      take: 0
    });
    return response.totalCount;
  }

  async getResultsCount(partNumber: string): Promise<number> {
    const response = await this.post<QueryCountResponse>(`${this.queryResultsUrl}`, {
      productFilter: `partNumber = "${partNumber}"`,
      returnCount: true,
      take: 0
    });
    return response.totalCount;
  }
  
  async getResultsCountByStatus(partNumber: string, status: string): Promise<number> {
    return await this.post<QueryCountResponse>(`${this.queryResultsUrl}`, {
      filter: `status.statusType = "${status}"`,
      productFilter: `partNumber = "${partNumber}"`,
      returnCount: true,
      take: 0
    }).then(response => response.totalCount);
  }

  async getDutsCount(partNumber: string): Promise<number> {
    return await this.post<QueryCountResponse>(`${this.queryAssetsUrl}`, {
      filter: `(AssetType = "DEVICE_UNDER_TEST" && partNumber = "${partNumber}")`,
      take: 0
    }).then(response => response.totalCount);
  }

  shouldRunQuery(query: ProductQuery): boolean {
    return true;
  }

  async testDatasource(): Promise<TestDataSourceResponse> {
    // TODO: Implement a health and authentication check
    await this.backendSrv.get(this.baseUrl + '/bar');
    return { status: 'success', message: 'Data source connected and authentication successful!' };
  }
}
