import { DataFrameDTO, DataQueryRequest, DataSourceInstanceSettings, FieldType, TestDataSourceResponse } from '@grafana/data';
import { BackendSrv, TemplateSrv, getBackendSrv, getTemplateSrv } from '@grafana/runtime';
import { DataSourceBase } from 'core/DataSourceBase';
import { OrderByOptions, OutputType, ProductResponseProperties, Properties, PropertiesWithProjections, QueryProductResponse, QueryTestPlansResponse, TestPlanResponseProperties, TestPlansQuery } from './types';
import { Workspace } from 'core/types';
import { parseErrorMessage } from 'core/errors';
import { getWorkspaceName } from 'core/utils';
import { isTimeField } from './utils';

export class TestPlansDataSource extends DataSourceBase<TestPlansQuery> {
  constructor(
    readonly instanceSettings: DataSourceInstanceSettings,
    readonly backendSrv: BackendSrv = getBackendSrv(),
    readonly templateSrv: TemplateSrv = getTemplateSrv()
  ) {
    super(instanceSettings, backendSrv, templateSrv);
    this.workspaceLoadedPromise = this.loadWorkspaces();
    this.partNumberLoadedPromise = this.getProductPartNumbers();
  }

  baseUrl = `${this.instanceSettings.url}/niworkorder/v1`;
  queryTestPlansUrl = `${this.baseUrl}/query-testplans`;
  queryProductsUrl = `${this.instanceSettings.url}/nitestmonitor/v2/query-products`;

  defaultQuery = {
    outputType: OutputType.Properties,
    properties: [
      PropertiesWithProjections.get(Properties.NAME)!,
      PropertiesWithProjections.get(Properties.STATE)!,
      PropertiesWithProjections.get(Properties.ASSIGNED_TO)!,
      PropertiesWithProjections.get(Properties.PRODUCT)!,
      PropertiesWithProjections.get(Properties.DUT_ID)!,
      PropertiesWithProjections.get(Properties.PLANNED_START_DATE_TIME)!,
      PropertiesWithProjections.get(Properties.ESTIMATED_DURATION_IN_SECONDS)!,
      PropertiesWithProjections.get(Properties.SYSTEM_ID)!,
      PropertiesWithProjections.get(Properties.UPDATED_AT)!
    ],
    orderBy: OrderByOptions.UPDATED_AT,
    descending: true,
    recordCount: 1000
  };

  readonly workspacesCache = new Map<string, Workspace>([]);
  readonly partNumbersCache = new Map<string, string>([]);

  private workspaceLoadedPromise: Promise<void>;
  private partNumberLoadedPromise: Promise<void>;
  arePartNumberLoaded$ = new Promise<void>(resolve => this.partNumberLoaded = resolve);
  error = '';

  areWorkspacesLoaded$ = new Promise<void>(resolve => this.workspacesLoaded = resolve);

  private workspacesLoaded!: () => void;
  private partNumberLoaded!: () => void;

  async runQuery(query: TestPlansQuery, { range }: DataQueryRequest): Promise<DataFrameDTO> {
    await this.workspaceLoadedPromise;
    await this.partNumberLoadedPromise;

    const projection = query.properties?.map(property => property.projection || property.id).flat();
    const testPlans = (
      await this.queryTestPlans(
        query.orderBy,
        projection,
        query.recordCount,
        query.descending
      )).testPlans;

    if (testPlans.length > 0) {
      const fields = query.properties?.map((property) => {
        if (property.id !== Properties.WORK_ORDER) {
          const field = property.field[0];
          const isTimeFieldResult = isTimeField(field);
          const fieldType = isTimeFieldResult
            ? FieldType.time
            : FieldType.string;

          const values = testPlans
            .map(data => data[field as unknown as keyof TestPlanResponseProperties] as any);

          const fieldValues = values.map(value => {
            switch (property.id) {
              case Properties.PROPERTIES:
                return value == null ? '' : JSON.stringify(value);
              case Properties.WORKSPACE:
                const workspace = this.workspacesCache.get(value);
                return workspace ? getWorkspaceName([workspace], value) : value;
              case Properties.PRODUCT:
                return value == null ? '' : `${this.partNumbersCache.get(value) ?? ''} (${value})`;
              default:
                return value == null ? '' : value;
            }
          });

          return {
            name: property.label,
            values: fieldValues,
            type: fieldType
          };
        }
        const values = testPlans
          .map(data => `
            ${data['workOrderName'] || ''} 
            ${data['workOrderId'] ? `(${data['workOrderId']})` : ''} `);

        const fieldValues = values.map(value => {
          return value == null ? '' : value;
        });

        return {
          name: property.label,
          values: fieldValues,
          type: FieldType.string
        };
      });
      return {
        refId: query.refId,
        fields: fields ?? []
      };
    }
    return {
      refId: query.refId,
      fields: []
    }
  }

  async queryTestPlans(
    orderBy?: string,
    projection?: string[],
    take?: number,
    descending = false,
    returnCount = false
  ): Promise<QueryTestPlansResponse> {
    try {
      const response = await this.post<QueryTestPlansResponse>(this.queryTestPlansUrl, {
        orderBy,
        descending,
        projection,
        take,
        returnCount
      });
      return response;
    } catch (error) {
      throw new Error(`An error occurred while querying test plans: ${error} `);
    }
  }

  async queryProducts(
    orderBy?: string,
    filter?: string,
    take?: number,
    descending = false,
    returnCount = false
  ): Promise<ProductResponseProperties[]> {
    try {
      const response = await this.post<QueryProductResponse>(this.queryProductsUrl, {
        filter,
        orderBy,
        descending,
        projection: ['PART_NUMBER', 'NAME'],
        take,
        returnCount
      });
      return response.products;
    } catch (error) {
      throw new Error(`An error occurred while querying products: ${error} `);
    }
  }

  shouldRunQuery(query: TestPlansQuery): boolean {
    return true;
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
    const products = await this.queryProducts()
      .catch(error => {
        this.error = parseErrorMessage(error)!;
      });

    products?.forEach(product => this.partNumbersCache.set(product.partNumber, product.name ?? ''));

    this.partNumberLoaded();
  }

  async testDatasource(): Promise<TestDataSourceResponse> {
    await this.post(this.queryTestPlansUrl, { take: 1 });
    return { status: 'success', message: 'Data source connected and authentication successful!' };
  }
}
