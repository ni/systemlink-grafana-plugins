import { DataFrameDTO, DataQueryRequest, DataSourceInstanceSettings, FieldType, LegacyMetricFindQueryOptions, MetricFindValue, TestDataSourceResponse } from '@grafana/data';
import { BackendSrv, TemplateSrv, getBackendSrv, getTemplateSrv } from '@grafana/runtime';
import { DataSourceBase } from 'core/DataSourceBase';
import { ProductQuery, ProductResponseProperties, ProductVariableQuery, Properties, PropertiesOptions, QueryProductResponse } from './types';
import { QueryBuilderOption, Workspace } from 'core/types';
import { parseErrorMessage } from 'core/errors';
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
    orderBy: Properties.updatedAt,
    descending: true,
    recordCount: 1000,
    queryBy: ''
  };

  readonly workspacesCache = new Map<string, Workspace>([]);
  readonly partNumbersCache = new Map<string, string>([]);
  readonly familyNamesCache = new Map<string, string>([]);

  readonly globalVariableOptions = (): QueryBuilderOption[] => this.getVariableOptions();

  private workspaceLoadedPromise: Promise<void>;
  private partNumberLoadedPromise: Promise<void>;

  private workspacesLoaded!: () => void;
  private partNumberLoaded!: () => void;

  async queryProducts(
    orderBy?: string,
    projection?: Properties[],
    filter?: string,
    take?: number,
    descending = false,
    returnCount = false
  ): Promise<QueryProductResponse> {
    try {
      const response = await this.post<QueryProductResponse>(this.queryProductsUrl, {
        filter,
        orderBy,
        descending,
        projection,
        take,
        returnCount
      });
      return response;
    } catch (error) {
      this.error = parseErrorMessage(error as Error)!;
      throw new Error(`An error occurred while querying products: ${this.error}`);
    }
  }

  async queryProductValues(fieldName: string): Promise<string[]> {
    try {
      return await this.post<string[]>(this.queryProductValuesUrl, {
        field: fieldName
      });
    } catch (error) {
      this.error = parseErrorMessage(error as Error)!;
      throw new Error(`An error occurred while querying product values: ${this.error}`);
    }
  }

  async runQuery(query: ProductQuery, options: DataQueryRequest): Promise<DataFrameDTO> {
    await this.workspaceLoadedPromise;
    await this.partNumberLoadedPromise;

    if (query.queryBy) {
      query.queryBy = transformComputedFieldsQuery(
        this.templateSrv.replace(query.queryBy, options.scopedVars),
        this.productsComputedDataFields,
      );
    }

    const products = (
      await this.queryProducts(
        query.orderBy,
        query.properties,
        query.queryBy,
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

        const values = products
          .map(data => data[field as unknown as keyof ProductResponseProperties]);

        return {
          name: field,
          values: values.map(value => value != null
            ? (field === PropertiesOptions.PROPERTIES
              ? JSON.stringify(value)
              : value)
            : ''),
          type: fieldType
        };
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
    await this.get(this.baseUrl + '/v2/products?take=1');
    return { status: 'success', message: 'Data source connected and authentication successful!' };
  }

  async getFamilyNames(): Promise<void> {
    if (this.familyNamesCache.size > 0) {
      return;
    }

    const familyNames = await this.queryProductValues(PropertiesOptions.FAMILY)
      .catch(error => {
        this.error = parseErrorMessage(error)!;
      });

    familyNames?.forEach(familyName => this.familyNamesCache.set(familyName, familyName));
  }

  async metricFindQuery(query: ProductVariableQuery, options: LegacyMetricFindQueryOptions): Promise<MetricFindValue[]> {
    let metadata: ProductResponseProperties[];
    if (query.queryBy) {
      const filter = this.templateSrv.replace(query.queryBy, options.scopedVars)
      metadata = (await this.queryProducts(
        PropertiesOptions.PART_NUMBER,
        [Properties.partNumber, Properties.family],
        filter
      )).products;
    } else {
      metadata = (await this.queryProducts(
        PropertiesOptions.PART_NUMBER,
        [Properties.partNumber, Properties.family]
      )).products;
    }
    return metadata ? metadata.map(frame => ({ text: `${frame.partNumber}(${frame.family})`, value: frame.partNumber })) : [];
  }

  readonly productsComputedDataFields = new Map<string, ExpressionTransformFunction>(
    Object.values(ProductsQueryBuilderFieldNames).map(field => [
      field,
      field === ProductsQueryBuilderFieldNames.UPDATED_AT
        ? this.updatedAtQuery
        : this.multipleValuesQuery(field)
    ])
  );

  protected multipleValuesQuery(field: string): ExpressionTransformFunction {
    return (value: string, operation: string, _options?: any) => {
      const isMultiSelect = this.isMultiSelectValue(value);
      const valuesArray = this.getMultipleValuesArray(value);
      const logicalOperator = this.getLogicalOperator(operation);

      return isMultiSelect ? valuesArray
        .map(val => `${field} ${operation} "${val}"`)
        .join(` ${logicalOperator} `) : `${field} ${operation} "${value}"`;
    }
  }

  private getVariableOptions() {
    return this.templateSrv
      .getVariables()
      .map(variable => ({ label: '$' + variable.name, value: '$' + variable.name }));
  }

  private updatedAtQuery(value: string, operation: string): string {
    const formattedValue = value === '${__now:date}' ? new Date().toISOString() : value;
    return `${ProductsQueryBuilderFieldNames.UPDATED_AT} ${operation} "${formattedValue}"`;
  }

  private isMultiSelectValue(value: string): boolean {
    return value.startsWith('{') && value.endsWith('}');
  }

  private getMultipleValuesArray(value: string): string[] {
    return value.replace(/({|})/g, '').split(',');
  }

  private getLogicalOperator(operation: string): string {
    return operation === QueryBuilderOperations.EQUALS.name ? '||' : '&&';
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
