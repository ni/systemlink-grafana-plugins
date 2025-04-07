import { DataFrameDTO, DataQueryRequest, DataSourceInstanceSettings, DataSourceJsonData, FieldType, LegacyMetricFindQueryOptions, MetricFindValue, TestDataSourceResponse } from '@grafana/data';
import { BackendSrv, TemplateSrv, getBackendSrv, getTemplateSrv } from '@grafana/runtime';
import { DataSourceBase } from 'core/DataSourceBase';
import { OutputType, QueryWorkOrdersResponse, WorkOrdersResponseProperties, WorkOrdersQuery, WorkOrdersProperties, WorkOrdersPropertiesOptions, WorkOrdersVariableQuery } from './types';
import { QueryBuilderOption, Workspace } from 'core/types';
import { parseErrorMessage } from 'core/errors';
import { ExpressionTransformFunction, transformComputedFieldsQuery } from 'core/query-builder.utils';
import { WorkOrderQueryBuilderFieldNames } from './constants/WorkOrderQueryBuilder.constants';
import { QueryBuilderOperations } from 'core/query-builder.constants';

export class WorkOrdersDataSource extends DataSourceBase<WorkOrdersQuery, DataSourceJsonData> {
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
      WorkOrdersPropertiesOptions.UPDATED_AT,
      WorkOrdersPropertiesOptions.WORKSPACE
    ] as WorkOrdersProperties[],
    outputType: OutputType.Data,
    recordCount: 1000,
  };
  // TODO: set base path of the service
  baseUrl = this.instanceSettings.url;
  queryProductValuesUrl = this.baseUrl + '/nitestmonitor/v2/query-product-values';
  queryWorkOrdersUrl = this.baseUrl + '/niworkorder/v1/query-workorders';

  readonly workspacesCache = new Map<string, Workspace>([]);
  readonly partNumbersCache = new Map<string, string>([]);

  readonly globalVariableOptions = (): QueryBuilderOption[] => this.getVariableOptions();
  readonly productsComputedDataFields = new Map<string, ExpressionTransformFunction>(
    Object.values(WorkOrderQueryBuilderFieldNames).map(field => [
      field,
      field === WorkOrderQueryBuilderFieldNames.UPDATED_AT
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

  async runQuery(query: WorkOrdersQuery, { range }: DataQueryRequest): Promise<DataFrameDTO> {
    await this.workspaceLoadedPromise;
    await this.partNumberLoadedPromise;


    return await this.queryWorkOrders(
      query.orderBy,
      query.queryBy,
      query.recordCount,
      query.descending,
      true
    ).then(response => {
      const selectedFields = Object.keys(WorkOrdersProperties);
      const fields = selectedFields.map(field => {
        const isTimeField = field === WorkOrdersPropertiesOptions.UPDATED_AT || field === WorkOrdersPropertiesOptions.CREATED_AT;
        const fieldType = isTimeField ? FieldType.time : FieldType.string;
        const values = response.workOrders.map((data: WorkOrdersResponseProperties) => data[field as unknown as keyof WorkOrdersResponseProperties]);
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

  async queryWorkOrders(
    orderBy?: string,
    filter?: string,
    take?: number,
    descending = false,
    returnCount = false
  ): Promise<QueryWorkOrdersResponse> {
    try {
      const response = await this.post<QueryWorkOrdersResponse>(this.queryWorkOrdersUrl, {
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

  shouldRunQuery(query: WorkOrdersQuery): boolean {
    return true;
  }
  async metricFindQuery(query: WorkOrdersVariableQuery, options: LegacyMetricFindQueryOptions): Promise<MetricFindValue[]> {
    console.log('metricFindQuery', query, options);
    let workOrderFilter = query?.queryBy ?? '';
    workOrderFilter = this.templateSrv.replace(workOrderFilter, options.scopedVars);
    workOrderFilter = transformComputedFieldsQuery(
      workOrderFilter,
      this.productsComputedDataFields
    );

    return await this.queryWorkOrders(
      workOrderFilter
    ).then(response => {
      const workOrders = response.workOrders;
      const workOrderValues = workOrders.map(workOrder => {
        return `${workOrder.name} (${workOrder.id})`;
      });
      return workOrderValues.map(value => ({ text: value, value }));
    });
  }


  async testDatasource(): Promise<TestDataSourceResponse> {
    // TODO: Implement a health and authentication check
    await this.backendSrv.post(`${this.queryWorkOrdersUrl}`, { take: 1 });
    return { status: 'success', message: 'Data source connected and authentication successful!' };
  }
  private updatedAtQuery(value: string, operation: string): string {
    const formattedValue = value === '${__now:date}' ? new Date().toISOString() : value;
    return `${WorkOrderQueryBuilderFieldNames.UPDATED_AT} ${operation} "${formattedValue}"`;
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
