import { AppEvents, DataFrameDTO, DataQueryRequest, DataSourceInstanceSettings, FieldType, LegacyMetricFindQueryOptions, MetricFindValue, TestDataSourceResponse } from '@grafana/data';
import { BackendSrv, TemplateSrv, getBackendSrv, getTemplateSrv } from '@grafana/runtime';
import { DataSourceBase } from 'core/DataSourceBase';
import { ProductQuery, ProductResponseProperties, productsProjectionLabelLookup, ProductVariableQuery, Properties, PropertiesOptions, QueryProductResponse } from './types';
import { QueryBuilderOption, Workspace } from 'core/types';
import { extractErrorInfo } from 'core/errors';
import { ExpressionTransformFunction, multipleValuesQuery, timeFieldsQuery, transformComputedFieldsQuery } from 'core/query-builder.utils';
import { ProductsQueryBuilderFieldNames } from './constants/ProductsQueryBuilder.constants';
import { getWorkspaceName } from 'core/utils';
import { catchError, concatMap, forkJoin, lastValueFrom, map, Observable, of } from 'rxjs';

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

  queryProducts(
    orderBy?: string,
    projection?: Properties[],
    filter?: string,
    take?: number,
    descending = false,
    returnCount = false
  ): Observable<QueryProductResponse> {
    return this.post$<QueryProductResponse>(
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
    ).pipe(
      catchError((error) => {
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
      })
    );
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

  runQuery(query: ProductQuery, options: DataQueryRequest): Observable<DataFrameDTO> {
    return forkJoin([
      this.workspaceLoadedPromise,
      this.partNumberLoadedPromise
    ]).pipe(
      concatMap(() => {
        if (query.properties?.length === 0 || query.recordCount === undefined) {
          return of({
            refId: query.refId,
            name: query.refId,
            fields: [],
          });
        }

        if (query.queryBy) {
          query.queryBy = transformComputedFieldsQuery(
            this.templateSrv.replace(query.queryBy, options.scopedVars),
            this.productsComputedDataFields,
          );
        }
  
        return this.queryProducts(
          query.orderBy,
          query.properties,
          query.queryBy,
          query.recordCount,
          query.descending
        ).pipe(
          map(({ products }) => {
            const selectedFields =
              products && products.length > 0
                ? query.properties?.filter(
                    (field: Properties) => field in products[0]
                  ) ?? []
                : query.properties ?? [];

            const fields = selectedFields.map((field) => {
              const isTimeField = field === PropertiesOptions.UPDATEDAT;
              const fieldType = isTimeField ? FieldType.time : FieldType.string;

              return {
                name: productsProjectionLabelLookup[field].label,
                values: this.getFieldValues(products, field),
                type: fieldType,
              };
            });

            return {
              refId: query.refId,
              name: query.refId,
              fields,
            };
          })
        );
      })
    );
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

      const metadata = await lastValueFrom(this.queryProducts(
        PropertiesOptions.PART_NUMBER,
        [Properties.partNumber, Properties.name],
        filter
      ).pipe(map(response => response.products)));
  
      const productOptions = metadata ? metadata.map(frame => ({ text: `${frame.name} (${frame.partNumber})`, value: frame.partNumber })) : [];
      return productOptions.sort((a, b) => a.text.localeCompare(b.text));  
    }

  readonly productsComputedDataFields = new Map<string, ExpressionTransformFunction>(
    Object.values(ProductsQueryBuilderFieldNames).map(field => [
      field,
      field === ProductsQueryBuilderFieldNames.UPDATED_AT
        ? timeFieldsQuery(field)
        : multipleValuesQuery(field)
    ])
  );

  private getFieldValues(
    products: ProductResponseProperties[],
    field: Properties
  ): string[] {
    return products.map(product => {
      const value = product[field];
      switch (field) {
        case Properties.properties:
          return value && Object.keys(value).length > 0 ? JSON.stringify(value) : '';
        case Properties.workspace:
          const workspace = this.workspacesCache.get(value);
          return workspace ? getWorkspaceName([workspace], value) : value;
        default:
          return value == null ? '' : value;
      }
    });
  }

  private getVariableOptions() {
    return this.templateSrv
      .getVariables()
      .map(variable => ({ label: '$' + variable.name, value: '$' + variable.name }));
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
