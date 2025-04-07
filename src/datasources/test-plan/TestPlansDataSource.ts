import { DataFrameDTO, DataQueryRequest, DataSourceInstanceSettings, DataSourceJsonData, FieldType, LegacyMetricFindQueryOptions, MetricFindValue, TestDataSourceResponse } from '@grafana/data';
import { BackendSrv, TemplateSrv, getBackendSrv, getTemplateSrv } from '@grafana/runtime';
import { DataSourceBase } from 'core/DataSourceBase';
import { OutputType, QueryTestPlansResponse, TestPlansResponseProperties, TestPlansQuery, TestPlansProperties, TestPlansPropertiesOptions, TestPlansVariableQuery } from './types';
import { QueryBuilderOption, Workspace } from 'core/types';
import { parseErrorMessage } from 'core/errors';
import { ExpressionTransformFunction, transformComputedFieldsQuery } from 'core/query-builder.utils';
import { TestPlanQueryBuilderFieldNames } from './constants/TestPlanQueryBuilder.constants';
import { QueryBuilderOperations } from 'core/query-builder.constants';

export class TestPlansDataSource extends DataSourceBase<TestPlansQuery, DataSourceJsonData> {
  constructor(
    readonly instanceSettings: DataSourceInstanceSettings,
    readonly backendSrv: BackendSrv = getBackendSrv(),
    readonly templateSrv: TemplateSrv = getTemplateSrv()
  ) {
    super(instanceSettings, backendSrv, templateSrv);
    this.error = '';
    this.workspaceLoadedPromise = this.loadWorkspaces();
    this.partNumberLoadedPromise = this.getProductPartNumbers();
  }

  areWorkspacesLoaded$ = new Promise<void>(resolve => this.workspacesLoaded = resolve);
  arePartNumberLoaded$ = new Promise<void>(resolve => this.partNumberLoaded = resolve);
  error = '';

  defaultQuery = {
    properties: [
      TestPlansPropertiesOptions.UPDATED_AT,
      TestPlansPropertiesOptions.WORKSPACE
    ] as TestPlansProperties[],
    outputType: OutputType.Data,
    recordCount: 1000,
  };
  // TODO: set base path of the service
  baseUrl = this.instanceSettings.url;
  queryProductValuesUrl = this.baseUrl + '/nitestmonitor/v2/query-product-values';
  queryTestPlansUrl = this.baseUrl + '/niworkorder/v1/query-workorders';

  readonly workspacesCache = new Map<string, Workspace>([]);
  readonly partNumbersCache = new Map<string, string>([]);

  readonly globalVariableOptions = (): QueryBuilderOption[] => this.getVariableOptions();
  readonly productsComputedDataFields = new Map<string, ExpressionTransformFunction>(
    Object.values(TestPlanQueryBuilderFieldNames).map(field => [
      field,
      field === TestPlanQueryBuilderFieldNames.UPDATED_AT
        ? this.updatedAtQuery
        : this.multipleValuesQuery(field)
    ])
  );

  private workspaceLoadedPromise: Promise<void>;
  private partNumberLoadedPromise: Promise<void>;

  private workspacesLoaded!: () => void;
  private partNumberLoaded!: () => void;

  private getVariableOptions() {
    return this.templateSrv
      .getVariables()
      .map(variable => ({ label: '$' + variable.name, value: '$' + variable.name }));
  }

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

  async runQuery(query: TestPlansQuery, { range }: DataQueryRequest): Promise<DataFrameDTO> {
    await this.workspaceLoadedPromise;
    await this.partNumberLoadedPromise;


    return await this.queryTestPlans(
      query.orderBy,
      query.queryBy,
      query.recordCount,
      query.descending,
      true
    ).then(response => {
      const selectedFields = Object.keys(TestPlansProperties);
      const fields = selectedFields.map(field => {
        const isTimeField = field === TestPlansPropertiesOptions.UPDATED_AT || field === TestPlansPropertiesOptions.CREATED_AT;
        const fieldType = isTimeField ? FieldType.time : FieldType.string;
        const values = response.testPlans.map((data: TestPlansResponseProperties) => data[field as unknown as keyof TestPlansResponseProperties]);
        return { name: field, values, type: fieldType };
      });

      const dataFrame: DataFrameDTO = {
        refId: query.refId,
        fields,
      };

      return dataFrame;
    }
    ).catch(error => {
      this.error = parseErrorMessage(error.message)!;
      return {
        refId: query.refId,
        fields: [],
      };
    });
  }

  async queryTestPlans(
    orderBy?: string,
    filter?: string,
    take?: number,
    descending = false,
    returnCount = false
  ): Promise<QueryTestPlansResponse> {
    try {
      const response = await this.post<QueryTestPlansResponse>(this.queryTestPlansUrl, {
        filter,
        orderBy,
        descending,
        take,
        returnCount
      });
      return response;
    } catch (error) {
      throw new Error(`An error occurred while querying work orders: ${error}`);
    }
  }

  shouldRunQuery(query: TestPlansQuery): boolean {
    return true;
  }
  async metricFindQuery(query: TestPlansVariableQuery, options: LegacyMetricFindQueryOptions): Promise<MetricFindValue[]> {
    console.log('metricFindQuery', query, options);
    let testPlanFilter = query?.queryBy ?? '';
    testPlanFilter = this.templateSrv.replace(testPlanFilter, options.scopedVars);
    testPlanFilter = transformComputedFieldsQuery(
      testPlanFilter,
      this.productsComputedDataFields
    );

    return await this.queryTestPlans(
      testPlanFilter
    ).then(response => {
      const testPlans = response.testPlans;
      const testPlanValues = testPlans.map(testPlan => {
        return `${testPlan.name} (${testPlan.id})`;
      });
      return testPlanValues.map(value => ({ text: value, value }));
    });
  }


  async testDatasource(): Promise<TestDataSourceResponse> {
    // TODO: Implement a health and authentication check
    await this.backendSrv.post(`${this.queryTestPlansUrl}`, { take: 1 });
    return { status: 'success', message: 'Data source connected and authentication successful!' };
  }
  private updatedAtQuery(value: string, operation: string): string {
    const formattedValue = value === '${__now:date}' ? new Date().toISOString() : value;
    return `${TestPlanQueryBuilderFieldNames.UPDATED_AT} ${operation} "${formattedValue}"`;
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

  async queryProductValues(): Promise<string[]> {
    try {
      return await this.post<string[]>(this.queryProductValuesUrl, {
        field: 'partNumber',
      });
    } catch (error) {
      throw new Error(`An error occurred while querying product values: ${error}`);
    }
  }

  private async getProductPartNumbers(): Promise<void> {
    if (this.partNumbersCache.size > 0) {
      return;
    }
    const partNumbers = await this.queryProductValues()
      .catch(error => {
        this.error = parseErrorMessage(error)!;
      });

    partNumbers?.forEach(partNumber => this.partNumbersCache.set(partNumber, partNumber));

    this.partNumberLoaded();
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
}
