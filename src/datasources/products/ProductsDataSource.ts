import { DataFrameDTO, DataQueryRequest, DataSourceInstanceSettings, FieldType, TestDataSourceResponse } from '@grafana/data';
import { BackendSrv, TemplateSrv, getBackendSrv, getTemplateSrv } from '@grafana/runtime';
import { DataSourceBase } from 'core/DataSourceBase';
import { ProductQuery, ProductResponseProperties, Properties, PropertiesOptions, QueryProductResponse } from './types';
import { QueryBuilderOption, Workspace } from 'core/types';
import { parseErrorMessage } from 'core/errors';
import { getVariableOptions } from 'core/utils';

export class ProductsDataSource extends DataSourceBase<ProductQuery> {
  constructor(
    readonly instanceSettings: DataSourceInstanceSettings,
    readonly backendSrv: BackendSrv = getBackendSrv(),
    readonly templateSrv: TemplateSrv = getTemplateSrv()
  ) {
    super(instanceSettings, backendSrv, templateSrv);
    this.workspaceLoadedPromise = this.loadWorkspaces();
  }

  private workspaceLoadedPromise: Promise<void>;
  private workspacesLoaded!: () => void;

  readonly workspacesCache = new Map<string, Workspace>([]);
  areWorkspacesLoaded$ = new Promise<void>(resolve => this.workspacesLoaded = resolve);
  error = '';

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
    recordCount: 1000,
    queryBy: ''
  };

  async queryProducts(orderBy: string, projection: Properties[], filter?: string, recordCount = 1000, descending = false, returnCount = false): Promise<QueryProductResponse> {
    const response = await this.post<QueryProductResponse>(this.queryProductsUrl, {
      filter: filter,
      orderBy: orderBy,
      descending: descending,
      projection: projection,
      take: recordCount,
      returnCount: returnCount
    });
    return response;
  }

  async runQuery(query: ProductQuery, options: DataQueryRequest): Promise<DataFrameDTO> {
    await this.workspaceLoadedPromise;
    if (query.queryBy) {
      query.queryBy = this.templateSrv.replace(query.queryBy, options.scopedVars);
    }

    const responseData = (await this.queryProducts(query.orderBy!, query.properties!, query.queryBy, query.recordCount, query.descending)).products;

    const selectedFields = query.properties?.filter((field: Properties) => Object.keys(responseData[0]).includes(field)) || [];
    const fields = selectedFields.map((field) => {
      const fieldType = field === Properties.updatedAt ? FieldType.time : FieldType.string;
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

  public readonly globalVariableOptions = (): QueryBuilderOption[] => getVariableOptions(this);


  shouldRunQuery(query: ProductQuery): boolean {
    return true;
  }

  async testDatasource(): Promise<TestDataSourceResponse> {
    // TODO: Implement a health and authentication check
    await this.backendSrv.get(this.baseUrl + '/');
    return { status: 'success', message: 'Data source connected and authentication successful!' };
  }

  private async loadWorkspaces(): Promise<void> {
    if (this.workspacesCache.size > 0) {
      return;
    }

    const workspaces = await this.getWorkspaces()
      .catch(error => {
        this.error = parseErrorMessage(error)!;
      });

    workspaces?.forEach(workspace => this.workspacesCache.set(workspace.id, workspace));

    this.workspacesLoaded();
  }
}
