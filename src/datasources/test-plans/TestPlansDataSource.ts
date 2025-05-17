import { DataFrameDTO, DataQueryRequest, DataSourceInstanceSettings, FieldType, TestDataSourceResponse } from '@grafana/data';
import { BackendSrv, TemplateSrv, getBackendSrv, getTemplateSrv } from '@grafana/runtime';
import { DataSourceBase } from 'core/DataSourceBase';
import { AssetModel, AssetsResponse, OrderByOptions, OutputType, ProductResponseProperties, Properties, PropertiesWithProjections, QueryProductResponse, QueryTemplatesResponse, QueryTestPlansResponse, TemplateResponseProperties, TestPlanResponseProperties, TestPlansQuery } from './types';
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
  queryTemplatesUrl = `${this.baseUrl}/query-testplan-templates`;
  queryAssetsUrl = `${this.instanceSettings.url}/niapm/v1/query-assets`;

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
  readonly partNumbersCache = new Map<string, ProductResponseProperties>([]);

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
      let templates: TemplateResponseProperties[] = [];
      if (query.properties?.find(property => property.id === Properties.TEMPLATE)) {
        const templateIds = testPlans
          .map(data => data['templateId'] as string)
          .filter(id => id != null);
        templates = await this.queryTestPlanTemplates(templateIds);
      }

      let allFixtureNames: AssetModel[] = [];
      if (query.properties?.find(property => property.id === Properties.FIXTURE_IDS)) {
        const fixtureIds: Array<{ id: string, fixtureIds: string[] }> = testPlans
          .map(data => ({ id: data.id, fixtureIds: data['fixtureIds'] as string[] }) as { id: string, fixtureIds: string[] })
          .filter(data => data.fixtureIds.length > 0);
        allFixtureNames = await this.queryAssets(fixtureIds.map(data => data.fixtureIds).flat());

      }

      const fields = query.properties?.map((property) => {
        const field = property.field[0];
        const isTimeFieldResult = isTimeField(field);
        const fieldType = isTimeFieldResult
          ? FieldType.time
          : FieldType.string;

        const values = testPlans
          .map(data => {
            if (property.id === Properties.WORK_ORDER) {
              const workOrderName = data['workOrderName'] || '';
              const workOrderId = data['workOrderId'] ? `(${data['workOrderId']})` : '';
              return `${workOrderName} ${workOrderId}`;
            } else if (property.id === Properties.TEMPLATE) {
              return data['templateId'];
            }
            return data[field as unknown as keyof TestPlanResponseProperties] as any;
          });

        const fieldValues = values.map(value => {
          switch (property.id) {
            case Properties.PROPERTIES:
              return value == null ? '' : JSON.stringify(value);
            case Properties.WORKSPACE:
              const workspace = this.workspacesCache.get(value);
              return workspace ? getWorkspaceName([workspace], value) : value;
            case Properties.PRODUCT:
              const product = this.partNumbersCache.get(value);
              return product ? `${product.name} (${product.partNumber})` : value;
            case Properties.TEMPLATE:
              const template = templates.find(template => template.id === value);
              return template ? `${template.name} (${template.id})` : value;
            case Properties.FIXTURE_IDS:
              const names = value.map((id: string) => allFixtureNames.find(data => data.id === id)?.name);
              return names ? names.join(', ') : value;
            default:
              return value == null ? '' : value;
          }
        });

        return {
          name: property.label,
          values: fieldValues,
          type: fieldType
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
        projection: ["ID", ...(projection ?? [])],
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

  async queryTestPlanTemplates(templateIds: string[]): Promise<TemplateResponseProperties[]> {
    try {
      const filter = templateIds.map(id => `id = "${id}"`).join(' || ');
      const response = await this.post<QueryTemplatesResponse>(this.queryTemplatesUrl, {
        filter
      });
      return response.testPlanTemplates;
    } catch (error) {
      throw new Error(`An error occurred while querying products: ${error} `);
    }
  }

  async queryAssets(ids: string[], take = -1): Promise<AssetModel[]> {
    let data = {
      filter: `new[]{${ids.map(id => `"${id}"`).join(', ')}}.Contains(AssetIdentifier)`,
      take
    };
    try {
      let response = await this.post<AssetsResponse>(this.queryAssetsUrl, data);
      return response.assets;
    } catch (error) {
      throw new Error(`An error occurred while querying assets: ${error}`);
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

    products?.forEach(product => this.partNumbersCache.set(product.partNumber, product));

    this.partNumberLoaded();
  }

  async testDatasource(): Promise<TestDataSourceResponse> {
    await this.post(this.queryTestPlansUrl, { take: 1 });
    return { status: 'success', message: 'Data source connected and authentication successful!' };
  }
}
