import { DataFrameDTO, DataQueryRequest, DataSourceInstanceSettings, FieldType, TestDataSourceResponse } from '@grafana/data';
import { BackendSrv, TemplateSrv, getBackendSrv, getTemplateSrv } from '@grafana/runtime';
import { DataSourceBase } from 'core/DataSourceBase';
import { AssetModel, AssetsResponse, OrderByOptions, OutputType, ProductResponseProperties, Properties, PropertiesWithProjections, QueryProductResponse, QuerySystemsResponse, QueryTemplatesResponse, QueryTestPlansResponse, QueryUsersResponse, SystemProperties, TemplateResponseProperties, TestPlanResponseProperties, TestPlansQuery, UserResponseProperties } from './types';
import { QueryResponse, Workspace } from 'core/types';
import { parseErrorMessage } from 'core/errors';
import { getWorkspaceName, queryInBatches, queryUntilComplete, queryUsingSkip } from 'core/utils';
import { formatDuration, isTimeField } from './utils';
import { QUERY_TEST_PLANS_MAX_TAKE, QUERY_TEST_PLANS_REQUEST_PER_SECOND, QUERY_USERS_MAX_TAKE, QUERY_USERS_REQUEST_PER_SECOND } from './constants/QueryTestPlans.constants';

export class TestPlansDataSource extends DataSourceBase<TestPlansQuery> {
  constructor(
    readonly instanceSettings: DataSourceInstanceSettings,
    readonly backendSrv: BackendSrv = getBackendSrv(),
    readonly templateSrv: TemplateSrv = getTemplateSrv()
  ) {
    super(instanceSettings, backendSrv, templateSrv);
    this.workspaceLoadedPromise = this.loadWorkspaces();
    this.partNumberLoadedPromise = this.getProductPartNumbers();
    this.usersLoadedPromise = this.getUsers();
  }

  baseUrl = `${this.instanceSettings.url}/niworkorder/v1`;
  queryTestPlansUrl = `${this.baseUrl}/query-testplans`;
  queryProductsUrl = `${this.instanceSettings.url}/nitestmonitor/v2/query-products`;
  queryTemplatesUrl = `${this.baseUrl}/query-testplan-templates`;
  queryAssetsUrl = `${this.instanceSettings.url}/niapm/v1/query-assets`;
  queryUsersUrl = `${this.instanceSettings.url}/niuser/v1/users/query`;
  querySystemsUrl = `${this.instanceSettings.url}/nisysmgmt/v1/query-systems`;

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
  readonly usersCache = new Map<string, string>([]);

  private workspaceLoadedPromise: Promise<void>;
  private partNumberLoadedPromise: Promise<void>;
  private usersLoadedPromise: Promise<void>;

  arePartNumberLoaded$ = new Promise<void>(resolve => this.partNumberLoaded = resolve);
  areWorkspacesLoaded$ = new Promise<void>(resolve => this.workspacesLoaded = resolve);
  areUsersLoaded$ = new Promise<void>(resolve => this.usersLoaded = resolve);
  error = '';


  private workspacesLoaded!: () => void;
  private partNumberLoaded!: () => void;
  private usersLoaded!: () => void;

  async runQuery(query: TestPlansQuery, { range }: DataQueryRequest): Promise<DataFrameDTO> {
    await this.workspaceLoadedPromise;
    await this.partNumberLoadedPromise;
    await this.usersLoadedPromise;

    const projection = query.properties?.map(property => property.projection || property.id).flat();
    const testPlans = (
      await this.queryTestPlansInBatches(
        query.orderBy,
        projection,
        query.recordCount,
        query.descending,
        true
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
        allFixtureNames = await this.queryAssetsInBatches(fixtureIds.map(data => data.fixtureIds).flat());
      }

      let systemNames: SystemProperties[] = [];
      if (query.properties?.find(property => property.id === Properties.SYSTEM_NAME)) {
        systemNames = await this.querySystemsInBatches();
      }


      let dutNames: AssetModel[] = [];
      if (query.properties?.find(property => property.id === Properties.DUT_ID)) {
        const dutIds = testPlans
          .map(data => data['dutId'] as string)
          .filter(data => data != null);
        dutNames = await this.queryAssetsInBatches(dutIds);
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
            } else if (property.id === Properties.SYSTEM_NAME) {
              return data['systemId'];
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
              return names ? names.filter((name: string) => name !== '').join(', ') : value;
            case Properties.SYSTEM_NAME:
              const system = systemNames.find(system => system.id === value);
              return system ? system.alias : value;
            case Properties.DUT_ID:
              const dut = dutNames.find(data => data.id === value);
              return dut ? `${dut.name}` : value;
            case Properties.ESTIMATED_DURATION_IN_SECONDS:
              return value ? formatDuration(value) : '';
            case Properties.ASSIGNED_TO:
            case Properties.CREATED_BY:
            case Properties.UPDATED_BY:
              const user = this.usersCache.get(value);
              return user ? user : value;
            default:
              return value == null && fieldType === FieldType.string ? '' : value;
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
        name: query.refId,
        fields: fields ?? []
      };
    }
    return {
      refId: query.refId,
      name: query.refId,
      fields: []
    }
  }

  async queryTestPlansInBatches(
    orderBy?: string,
    projection?: string[],
    take?: number,
    descending = false,
    returnCount = false
  ): Promise<QueryTestPlansResponse> {
    const queryRecord = async (currentTake: number, token?: string): Promise<QueryResponse<TestPlanResponseProperties>> => {
      const response = await this.queryTestPlans(
        orderBy,
        projection,
        currentTake,
        descending,
        token,
        returnCount
      );

      return {
        data: response.testPlans,
        continuationToken: response.continuationToken,
        totalCount: response.totalCount
      };
    };

    const batchQueryConfig = {
      maxTakePerRequest: QUERY_TEST_PLANS_MAX_TAKE,
      requestsPerSecond: QUERY_TEST_PLANS_REQUEST_PER_SECOND
    };
    const response = await queryInBatches(queryRecord, batchQueryConfig, take);

    return {
      testPlans: response.data,
      continuationToken: response.continuationToken,
      totalCount: response.totalCount
    };
  }

  async queryTestPlans(
    orderBy?: string,
    projection?: string[],
    take?: number,
    descending?: boolean,
    continuationToken?: string,
    returnCount = false
  ): Promise<QueryTestPlansResponse> {
    try {
      const response = await this.post<QueryTestPlansResponse>(this.queryTestPlansUrl, {
        orderBy,
        descending,
        projection: ["ID", ...(projection ?? [])],
        take,
        continuationToken,
        returnCount
      });
      return response;
    } catch (error) {
      throw new Error(`An error occurred while querying test plans: ${error} `);
    }
  }

  async queryProducts(
    take?: number,
    continuationToken?: string,
    descending = false,
    returnCount = true
  ): Promise<QueryProductResponse> {
    try {
      const response = await this.post<QueryProductResponse>(this.queryProductsUrl, {
        descending,
        projection: ['PART_NUMBER', 'NAME'],
        take,
        continuationToken,
        returnCount
      });
      return response;
    } catch (error) {
      throw new Error(`An error occurred while querying products: ${error} `);
    }
  }

  async queryUsers(
    take?: number,
    continuationToken?: string
  ): Promise<QueryUsersResponse> {
    try {
      const response = await this.post<QueryUsersResponse>(this.queryUsersUrl, {
        take,
        continuationToken
      });
      return response;
    } catch (error) {
      throw new Error(`An error occurred while querying users: ${error} `);
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

  async querySystemsInBatches(): Promise<SystemProperties[]> {
    const queryRecord = async (take: number, skip: number): Promise<QueryResponse<SystemProperties>> => {
      const response = await this.querySystems(take, skip);
      return {
        data: response.data,
        totalCount: response.count
      };
    };

    const batchQueryConfig = {
      maxTakePerRequest: QUERY_TEST_PLANS_MAX_TAKE,
      requestsPerSecond: QUERY_TEST_PLANS_REQUEST_PER_SECOND
    };
    const response = await queryUsingSkip(queryRecord, batchQueryConfig);

    return response.data;
  }

  async queryAssetsInBatches(ids: string[]): Promise<AssetModel[]> {
    const queryRecord = async (ids: string[], currentTake: number): Promise<QueryResponse<AssetModel>> => {
      const response = await this.queryAssets(ids, currentTake);
      return {
        data: response.assets,
        totalCount: response.totalCount
      };
    };

    const batchQueryConfig = {
      maxTakePerRequest: 1000,
      requestsPerSecond: QUERY_TEST_PLANS_REQUEST_PER_SECOND
    };

    let response = [];
    while (ids.length > 0) {
      const idsToQuery = ids.splice(0, batchQueryConfig.maxTakePerRequest);
      const responseChunk = await queryRecord(idsToQuery, batchQueryConfig.maxTakePerRequest);
      response.push(...responseChunk.data);
    }

    return response;
  }

  async querySystems(
    take?: number,
    skip?: number
  ): Promise<QuerySystemsResponse> {
    try {
      const response = await this.post<QuerySystemsResponse>(this.querySystemsUrl, {
        projection: "new(id, alias)",
        skip,
        take
      });
      return response;
    } catch (error) {
      throw new Error(`An error occurred while querying systems: ${error}`);
    }
  }

  async queryAssets(ids: string[], take = -1): Promise<AssetsResponse> {
    let data = {
      filter: `new[]{${ids.map(id => `"${id}"`).join(', ')}}.Contains(AssetIdentifier)`,
      take,
      returnCount: true
    };
    try {
      let response = await this.post<AssetsResponse>(this.queryAssetsUrl, data);
      return response;
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

    const queryRecord = async (currentTake: number, token?: string): Promise<QueryResponse<ProductResponseProperties>> => {
      const response = await this.queryProducts(currentTake, token);
      return {
        data: response.products,
        continuationToken: response.continuationToken,
        totalCount: response.totalCount
      };
    };
    const batchQueryConfig = {
      maxTakePerRequest: QUERY_TEST_PLANS_MAX_TAKE,
      requestsPerSecond: QUERY_TEST_PLANS_REQUEST_PER_SECOND
    };
    const response = await queryUntilComplete(queryRecord, batchQueryConfig);

    response.data?.forEach(product => this.partNumbersCache.set(product.partNumber, product));

    this.partNumberLoaded();
  }

  private async getUsers(): Promise<void> {
    if (this.usersCache.size > 0) {
      return;
    }

    const queryRecord = async (currentTake: number, token?: string): Promise<QueryResponse<UserResponseProperties>> => {
      const response = await this.queryUsers(currentTake, token);

      return {
        data: response.users,
        continuationToken: response.continuationToken,
        totalCount: response.totalCount,
      };
    };

    const batchQueryConfig = {
      maxTakePerRequest: QUERY_USERS_MAX_TAKE,
      requestsPerSecond: QUERY_USERS_REQUEST_PER_SECOND,
    };

    // Use queryUntilComplete to fetch all users until continuationToken is null
    const response = await queryUntilComplete(queryRecord, batchQueryConfig);

    response.data?.forEach(user => this.usersCache.set(user.id, `${user.firstName} ${user.lastName}`));

    this.usersLoaded();
  }

  async testDatasource(): Promise<TestDataSourceResponse> {
    await this.post(this.queryTestPlansUrl, { take: 1 });
    return { status: 'success', message: 'Data source connected and authentication successful!' };
  }
}
