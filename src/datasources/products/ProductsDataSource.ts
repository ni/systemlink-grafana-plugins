import { DataFrameDTO, DataQueryRequest, DataSourceInstanceSettings, FieldType, TestDataSourceResponse } from '@grafana/data';
import { BackendSrv, TemplateSrv, getBackendSrv, getTemplateSrv } from '@grafana/runtime';
import { DataSourceBase } from 'core/DataSourceBase';
import { ProductQuery, ProductResponseProperties, Properties, PropertiesOptions, QueryProductResponse } from './types';
import { QueryBuilderOption, Workspace } from 'core/types';
import { parseErrorMessage } from 'core/errors';
import { getVariableOptions } from 'core/utils';
import { ExpressionTransformFunction, transformComputedFieldsQuery } from 'core/query-builder.utils';
import { QueryBuilderOperations } from 'core/query-builder.constants';
import { ProductsQueryBuilderFieldNames } from './constants/ProductsQueryBuilder.constants';

export class ProductsDataSource extends DataSourceBase<ProductQuery> {
  constructor(
    readonly instanceSettings: DataSourceInstanceSettings,
    readonly backendSrv: BackendSrv = getBackendSrv(),
    readonly templateSrv: TemplateSrv = getTemplateSrv()
  ) {
    super(instanceSettings, backendSrv, templateSrv);
    this.workspaceLoadedPromise = this.loadWorkspaces();
    this.partNumberLoadedPromise = this.getProductPartNumbers();
  }

  private workspaceLoadedPromise: Promise<void>;
  private partNumberLoadedPromise: Promise<void>;

  private workspacesLoaded!: () => void;
  private partNumberLoaded!: () => void;

  readonly workspacesCache = new Map<string, Workspace>([]);
  readonly partNumbersCache = new Map<string, string>([]);

  areWorkspacesLoaded$ = new Promise<void>(resolve => this.workspacesLoaded = resolve);
  arePartNumberLoaded$ = new Promise<void>(resolve => this.partNumberLoaded = resolve);
  error = '';

  baseUrl = this.instanceSettings.url + '/nitestmonitor';
  queryProductsUrl = this.baseUrl + '/v2/query-products';
  queryProductValuesUrl = this.baseUrl + '/v2/query-product-values';

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
    try {
      const response = await this.post<QueryProductResponse>(this.queryProductsUrl, {
        filter: filter,
        orderBy: orderBy,
        descending: descending,
        projection: projection,
        take: recordCount,
        returnCount: returnCount
      });
      return response;
    } catch (error) {
      this.error = parseErrorMessage(error as Error)!;
      throw new Error(`An error occurred while querying products: ${this.error}`);
    }
  }

  async queryProductValues(fieldName: string): Promise<string[]> {
    const response = await this.post<string[]>(this.queryProductValuesUrl, {
      field: fieldName
    });
    return response;
  }

  async runQuery(query: ProductQuery, options: DataQueryRequest): Promise<DataFrameDTO> {
    await this.workspaceLoadedPromise;
    await this.partNumberLoadedPromise;

    if (query.queryBy) {
      query.queryBy = transformComputedFieldsQuery(
        this.templateSrv.replace(query.queryBy, options.scopedVars),
        this.productsComputedDataFields,
      );
      query.queryBy = this.templateSrv.replace(query.queryBy, options.scopedVars);
    }

    const responseData = (await this.queryProducts(query.orderBy!, query.properties!, query.queryBy, query.recordCount, query.descending)).products;

    if (responseData.length > 0) {
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
    return {
      refId: query.refId,
      fields: []
    }

  }

  public readonly globalVariableOptions = (): QueryBuilderOption[] => getVariableOptions(this);


  public readonly productsComputedDataFields = new Map<string, ExpressionTransformFunction>([
    ...Object.values(ProductsQueryBuilderFieldNames).map(field => [field, this.multipleValuesQuery(field)] as [string, ExpressionTransformFunction]),
    [
      ProductsQueryBuilderFieldNames.UPDATED_AT,
      (value: string, operation: string, options?: Map<string, unknown>) => {
        if (value === '${__now:date}') {
          return `${ProductsQueryBuilderFieldNames.UPDATED_AT} ${operation} "${new Date().toISOString()}"`;
        }

        return `${ProductsQueryBuilderFieldNames.UPDATED_AT} ${operation} "${value}"`;
      }]]);

  protected multipleValuesQuery(field: string): ExpressionTransformFunction {
    return (value: string, operation: string, _options?: any) => {
      if (this.isMultiSelectValue(value)) {
        const query = this.getMultipleValuesArray(value)
          .map(val => `${field} ${operation} "${val}"`)
          .join(` ${this.getLocicalOperator(operation)} `);
        return `(${query})`;
      }

      return `${field} ${operation} "${value}"`
    }
  }

  private isMultiSelectValue(value: string): boolean {
    return value.startsWith('{') && value.endsWith('}');
  }

  private getMultipleValuesArray(value: string): string[] {
    return value.replace(/({|})/g, '').split(',');
  }

  private getLocicalOperator(operation: string): string {
    return operation === QueryBuilderOperations.EQUALS.name ? '||' : '&&';
  }

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
        this.error = parseErrorMessage(error.message)!;
      });

    workspaces?.forEach(workspace => this.workspacesCache.set(workspace.id, workspace));

    this.workspacesLoaded();
  }

  private async getProductPartNumbers(): Promise<void> {
    if (this.partNumbersCache.size > 0) {
      return;
    }
    const partNumbers = await this.queryProductValues(PropertiesOptions.PART_NUMBER)
      .catch(error => {
        this.error = parseErrorMessage(error)!;
      });

    partNumbers?.forEach(partNumber => this.partNumbersCache.set(partNumber, partNumber));

    this.partNumberLoaded();
  }
}
