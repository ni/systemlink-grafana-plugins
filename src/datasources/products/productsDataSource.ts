import { DataFrameDTO, DataQueryRequest, DataSourceInstanceSettings, FieldType, QueryVariableModel, TestDataSourceResponse } from '@grafana/data';
import { BackendSrv, TemplateSrv, getBackendSrv, getTemplateSrv } from '@grafana/runtime';
import { DataSourceBase } from 'core/DataSourceBase';
import { ProductsQuery, QueryProductResponse, MetaData } from './types';

export class productsDataSource extends DataSourceBase<ProductsQuery> {
  constructor(
    readonly instanceSettings: DataSourceInstanceSettings,
    readonly backendSrv: BackendSrv = getBackendSrv(),
    readonly templateSrv: TemplateSrv = getTemplateSrv()
  ) {
    super(instanceSettings, backendSrv, templateSrv);
  }

  // TODO: set base path of the service
  baseUrl = this.instanceSettings.url;

  queryProductsUrl = this.baseUrl + '/nitestmonitor/v2/query-products';
  queryResultsUrl = this.baseUrl + '/nitestmonitor/v2/query-results';
  querySpecsUrl = this.baseUrl + '/nispec/v1/query-specs';
  queryTestPlansUrl = this.baseUrl + '/niworkorder/v1/query-testplans'
  queryAssetsUrl = this.baseUrl + '/niapm/v1/query-assets'

  defaultQuery = {
    queryBy: '',
    recordCount: 1000,
    orderBy: '',
  };

  async queryProducts(filter: string, orderBy: string, projection: MetaData[], recordCount = 1000, descending = false ,returnCount= false ): Promise<QueryProductResponse> {
    const matchingVariables = getTemplateSrv().getVariables().filter(variable => filter.includes(variable.name)) as QueryVariableModel[];
    const variableDictionary: Record<string, string> = {};
    matchingVariables.forEach(variable => {
      variableDictionary[variable.name] = variable.current.value as string;
    });
   filter = filter.replace(/\$[a-zA-Z0-9_]+/g, (match) => variableDictionary[match.slice(1)]);

    const response = await this.post<QueryProductResponse>(this.baseUrl + '/nitestmonitor/v2/query-products', {
      filter: filter,
      orderBy: orderBy,
      descending: descending,
      projection: projection.length > 0 ? projection : undefined,
      take: recordCount,
      returnCount: returnCount
    });    
    return response;
  }

  async queryProductValues(field: string, startsWith: string): Promise<string[]> {
    if (!startsWith || startsWith.startsWith('$')) {
      return this.getVariableOptions();
    }
    const data = { field, startsWith };
    const values = await getBackendSrv().post(this.baseUrl + '/nitestmonitor/v2/query-product-values', data);
    return values.slice(0, 20).filter((value: string) => value);
  }

   getVariableOptions = () => {
    return getTemplateSrv()
      .getVariables()
      .map(v => '$' + v.name);
  };

  async runQuery(query: ProductsQuery, options: DataQueryRequest): Promise<DataFrameDTO> {
    if (!query.queryBy) {
      return {
        refId: query.refId,
        fields: [ 
            { name: 'Test program', values: [] },
            { name: 'Serial number', values: [] }
          ],
        };
    } else {
        const responseData = (await this.queryProducts( query.queryBy, query.orderBy, query.metaData!, query.recordCount, query.descending, false)).products;
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
  }

  shouldRunQuery(query: ProductsQuery): boolean {
    return true;
  }

  // async metricFindQuery({ workspace }: ProductsVariableQuery): Promise<MetricFindValue[]> {
  //   const metadata = (await this.queryProducts('', false)).products;
  //   return metadata.map(frame => ({ text: frame.family, value: frame.family, }));
  // }

  async testDatasource(): Promise<TestDataSourceResponse> {
    // TODO: Implement a health and authentication check
    await this.backendSrv.get(this.baseUrl! + '/nitestmonitor/v2');
    return { status: 'success', message: 'Data source connected and authentication successful!' };
  }
}
