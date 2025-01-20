import { DataFrameDTO, DataSourceInstanceSettings, FieldType, TestDataSourceResponse } from '@grafana/data';
import { BackendSrv, TemplateSrv, getBackendSrv, getTemplateSrv } from '@grafana/runtime';
import { DataSourceBase } from 'core/DataSourceBase';
import { ProductQuery, ProductResponseProperties, Properties, PropertiesOptions, QueryProductResponse } from './types';

export class ProductsDataSource extends DataSourceBase<ProductQuery> {
  constructor(
    readonly instanceSettings: DataSourceInstanceSettings,
    readonly backendSrv: BackendSrv = getBackendSrv(),
    readonly templateSrv: TemplateSrv = getTemplateSrv()
  ) {
    super(instanceSettings, backendSrv, templateSrv);
  }

  baseUrl = this.instanceSettings.url + '/nitestmonitor';
  queryProductsUrl = this.baseUrl + '/v2/query-products';

  defaultQuery = {
    properties: [
      PropertiesOptions.PART_NUMBER,
      PropertiesOptions.NAME,
      PropertiesOptions.FAMILY,
      PropertiesOptions.WORKSPACE
    ] as Properties[],
    orderBy: undefined,
    descending: false,
    recordCount: 1000
  };

  async queryProducts(
    orderBy?: string,
    projection?: Properties[],
    take?: number,
    descending?: boolean,
    returnCount = false
  ): Promise<QueryProductResponse> {
    try {
      const response = await this.post<QueryProductResponse>(this.queryProductsUrl, {
        orderBy,
        descending,
        projection,
        take,
        returnCount
      });
      return response;
    } catch (error) {
      throw new Error(`An error occurred while querying products: ${error}`);
    }
  }

  async runQuery(query: ProductQuery): Promise<DataFrameDTO> {
    const products = (
      await this.queryProducts(
        query.orderBy,
        query.properties,
        query.recordCount,
        query.descending
      )).products;

    if (products.length > 0) {
      const selectedFields = query.properties?.filter(
        (field: Properties) => Object.keys(products[0]).includes(field)) || [];
      const fields = selectedFields.map((field) => {
        const isTimeField = field === PropertiesOptions.UPDATEDAT;
        const fieldType = isTimeField
        ? FieldType.time 
        : FieldType.string;
        const values = products.map(data => data[field as unknown as keyof ProductResponseProperties]);

        return { name: field, values: field === PropertiesOptions.PROPERTIES 
          ? values.map(value => {
            return value != null ? JSON.stringify(value) : '';
          }) 
          : values , type: fieldType };
      });
      return {
        refId: query.refId,
        fields: fields
      };
    }
    return {
      refId: query.refId,
      fields: []
    }
  }

  shouldRunQuery(query: ProductQuery): boolean {
    return true;
  }

  async testDatasource(): Promise<TestDataSourceResponse> {
    // TODO: Implement a health and authentication check
    await this.backendSrv.get(this.baseUrl + '/');
    return { status: 'success', message: 'Data source connected and authentication successful!' };
  }
}
