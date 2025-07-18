import { AppEvents, DataFrameDTO, DataQueryRequest, DataSourceInstanceSettings, FieldType, LegacyMetricFindQueryOptions, MetricFindValue, TestDataSourceResponse } from '@grafana/data';
import { BackendSrv, TemplateSrv, getBackendSrv, getTemplateSrv } from '@grafana/runtime';
import { DataSourceBase } from 'core/DataSourceBase';
import { ProductQuery, ProductResponseProperties, productsProjectionLabelLookup, ProductVariableQuery, Properties, PropertiesOptions, QueryProductResponse } from './types';
import { QueryBuilderOption, Workspace } from 'core/types';
import { extractErrorInfo } from 'core/errors';
import { ExpressionTransformFunction, transformComputedFieldsQuery } from 'core/query-builder.utils';
import { QueryBuilderOperations } from 'core/query-builder.constants';
import { ProductsQueryBuilderFieldNames } from './constants/ProductsQueryBuilder.constants';
import { alarmData } from './constants/alarms';

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

  groupAlarmsByInterval(alarmData: Array<{ occurredAt: number; count: number }>, intervalMs: number, descending: boolean) {
    if (alarmData.length === 0) {return [];}
    const sortedAlarms = [...alarmData].sort((a, b) => a.occurredAt - b.occurredAt);

    const result: Array<{ intervalStart: number; totalCount: number }> = [];
    let startIdx = 0;

    while (startIdx < sortedAlarms.length) {
      const intervalStart = sortedAlarms[startIdx].occurredAt;
      const intervalEnd = intervalStart + intervalMs;
      let totalCount = 0;
      let endIdx = startIdx;
      while (
        endIdx < sortedAlarms.length &&
        sortedAlarms[endIdx].occurredAt >= intervalStart &&
        sortedAlarms[endIdx].occurredAt < intervalEnd
      ) {
        totalCount += sortedAlarms[endIdx].count;
        endIdx++;
      }
      result.push({ intervalStart, totalCount });
      startIdx = endIdx;
    }
    return result;
  }

  async runQuery(query: ProductQuery, options: DataQueryRequest): Promise<DataFrameDTO> {
    let intervalMsInDashboard = options.intervalMs;
    const grouped = this.groupAlarmsByInterval(alarmData, intervalMsInDashboard, query.descending);

    return {
      refId: query.refId,
      name: 'Alarm Data',
      fields: [
        {
          name: 'occurredAtTime',
          type: FieldType.time,
          values: grouped.map(g => g.intervalStart)
        },
        {
          name: 'count',
          type: FieldType.number,
          values: grouped.map(g => g.totalCount)
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
