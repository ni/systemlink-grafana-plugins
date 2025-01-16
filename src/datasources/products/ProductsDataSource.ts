import { DataFrameDTO, DataQueryRequest, DataSourceInstanceSettings, FieldType, TestDataSourceResponse } from '@grafana/data';
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

  async queryProducts(orderBy: string, projection: Properties[], recordCount = 1000, descending = false, returnCount = false): Promise<QueryProductResponse> {
    const response = await this.post<QueryProductResponse>(this.queryProductsUrl, {
      orderBy: orderBy,
      descending: descending,
      projection: projection,
      take: recordCount,
      returnCount: returnCount
    });
    return response;
  }

  async runQuery(query: ProductQuery, options: DataQueryRequest): Promise<DataFrameDTO> {
    const responseData = (await this.queryProducts(query.orderBy!, query.properties!, query.recordCount, query.descending)).products;

    const selectedFields = query.properties?.filter((field: Properties) => Object.keys(responseData[0]).includes(field)) || [];
    const fields = selectedFields.map((field) => {
      const fieldType = field === PropertiesOptions.UPDATEDAT ? FieldType.time : FieldType.string;
      const values = responseData.map(data => data[field as unknown as keyof ProductResponseProperties]);

      if (field === PropertiesOptions.PROPERTIES) {
        return { name: field, values: values.map(value => JSON.stringify(value)), type: fieldType };
      }
      return { name: field, values, type: fieldType };
    });

    return {
      refId: query.refId,
      fields: fields
    };
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
