import { DataFrameDTO, DataSourceInstanceSettings, MetricFindValue, TestDataSourceResponse } from "@grafana/data";
import { BackendSrv, TemplateSrv, getBackendSrv, getTemplateSrv } from "@grafana/runtime";
import { PartNumberQuery, QueryProductsResponse, Product } from "./types";
import { DataSourceBase } from "core/DataSourceBase";

export class PartNumberDataSource extends DataSourceBase<PartNumberQuery> {
  constructor(
    readonly instanceSettings: DataSourceInstanceSettings,
    readonly backendSrv: BackendSrv = getBackendSrv(),
    readonly templateSrv: TemplateSrv = getTemplateSrv()
  ) {
    super(instanceSettings, backendSrv, templateSrv);
  }

  baseUrl = this.instanceSettings.url + '/nitestmonitor/v2';

  queryProductsUrl = this.baseUrl+'/query-products';

  defaultQuery = {};

  async runQuery(_query: PartNumberQuery): Promise<DataFrameDTO> {
    return { fields: [
      {
        name: 'Part Number',
        values: await this.getPartNumbers()
      }
    ] };
  }

  shouldRunQuery(): boolean {
    return true;
  }

  async testDatasource(): Promise<TestDataSourceResponse> {
    await this.get(this.baseUrl + '/up');
    return { status: 'success', message: 'Data source connected and authentication successful!' };
  }

  async getPartNumbers(): Promise<string[]> {
    const products = await this.getProducts();
    return products.map(product => product.partNumber);
  }

  async metricFindQuery(): Promise<MetricFindValue[]> {
    const partNumbers = await this.getProducts();
    return partNumbers.map(pn => ({ text: pn.partNumber, value: pn.partNumber }));
  }

  async getProducts(): Promise<Product[]> {
    return await this.post<QueryProductsResponse>(
      this.queryProductsUrl,
      {
        take: 1000,
        projection: [ 'ID', 'PARTNUMBER']
      }
    ).then(response => response.products);
  }
}
