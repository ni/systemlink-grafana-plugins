import { AppEvents, DataFrameDTO, DataQueryRequest, DataSourceInstanceSettings, FieldType, LegacyMetricFindQueryOptions, MetricFindValue, ScopedVars, TestDataSourceResponse } from '@grafana/data';
import { BackendSrv, TemplateSrv, getBackendSrv, getTemplateSrv } from '@grafana/runtime';
import { DataSourceBase } from 'core/DataSourceBase';
import { ProductQuery, ProductResponseProperties, productsProjectionLabelLookup, ProductVariableQuery, Properties, PropertiesOptions, QueryProductResponse } from './types';
import { QueryBuilderOption, Workspace } from 'core/types';
import { extractErrorInfo } from 'core/errors';
import { ExpressionTransformFunction, transformComputedFieldsQuery } from 'core/query-builder.utils';
import { QueryBuilderOperations } from 'core/query-builder.constants';
import { ProductsQueryBuilderFieldNames } from './constants/ProductsQueryBuilder.constants';
import * as alarmData from './constants/alarms.json';

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

  groupAlarmsByInterval(
    sortedAlarms: Array<{ occurredAt: number; count: number }>,
    intervalMs: number,
    descending: boolean
  ) {
    if (sortedAlarms.length === 0) {return [];}

    const result: Array<{ intervalStart: number; totalCount: number }> = [];

    if (descending) {
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
    } else {
      const minTime = sortedAlarms[0].occurredAt;
      const maxTime = sortedAlarms[sortedAlarms.length - 1].occurredAt;
      for (
        let intervalStart = minTime;
        intervalStart <= maxTime;
        intervalStart += intervalMs
      ) {
        const intervalEnd = intervalStart + intervalMs;
        const totalCount = sortedAlarms
          .filter(a => a.occurredAt >= intervalStart && a.occurredAt < intervalEnd)
          .reduce((sum, a) => sum + a.count, 0);
        result.push({ intervalStart, totalCount });
      }
    }

    return result;
  }

  transformIntoRequiredFormat(start: number, end: number){
    const occurredAtList: number[] = alarmData.alarms.flatMap(alarm =>
      alarm.transitions.map(t => Date.parse(t.occurredAt))
    );
    
    const countMap = occurredAtList.reduce((acc, time) => {
      acc[time] = (acc[time] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);
    
    const result: Array<{ occurredAt: number; count: number }> = Object.entries(countMap).map(([occurredAt, count]) => ({
      occurredAt: Number(occurredAt),
      count,
    }));
    const sortedAlarms = [...result].sort((a, b) => a.occurredAt - b.occurredAt);
    const filteredAlarms = sortedAlarms.filter(a => a.occurredAt >= start && a.occurredAt <= end);
    return filteredAlarms;
  }

  getDashboardTimeRangeFilter(scopedVars: ScopedVars): { start: number; end: number } {
    const fromDateString = '${__from:date}';
    const toDateString = '${__to:date}';
    const start = new Date(this.templateSrv.replace(fromDateString, scopedVars)).getTime();
    const end = new Date(this.templateSrv.replace(toDateString, scopedVars)).getTime();
    return { start, end };
  }

  async runQuery(query: ProductQuery, options: DataQueryRequest): Promise<DataFrameDTO> {
    console.log('options', options);
    let intervalMsInDashboard = options.intervalMs;
    const { start, end } = this.getDashboardTimeRangeFilter(options.scopedVars);
    console.log('startTimeInDashboard', start);
    console.log('endTimeInDashboard', end);
    const grouped = this.groupAlarmsByInterval(this.transformIntoRequiredFormat(start, end), intervalMsInDashboard, query.descending!);

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
