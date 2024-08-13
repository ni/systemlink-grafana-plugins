import { DataFrameDTO, DataQueryRequest, DataSourceInstanceSettings, FieldType, MetricFindValue, TestDataSourceResponse } from '@grafana/data';
import { BackendSrv, TemplateSrv, getBackendSrv, getTemplateSrv } from '@grafana/runtime';
import { DataSourceBase } from 'core/DataSourceBase';
import { ProductsQuery, QueryProductResponse, MetaData, ProductsVariableQuery } from './types';

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

  defaultQuery = {
    queryBy: '',
    recordCount: 1000,
    orderBy: '',
  };

  async getWorkspaceNames(): Promise<{label:string, value:string}[]> {
    const workspaces = await this.getWorkspaces();
    const workspaceOptions = workspaces.map(w => ({ label: w.name, value: w.id }));
    const variables = this.getVariableOptions().map(v => ({ label: v, value: v }))
    workspaceOptions?.unshift(...variables)
    return workspaceOptions;
  }

  async queryProducts(filter: string, orderBy?: string, projection?: MetaData[], recordCount = 1000, descending = false ,returnCount= false ): Promise<QueryProductResponse> {
    const response = await this.post<QueryProductResponse>(this.baseUrl + '/nitestmonitor/v2/query-products', {
      filter: filter,
      orderBy: orderBy,
      descending: descending,
      projection: projection ? projection : undefined,
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
    const filter = [
      query.partNumber ? `partNumber = (\"${query.partNumber}\")` : '',
      query.family ? `family = (\"${query.family}\")` : '',
      query.workspace ? `workspace = (\"${query.workspace}\")` : '',
    ].filter(Boolean).join(' && ');

    if (!query.queryBy && (query.partNumber || query.family || query.workspace)) {
      const variableReplacedFilter = getTemplateSrv().replace(filter, options.scopedVars)
      const responseData = (await this.queryProducts(variableReplacedFilter, query.orderBy, query.metaData!, query.recordCount, query.descending, false)).products;
      
      const filteredFields = query.metaData?.filter((field: MetaData) => Object.keys(responseData[0]).includes(field)) || [];

      const fields = filteredFields.map((field) => {
        const fieldType = field === MetaData.updatedAt ? FieldType.time : FieldType.string;
        const values = responseData.map(m => m[field]);
        return { name: field, values, type: fieldType };
      });
      
      return {
        refId: query.refId,
        fields: fields,
      };
    } else {
        const queryByFilter = filter && query.queryBy ? `${filter} && ${query.queryBy}` : filter || query.queryBy;
        const variableReplacedFilter = getTemplateSrv().replace(queryByFilter, options.scopedVars)
        const responseData = (await this.queryProducts( variableReplacedFilter, query.orderBy, query.metaData!, query.recordCount, query.descending, false)).products;
       
        const filteredFields = query.metaData?.filter((field: MetaData) => Object.keys(responseData[0]).includes(field)) || [];
        const fields = filteredFields.map((field) => {{
          const fieldType = field === MetaData.updatedAt ? FieldType.time : FieldType.string;
          const values = responseData.map(m => m[field]);
          return { name: field, values, type: fieldType };
        }});

        return {
          refId: query.refId,
          fields: fields
        };
      }
  }

  shouldRunQuery(query: ProductsQuery): boolean {
    return true;
  }

  async metricFindQuery({ workspace, family }: ProductsVariableQuery): Promise<MetricFindValue[]> {
    const filter = [
      family ? `family = (\"${family}\")` : '',
      workspace ? `workspace = (\"${workspace}\")` : '',
    ].filter(Boolean).join(' && ');

    const metadata = (await this.queryProducts(filter)).products;
    return metadata.map(frame => ({ text: `${frame.partNumber}(${frame.family})`, value: frame.partNumber, }));
  }

  async testDatasource(): Promise<TestDataSourceResponse> {
    // TODO: Implement a health and authentication check
    await this.backendSrv.get(this.baseUrl! + '/nitestmonitor/v2');
    return { status: 'success', message: 'Data source connected and authentication successful!' };
  }
}
