import { AppEvents, DataFrameDTO, DataQueryRequest, DataSourceInstanceSettings, FieldType, LegacyMetricFindQueryOptions, MetricFindValue, TestDataSourceResponse } from '@grafana/data';
import { BackendSrv, TemplateSrv, getBackendSrv, getTemplateSrv } from '@grafana/runtime';
import { DataSourceBase } from 'core/DataSourceBase';
import { ProductQuery, ProductResponseProperties, productsProjectionLabelLookup, ProductVariableQuery, Properties, PropertiesOptions, QueryProductResponse } from './types';
import { QueryBuilderOption, Workspace } from 'core/types';
import { extractErrorInfo } from 'core/errors';
import { ExpressionTransformFunction, transformComputedFieldsQuery } from 'core/query-builder.utils';
import { QueryBuilderOperations } from 'core/query-builder.constants';
import { ProductsQueryBuilderFieldNames } from './constants/ProductsQueryBuilder.constants';
import { getWorkspaceName } from 'core/utils';

export class ProductsDataSource extends DataSourceBase<ProductQuery> {
  constructor(
    readonly instanceSettings: DataSourceInstanceSettings,
    readonly backendSrv: BackendSrv = getBackendSrv(),
    readonly templateSrv: TemplateSrv = getTemplateSrv()
  ) {
    super(instanceSettings, backendSrv, templateSrv);
    this.errorTitle = '';
    this.errorDescription = '';
    this.workspaceLoadedPromise = this.loadWorkspaces();
    this.partNumberLoadedPromise = this.getProductPartNumbers();
  }

  areWorkspacesLoaded$ = new Promise<void>(resolve => this.workspacesLoaded = resolve);
  arePartNumberLoaded$ = new Promise<void>(resolve => this.partNumberLoaded = resolve);
  errorTitle = '';
  errorDescription = '';

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
      const response = await this.post<QueryProductResponse>(
        this.queryProductsUrl,
        {
          filter,
          orderBy,
          descending,
          projection,
          take,
          returnCount
        },
        { showErrorAlert: false },// suppress default error alert since we handle errors manually
      );
      return response;
    } catch (error) {
      const errorDetails = extractErrorInfo((error as Error).message);
      let errorMessage: string;
      if (!errorDetails.statusCode) {
        errorMessage = 'The query failed due to an unknown error.';
      } else if (errorDetails.statusCode === '504') {
        errorMessage = 'The query to fetch products experienced a timeout error. Narrow your query with a more specific filter and try again.';
      } else {
        errorMessage = `The query failed due to the following error: (status ${errorDetails.statusCode}) ${errorDetails.message}.`;
      }

      this.appEvents?.publish?.({
        type: AppEvents.alertError.name,
        payload: ['Error during product query', errorMessage],
      });

      throw new Error(errorMessage);
    }
  }

  async queryProductValues(fieldName: string): Promise<string[]> {
    return await this.post<string[]>(
      this.queryProductValuesUrl,
      {
        field: fieldName
      },
      { showErrorAlert: false },// suppress default error alert since we handle errors manually
    );
  }

  // async runQuery(query: ProductQuery, options: DataQueryRequest): Promise<DataFrameDTO> {
  //   await this.workspaceLoadedPromise;
  //   await this.partNumberLoadedPromise;

  //   if( query.properties?.length === 0 || query.recordCount === undefined ) {
  //     return {
  //       refId: query.refId,
  //       name: query.refId,
  //       fields: [],
  //     }
  //   }

  //   if (query.queryBy) {
  //     query.queryBy = transformComputedFieldsQuery(
  //       this.templateSrv.replace(query.queryBy, options.scopedVars),
  //       this.productsComputedDataFields,
  //     );
  //   }

  //   const products = (
  //     await this.queryProducts(
  //       query.orderBy,
  //       query.properties,
  //       query.queryBy,
  //       query.recordCount,
  //       query.descending
  //     )).products;

  //   const selectedFields = (products && products.length > 0)
  //     ? (query.properties?.filter(
  //       (field: Properties) => field in products[0]
  //     ) ?? [])
  //     : (query.properties ?? []);
  //   const fields = selectedFields.map((field) => {
  //     const isTimeField = field === PropertiesOptions.UPDATEDAT;
  //     const fieldType = isTimeField
  //       ? FieldType.time
  //       : FieldType.string;

  //     const values = products
  //       .map(data => data[field as unknown as keyof ProductResponseProperties]);

  //     const fieldValues = values.map(value => {
  //       switch (field) {
  //         case PropertiesOptions.PROPERTIES:
  //           return value == null ? '' : JSON.stringify(value);
  //         case PropertiesOptions.WORKSPACE:
  //           const workspace = this.workspacesCache.get(value);
  //           return workspace ? getWorkspaceName([workspace], value) : value;
  //         default:
  //           return value == null ? '' : value;
  //       }
  //     });
  //     return {
  //       name: productsProjectionLabelLookup[field].label,
  //       values: fieldValues,
  //       type: fieldType
  //     };
  //   });
  //   return {
  //     refId: query.refId,
  //     name: query.refId,
  //     fields: fields,
  //   };
  // }

  async runQuery(query: ProductQuery, options: DataQueryRequest): Promise<DataFrameDTO> {
    return {
      refId: query.refId,
      name: 'Static Data',
      fields: [
        {
          name: 'occurredAtTime',
          type: FieldType.time,
          values: [
            Date.parse('2025-07-17T00:00:00Z'),
            Date.parse('2025-07-17T00:01:00Z'),
            Date.parse('2025-07-17T00:02:00Z'),
            Date.parse('2025-07-17T00:03:00Z'),
            Date.parse('2025-07-17T00:04:00Z'),
            Date.parse('2025-07-17T00:05:00Z'),
            Date.parse('2025-07-17T00:06:00Z'),
            Date.parse('2025-07-17T00:07:00Z'),
            Date.parse('2025-07-17T00:08:00Z'),
            Date.parse('2025-07-17T00:09:00Z'),
            Date.parse('2025-07-17T00:10:00Z'),
            Date.parse('2025-07-17T00:11:00Z'),
            Date.parse('2025-07-17T00:12:00Z'),
            Date.parse('2025-07-17T00:13:00Z'),
            Date.parse('2025-07-17T00:14:00Z'),
            Date.parse('2025-07-17T00:15:00Z'),
            Date.parse('2025-07-17T00:16:00Z'),
            Date.parse('2025-07-17T00:17:00Z'),
            Date.parse('2025-07-17T00:18:00Z'),
            Date.parse('2025-07-17T00:19:00Z'),
            Date.parse('2025-07-17T00:20:00Z'),
            Date.parse('2025-07-17T00:21:00Z'),
            Date.parse('2025-07-17T00:22:00Z'),
            Date.parse('2025-07-17T00:23:00Z'),
            Date.parse('2025-07-17T00:24:00Z'),
            Date.parse('2025-07-17T00:25:00Z'),
            Date.parse('2025-07-17T00:26:00Z'),
            Date.parse('2025-07-17T00:27:00Z'),
            Date.parse('2025-07-17T00:28:00Z'),
            Date.parse('2025-07-17T00:29:00Z'),
            Date.parse('2025-07-17T00:30:00Z'),
            Date.parse('2025-07-17T00:31:00Z'),
            Date.parse('2025-07-17T00:32:00Z'),
            Date.parse('2025-07-17T00:33:00Z'),
            Date.parse('2025-07-17T00:34:00Z'),
            Date.parse('2025-07-17T00:35:00Z'),
            Date.parse('2025-07-17T00:36:00Z'),
            Date.parse('2025-07-17T00:37:00Z'),
            Date.parse('2025-07-17T00:38:00Z'),
            Date.parse('2025-07-17T00:39:00Z'),
            Date.parse('2025-07-17T00:40:00Z'),
            Date.parse('2025-07-17T00:41:00Z'),
            Date.parse('2025-07-17T00:42:00Z'),
            Date.parse('2025-07-17T00:43:00Z'),
            Date.parse('2025-07-17T00:44:00Z'),
            Date.parse('2025-07-17T00:45:00Z'),
            Date.parse('2025-07-17T00:46:00Z'),
            Date.parse('2025-07-17T00:47:00Z'),
            Date.parse('2025-07-17T00:48:00Z'),
            Date.parse('2025-07-17T00:49:00Z')
          ]
        },
        {
          name: 'count',
          type: FieldType.number,
          values: [
            14, 7, 11, 3, 16, 6, 19, 9, 12, 1,
            17, 5, 2, 20, 13, 8, 4, 18, 10, 15,
            7, 6, 9, 12, 14, 3, 16, 8, 11, 5,
            2, 19, 0, 13, 1, 10, 6, 17, 4, 15,
            7, 18, 9, 13, 3, 12, 20, 5, 8, 11
          ]
        }
      ]
    };
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
        if (!this.errorTitle) {
          this.handleQueryProductValuesError(error);
        }
      });

    familyNames?.forEach(familyName => this.familyNamesCache.set(familyName, familyName));
  }

  async metricFindQuery(query: ProductVariableQuery, options: LegacyMetricFindQueryOptions): Promise<MetricFindValue[]> {
    const filter = query.queryBy
      ? transformComputedFieldsQuery(
        this.templateSrv.replace(query.queryBy, options.scopedVars),
        this.productsComputedDataFields
      )
      : undefined;

    const metadata = (await this.queryProducts(
      PropertiesOptions.PART_NUMBER,
      [Properties.partNumber, Properties.name],
      filter
    )).products;
    return metadata ? metadata.map(frame => ({ text: `${frame.name} (${frame.partNumber})`, value: frame.partNumber })) : [];
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

      return isMultiSelect ? `(${valuesArray
        .map(val => `${field} ${operation} "${val}"`)
        .join(` ${logicalOperator} `)})` : `${field} ${operation} "${value}"`;
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
        if (!this.errorTitle) {
          this.handleQueryProductValuesError(error);
        }
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
        if (!this.errorTitle) {
          this.handleQueryProductValuesError(error);
        }
      })

    partNumbers?.forEach(partNumber => this.partNumbersCache.set(partNumber, partNumber));

    this.partNumberLoaded();
  }

  private handleQueryProductValuesError(error: unknown): void {
    const errorDetails = extractErrorInfo((error as Error).message);
    this.errorTitle = 'Warning during product value query';
    if (errorDetails.statusCode === '504') {
      this.errorDescription = `The query builder lookups experienced a timeout error. Some values might not be available. Narrow your query with a more specific filter and try again.`;
    } else {
      this.errorDescription = errorDetails.message
        ? `Some values may not be available in the query builder lookups due to the following error: ${errorDetails.message}.`
        : 'Some values may not be available in the query builder lookups due to an unknown error.';
    }
  }
}
