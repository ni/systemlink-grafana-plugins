import { AppEvents, DataFrameDTO, DataQueryRequest, DataSourceInstanceSettings, FieldType, LegacyMetricFindQueryOptions, MetricFindValue, TestDataSourceResponse } from '@grafana/data';
import { BackendSrv, TemplateSrv, getBackendSrv, getTemplateSrv } from '@grafana/runtime';
import { DataSourceBase } from 'core/DataSourceBase';
import { Asset, OrderByOptions, OutputType, Projections, Properties, PropertiesProjectionMap, QueryTemplatesResponse, QueryTestPlansResponse, TemplateResponseProperties, TestPlanResponseProperties, TestPlansQuery, TestPlansVariableQuery } from './types';
import { getWorkspaceName, queryInBatches } from 'core/utils';
import { QueryBuilderOption, QueryResponse, Workspace } from 'core/types';
import { isTimeField, transformDuration } from './utils';
import { QUERY_TEMPLATES_BATCH_SIZE, QUERY_TEMPLATES_REQUEST_PER_SECOND, QUERY_TEST_PLANS_MAX_TAKE, QUERY_TEST_PLANS_REQUEST_PER_SECOND } from './constants/QueryTestPlans.constants';
import { AssetUtils } from './asset.utils';
import { WorkspaceUtils } from 'shared/workspace.utils';
import { SystemUtils } from 'shared/system.utils';
import { computedFieldsupportedOperations, ExpressionTransformFunction, multipleValuesQuery, timeFieldsQuery, transformComputedFieldsQuery } from 'core/query-builder.utils';
import { UsersUtils } from 'shared/users.utils';
import { ProductUtils } from 'shared/product.utils';
import { extractErrorInfo } from 'core/errors';
import { User } from 'shared/types/QueryUsers.types';
import { SystemAlias } from 'shared/types/QuerySystems.types';
import { ProductPartNumberAndName } from 'shared/types/QueryProducts.types';
import { TAKE_LIMIT } from './constants/QueryEditor.constants';
import { TestPlansQueryBuilderFieldNames } from './constants/TestPlansQueryBuilder.constants';

export class TestPlansDataSource extends DataSourceBase<TestPlansQuery> {
  constructor(
    readonly instanceSettings: DataSourceInstanceSettings,
    readonly backendSrv: BackendSrv = getBackendSrv(),
    readonly templateSrv: TemplateSrv = getTemplateSrv()
  ) {
    super(instanceSettings, backendSrv, templateSrv);
    this.assetUtils = new AssetUtils(instanceSettings, backendSrv);
    this.workspaceUtils = new WorkspaceUtils(this.instanceSettings, this.backendSrv);
    this.systemUtils = new SystemUtils(instanceSettings, backendSrv);
    this.usersUtils = new UsersUtils(instanceSettings, backendSrv);
    this.productUtils = new ProductUtils(instanceSettings, backendSrv);
  }

  baseUrl = `${this.instanceSettings.url}/niworkorder/v1`;
  queryTestPlansUrl = `${this.baseUrl}/query-testplans`;
  queryTemplatesUrl = `${this.baseUrl}/query-testplan-templates`;
  errorTitle = '';
  errorDescription = '';
  assetUtils: AssetUtils;
  workspaceUtils: WorkspaceUtils;
  systemUtils: SystemUtils;
  usersUtils: UsersUtils;
  productUtils: ProductUtils;

  defaultQuery = {
    properties: [
      Properties.NAME,
      Properties.STATE,
      Properties.ASSIGNED_TO,
      Properties.PRODUCT_NAME,
      Properties.DUT_NAME,
      Properties.PLANNED_START_DATE_TIME,
      Properties.ESTIMATED_DURATION_IN_SECONDS,
      Properties.SYSTEM_NAME,
      Properties.UPDATED_AT
    ] as Properties[],
    orderBy: OrderByOptions.UPDATED_AT,
    descending: true,
    recordCount: 1000
  };

  readonly globalVariableOptions = (): QueryBuilderOption[] => this.getVariableOptions();

  async runQuery(query: TestPlansQuery, options: DataQueryRequest): Promise<DataFrameDTO> {
    const workspaces = await this.loadWorkspaces();
    const systemAliases = await this.loadSystemAliases();
    const users = await this.loadUsers();
    const products = await this.loadProductNamesAndPartNumbers();

    if (query.queryBy) {
      query.queryBy = transformComputedFieldsQuery(
        this.templateSrv.replace(query.queryBy, options.scopedVars),
        this.testPlansComputedDataFields
      );
      query.queryBy = this.transformDurationFilters(query.queryBy);
    }

    if (query.outputType === OutputType.Properties  && this.isPropertiesValid(query) && this.isRecordCountValid(query)) {
      const projectionAndFields = query.properties?.map(property => PropertiesProjectionMap[property]);
      const projection = [...new Set(projectionAndFields?.map(data => data.projection).flat())];

      const testPlans = (
        await this.queryTestPlansInBatches(
          query.queryBy,
          query.orderBy,
          projection,
          query.recordCount,
          query.descending,
        )).testPlans;

      const labels = projectionAndFields?.map(data => data.label) ?? [];
      const fixtureNames = await this.getFixtureNames(labels, testPlans);
      const duts = await this.getDuts(labels, testPlans);
      const workOrderIdAndName = this.getWorkOrderIdAndName(labels, testPlans);
      const templatesName = await this.getTemplateNames(labels, testPlans);

      const fields = projectionAndFields?.map(data => {
        const label = data.label;
        const field = data.field;
        const fieldType = FieldType.string;
        const values = testPlans.map(data => data[field as unknown as keyof TestPlanResponseProperties] as any);

        const fieldValues = values.map(value => {
          switch (label) {
            case PropertiesProjectionMap.FIXTURE_NAMES.label:
              const names = value.map((id: string) => fixtureNames.find(data => data.id === id)?.name);
              return names ? names.filter((name: string) => name !== '').join(', ') : value;
            case PropertiesProjectionMap.DUT_NAME.label:
              const dutName = duts.find(data => data.id === value);
              return dutName ? dutName.name : value;
            case PropertiesProjectionMap.DUT_SERIAL_NUMBER.label:
              const dutSerial = duts.find(data => data.id === value);
              return dutSerial ? dutSerial.serialNumber : value;
            case PropertiesProjectionMap.WORKSPACE.label:
              const workspace = workspaces.get(value);
              return workspace ? getWorkspaceName([workspace], value) : value;
            case PropertiesProjectionMap.WORK_ORDER.label:
              const workOrder = workOrderIdAndName.find(data => data.id === value);
              const workOrderName = workOrder && workOrder?.name ? workOrder.name : '';
              return workOrderName;
            case PropertiesProjectionMap.TEMPLATE.label:
              const template = templatesName.find(data => data.id === value);
              return template ? template.name : value;
            case PropertiesProjectionMap.ESTIMATED_DURATION_IN_SECONDS.label:
              return value ? transformDuration(value) : '';
            case PropertiesProjectionMap.SYSTEM_NAME.label:
              const system = systemAliases.get(value);
              return system ? system.alias : value;
            case PropertiesProjectionMap.PRODUCT_NAME.label:
              const product = products.get(value);
              return product && product.name ? product.name : value;
            case PropertiesProjectionMap.PRODUCT_ID.label:
              const productId = products.get(value);
              return productId && productId.id ? productId.id : value;
            case PropertiesProjectionMap.ASSIGNED_TO.label:
            case PropertiesProjectionMap.CREATED_BY.label:
            case PropertiesProjectionMap.UPDATED_BY.label:
              const user = users.get(value);
              return user ? UsersUtils.getUserFullName(user) : '';
            case PropertiesProjectionMap.PROPERTIES.label:
              return !!value && Object.keys(value).length > 0 ? JSON.stringify(value) : '';
            default:
              return value == null ? '' : value;
          }
        });

        return {
          name: label,
          values: fieldValues,
          type: fieldType,
        };
      });
      return {
        refId: query.refId,
        name: query.refId,
        fields: fields ?? [],
      };
    } else if (query.outputType === OutputType.TotalCount) {
      const responseData = await this.queryTestPlans(
        query.queryBy,
        query.orderBy,
        undefined,
        0,
        undefined,
        undefined,
        true
      );

      return {
        refId: query.refId,
        name: query.refId,
        fields: [{ name: query.refId, values: [responseData.totalCount] }],
      };
    }

    return {
      refId: query.refId,
      name: query.refId,
      fields: [],
    };
  }

  public async loadWorkspaces(): Promise<Map<string, Workspace>> {
    try {
      return await this.workspaceUtils.getWorkspaces();
    } catch (error) {
      if (!this.errorTitle) {
        this.handleDependenciesError(error);
      }
      return new Map<string, Workspace>();
    }
  }

  public async loadUsers(): Promise<Map<string, User>> {
    try {
      return await this.usersUtils.getUsers();
    } catch (error) {
      if (!this.errorTitle) {
        this.handleDependenciesError(error);
      }
      return new Map<string, User>();
    }
  }

  public async loadSystemAliases(): Promise<Map<string, SystemAlias>> {
    try {
      return await this.systemUtils.getSystemAliases();
    } catch (error) {
      if (!this.errorTitle) {
        this.handleDependenciesError(error);
      }
      return new Map<string, SystemAlias>();
    }
  }

  public async loadProductNamesAndPartNumbers(): Promise<Map<string, ProductPartNumberAndName>> {
    try {
      return await this.productUtils.getProductNamesAndPartNumbers();
    } catch (error) {
      if (!this.errorTitle) {
        this.handleDependenciesError(error);
      }
      return new Map<string, ProductPartNumberAndName>();
    }
  }

  shouldRunQuery(query: TestPlansQuery): boolean {
    return !query.hide;
  }

  private transformDurationFilters(query: string): string {
    const daysRegex = new RegExp(`estimatedDurationInDays\\s*(${computedFieldsupportedOperations.join('|')})\\s*"(-?\\d+)"`, 'g');
    const hoursRegex = new RegExp(`estimatedDurationInHours\\s*(${computedFieldsupportedOperations.join('|')})\\s*"(-?\\d+)"`, 'g');

    return query
      .replace(
        daysRegex,
        (_, operator, value) => `estimatedDurationInSeconds ${operator} "${parseInt(value, 10) * 86400}"`
      )
      .replace(
        hoursRegex,
        (_, operator, value) => `estimatedDurationInSeconds ${operator} "${parseInt(value, 10) * 3600}"`
      );
  }

  private async getFixtureNames(labels: string[], testPlans: TestPlanResponseProperties[]): Promise<Asset[]> {
    if (labels.find(label => label === PropertiesProjectionMap.FIXTURE_NAMES.label)) {
      const fixtureIds = testPlans
        .map(data => data['fixtureIds'] as string[])
        .filter(data => data.length > 0)
        .flat();
      return await this.assetUtils.queryAssetsInBatches(fixtureIds);
    }
    return [];
  }

  private async getDuts(labels: string[], testPlans: TestPlanResponseProperties[]): Promise<Asset[]> {
    if (labels.find(label =>
      label === PropertiesProjectionMap.DUT_NAME.label
      || label === PropertiesProjectionMap.DUT_SERIAL_NUMBER.label
    )) {
      const dutIds = testPlans
        .map(data => data['dutId'] as string)
        .filter(data => data != null);
      return await this.assetUtils.queryAssetsInBatches(dutIds);
    }
    return [];
  }

  private getWorkOrderIdAndName(labels: string[], testPlans: TestPlanResponseProperties[]): Array<{ id: string; name: string }> {
    if (labels.find(label => label === PropertiesProjectionMap.WORK_ORDER.label)) {
      return testPlans
        .map(data => ({
          id: data['workOrderId'] as string,
          name: data['workOrderName'] as string
        }))
        .filter(data => data.id != null);
    }
    return [];
  }

  private async getTemplateNames(labels: string[], testPlans: TestPlanResponseProperties[]): Promise<TemplateResponseProperties[]> {
    if (labels.find(label => label === PropertiesProjectionMap.TEMPLATE.label)) {
      const templateIds = testPlans
        .map(data => data['templateId'] as string)
        .filter(id => id != null);
      return await this.queryTestPlanTemplatesInBatches(templateIds);
    }
    return [];
  }

  async metricFindQuery(query: TestPlansVariableQuery, options: LegacyMetricFindQueryOptions): Promise<MetricFindValue[]> {
    const variableQuery = this.prepareQuery(query);
    if (!this.isRecordCountValid(variableQuery)) {
      return [];
    } 

    let filter;
    if (variableQuery.queryBy) {
      filter = transformComputedFieldsQuery(
        this.templateSrv.replace(variableQuery.queryBy, options.scopedVars),
        this.testPlansComputedDataFields
      );
      filter = this.transformDurationFilters(filter);
    }

    const metadata = (await this.queryTestPlansInBatches(
      filter,
      variableQuery.orderBy,
      [Projections.ID, Projections.NAME],
      variableQuery.recordCount,
      variableQuery.descending
    )).testPlans;
    const testPlansOptions = metadata ? metadata.map(frame => ({ text: `${frame.name} (${frame.id})`, value: frame.id })) : [];
    return testPlansOptions.sort((a, b) => a.text.localeCompare(b.text));
  }

  readonly testPlansComputedDataFields = new Map<string, ExpressionTransformFunction>(
    Object.values(TestPlansQueryBuilderFieldNames).map(queryBuilderFieldName => {
      const isTime = isTimeField(queryBuilderFieldName);
      return [
        queryBuilderFieldName, 
        isTime
          ? timeFieldsQuery(queryBuilderFieldName)
          : multipleValuesQuery(queryBuilderFieldName)
      ];
    })
  );

  async testDatasource(): Promise<TestDataSourceResponse> {
    await this.post(this.queryTestPlansUrl, { take: 1 });
    return { status: 'success', message: 'Data source connected and authentication successful!' };
  }

  async queryTestPlansInBatches(
    filter?: string,
    orderBy?: string,
    projection?: Projections[],
    take?: number,
    descending = false,
  ): Promise<QueryTestPlansResponse> {
    const queryRecord = async (currentTake: number, token?: string): Promise<QueryResponse<TestPlanResponseProperties>> => {
      const response = await this.queryTestPlans(
        filter,
        orderBy,
        projection,
        currentTake,
        descending,
        token,
      );

      return {
        data: response.testPlans,
        continuationToken: response.continuationToken,
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
    filter?: string,
    orderBy?: string,
    projection?: Projections[],
    take?: number,
    descending?: boolean,
    continuationToken?: string,
    returnCount = false
  ): Promise<QueryTestPlansResponse> {
    try {
      const response = await this.post<QueryTestPlansResponse>(
        this.queryTestPlansUrl,
        {
          filter,
          orderBy,
          descending,
          projection,
          take,
          continuationToken,
          returnCount
        },
        { showErrorAlert: false }  // suppress default error alert since we handle errors manually
      );
      return response;
    } catch (error) {
      const errorDetails = extractErrorInfo((error as Error).message);
      let errorMessage: string;
      switch (errorDetails.statusCode) {
        case '':
          errorMessage = 'The query failed due to an unknown error.';
          break;
        case '404':
          errorMessage = 'The query to fetch testplans failed because the requested resource was not found. Please check the query parameters and try again.';
          break;
        case '429':
          errorMessage = 'The query to fetch testplans failed due to too many requests. Please try again later.';
          break;
        case '504':
          errorMessage = 'The query to fetch testplans experienced a timeout error. Narrow your query with a more specific filter and try again.';
          break;
        default:
          errorMessage = `The query failed due to the following error: (status ${errorDetails.statusCode}) ${errorDetails.message}.`;
          break;
      }

      this.appEvents?.publish?.({
        type: AppEvents.alertError.name,
        payload: ['Error during testplans query', errorMessage],
      });

      throw new Error(errorMessage);
    }
  }

  async queryTestPlanTemplatesInBatches(
    templateIds: string[]
  ): Promise<TemplateResponseProperties[]> {
    const queryRecord = async (idsChunk: string[]): Promise<TemplateResponseProperties[]> => {
      return await this.queryTestPlanTemplates(idsChunk);
    };

    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
    const response: TemplateResponseProperties[] = [];
    while (templateIds.length > 0) {
      const start = Date.now();

      for (let i = 0; i < QUERY_TEMPLATES_REQUEST_PER_SECOND && templateIds.length > 0; i++) {
        const idsToQuery = templateIds.splice(0, QUERY_TEMPLATES_BATCH_SIZE);

        try {
          const template = await queryRecord(idsToQuery);
          response.push(...template);
        } catch (error) {
          console.error(`Error fetching test plan templates:`, error);
        }
      }

      const elapsed = Date.now() - start;
      if (templateIds.length > 0 && elapsed < 1000) {
        await delay(1000 - elapsed);
      }
    }

    return response;
  }

  async queryTestPlanTemplates(templateIds: string[]): Promise<TemplateResponseProperties[]> {
    try {
      const filter = templateIds.map(id => `id = "${id}"`).join(' || ');
      const response = await this.post<QueryTemplatesResponse>(
        this.queryTemplatesUrl,
        { filter },
        { showErrorAlert: false },// suppress default error alert since we handle errors manually
      );
      return response.testPlanTemplates;
    } catch (error) {
      throw new Error(`An error occurred while querying test plan templates: ${error} `);
    }
  }

  private handleDependenciesError(error: unknown): void {
    const errorDetails = extractErrorInfo((error as Error).message);
    this.errorTitle = 'Warning during testplans query';
    switch (errorDetails.statusCode) {
      case '404':
        this.errorDescription = 'The query builder lookups failed because the requested resource was not found. Please check the query parameters and try again.';
        break;
      case '429':
        this.errorDescription = 'The query builder lookups failed due to too many requests. Please try again later.';
        break;
      case '504':
        this.errorDescription = `The query builder lookups experienced a timeout error. Some values might not be available. Narrow your query with a more specific filter and try again.`;
        break;
      default:
        this.errorDescription = errorDetails.message
          ? `Some values may not be available in the query builder lookups due to the following error: ${errorDetails.message}.`
          : 'Some values may not be available in the query builder lookups due to an unknown error.';
        break;
    }
  }

  private isRecordCountValid(query: TestPlansQuery): boolean {
    return query.recordCount !== undefined && query.recordCount >= 0 && query.recordCount <= TAKE_LIMIT;
  }

  private isPropertiesValid(query: TestPlansQuery): boolean {
    return !!query.properties && query.properties.length > 0;
  }
}
