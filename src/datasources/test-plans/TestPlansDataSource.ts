import { DataFrameDTO, DataQueryRequest, DataSourceInstanceSettings, FieldType, LegacyMetricFindQueryOptions, MetricFindValue, TestDataSourceResponse } from '@grafana/data';
import { BackendSrv, TemplateSrv, getBackendSrv, getTemplateSrv } from '@grafana/runtime';
import { DataSourceBase } from 'core/DataSourceBase';
import { Asset, OrderByOptions, OutputType, Projections, Properties, PropertiesProjectionMap, QueryTemplatesResponse, QueryTestPlansResponse, TemplateResponseProperties, TestPlanResponseProperties, TestPlansQuery, TestPlansVariableQuery } from './types';
import { getWorkspaceName, getVariableOptions, queryInBatches } from 'core/utils';
import { QueryBuilderOption, QueryResponse } from 'core/types';
import { isTimeField, transformDuration } from './utils';
import { QUERY_TEMPLATES_BATCH_SIZE, QUERY_TEMPLATES_REQUEST_PER_SECOND, QUERY_TEST_PLANS_MAX_TAKE, QUERY_TEST_PLANS_REQUEST_PER_SECOND } from './constants/QueryTestPlans.constants';
import { AssetUtils } from './asset.utils';
import { WorkspaceUtils } from 'shared/workspace.utils';
import { SystemUtils } from 'shared/system.utils';
import { QueryBuilderOperations } from 'core/query-builder.constants';
import { ExpressionTransformFunction, transformComputedFieldsQuery } from 'core/query-builder.utils';
import { UsersUtils } from 'shared/users.utils';

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
  }

  baseUrl = `${this.instanceSettings.url}/niworkorder/v1`;
  queryTestPlansUrl = `${this.baseUrl}/query-testplans`;
  queryTemplatesUrl = `${this.baseUrl}/query-testplan-templates`;
  assetUtils: AssetUtils;
  workspaceUtils: WorkspaceUtils;
  systemUtils: SystemUtils;
  usersUtils: UsersUtils;

  defaultQuery = {
    outputType: OutputType.Properties,
    properties: [
      Properties.NAME,
      Properties.STATE,
      Properties.ASSIGNED_TO,
      Properties.PRODUCT,
      Properties.DUT_ID,
      Properties.PLANNED_START_DATE_TIME,
      Properties.ESTIMATED_DURATION_IN_SECONDS,
      Properties.SYSTEM_NAME,
      Properties.UPDATED_AT
    ] as Properties[],
    orderBy: OrderByOptions.UPDATED_AT,
    descending: true,
    recordCount: 1000
  };

  readonly globalVariableOptions = (): QueryBuilderOption[] => getVariableOptions(this);

  async runQuery(query: TestPlansQuery, options: DataQueryRequest): Promise<DataFrameDTO> {
    const workspaces = await this.workspaceUtils.getWorkspaces();
    const systemAliases = await this.systemUtils.getSystemAliases();
    const users = await this.usersUtils.getUsers();

    if (query.queryBy) {
      query.queryBy = transformComputedFieldsQuery(
        this.templateSrv.replace(query.queryBy, options.scopedVars),
        this.testPlansComputedDataFields
      );
    }

    if (query.outputType === OutputType.Properties) {
      const projectionAndFields = query.properties?.map(property => PropertiesProjectionMap[property]);
      const projection = [...new Set(projectionAndFields?.map(data => data.projection).flat()), Projections.ID];

      const testPlans = (
        await this.queryTestPlansInBatches(
          query.queryBy,
          query.orderBy,
          projection,
          query.recordCount,
          query.descending,
          true
        )).testPlans;

      if (testPlans.length > 0) {
        const labels = projectionAndFields?.map(data => data.label) ?? [];
        const fixtureNames = await this.getFixtureNames(labels, testPlans);
        const duts = await this.getDuts(labels, testPlans);
        const workOrderIdAndName = this.getWorkOrderIdAndName(labels, testPlans);
        const templatesName = await this.getTemplateNames(labels, testPlans);

        const fields = projectionAndFields?.map((data) => {
          const label = data.label;
          const field = data.field;
          const fieldType = isTimeField(field)
            ? FieldType.time
            : FieldType.string;
          const values = testPlans
            .map(data => data[field as unknown as keyof TestPlanResponseProperties] as any);

          // TODO: AB#3133188 Add support for other field mapping
          const fieldValues = values.map(value => {
            switch (label) {
              case PropertiesProjectionMap.FIXTURE_NAMES.label:
                const names = value.map((id: string) => fixtureNames.find(data => data.id === id)?.name);
                return names ? names.filter((name: string) => name !== '').join(', ') : value;
              case PropertiesProjectionMap.DUT_ID.label:
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
                const workOrderId = value ? `(${value})` : '';
                const workOrderName = (workOrder && workOrder?.name) ? workOrder.name : '';
                return `${workOrderName} ${workOrderId}`;
              case PropertiesProjectionMap.TEMPLATE.label:
                const template = templatesName.find(data => data.id === value);
                return template ? `${template.name} (${template.id})` : value;
              case PropertiesProjectionMap.ESTIMATED_DURATION_IN_SECONDS.label:
                return value ? transformDuration(value) : '';
              case PropertiesProjectionMap.SYSTEM_NAME.label:
                const system = systemAliases.get(value);
                return system ? system.alias : value;
              case PropertiesProjectionMap.ASSIGNED_TO.label:
              case PropertiesProjectionMap.CREATED_BY.label:
              case PropertiesProjectionMap.UPDATED_BY.label:
                const user = users.get(value);
                return user ? UsersUtils.getUserFullName(user) : '';
              case PropertiesProjectionMap.PROPERTIES.label:
                return value == null ? '' : JSON.stringify(value);
              default:
                return value == null ? '' : value;
            }
          });

          return {
            name: label,
            values: fieldValues,
            type: fieldType
          };
        });
        return {
          refId: query.refId,
          name: query.refId,
          fields: fields ?? [],
        };
      }
      return {
        refId: query.refId,
        name: query.refId,
        fields: [],
      };
    } else {
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
        fields: [{ name: 'Total count', values: [responseData.totalCount] }],
      };
    }
  }

  shouldRunQuery(query: TestPlansQuery): boolean {
    return true;
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
      label === PropertiesProjectionMap.DUT_ID.label
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
    const filter = query.queryBy ?
      transformComputedFieldsQuery(
        this.templateSrv.replace(query.queryBy, options.scopedVars),
        this.testPlansComputedDataFields
      )
      : undefined;

    const metadata = (await this.queryTestPlansInBatches(
      filter,
      query.orderBy,
      [Projections.ID, Projections.NAME],
      query.recordCount,
      query.descending
    )).testPlans;
    return metadata ? metadata.map(frame => ({ text: `${frame.name} (${frame.id})`, value: frame.id })) : [];
  }

  readonly testPlansComputedDataFields = new Map<string, ExpressionTransformFunction>(
    Object.values(PropertiesProjectionMap).map(({ field, projection }) => {
      const fieldName = field;
      const isTime = isTimeField(projection[0]);
      return [fieldName, isTime ? this.timeFieldsQuery(fieldName) : this.multipleValuesQuery(fieldName)];
    })
  );

  protected multipleValuesQuery(field: string): ExpressionTransformFunction {
    return (value: string, operation: string, _options?: any) => {
      const isMultiSelect = this.isMultiSelectValue(value);
      const valuesArray = this.getMultipleValuesArray(value);
      const logicalOperator = this.getLogicalOperator(operation);

      return isMultiSelect
        ? `(${valuesArray.map(val => `${field} ${operation} "${val}"`).join(` ${logicalOperator} `)})`
        : `${field} ${operation} "${value}"`;
    };
  }

  protected timeFieldsQuery(field: string): ExpressionTransformFunction {
    return (value: string, operation: string): string => {
      const formattedValue = value === '${__now:date}' ? new Date().toISOString() : value;
      return `${field} ${operation} "${formattedValue}"`;
    };
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
    returnCount = false
  ): Promise<QueryTestPlansResponse> {
    const queryRecord = async (currentTake: number, token?: string): Promise<QueryResponse<TestPlanResponseProperties>> => {
      const response = await this.queryTestPlans(
        filter,
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
    filter?: string,
    orderBy?: string,
    projection?: Projections[],
    take?: number,
    descending?: boolean,
    continuationToken?: string,
    returnCount = false
  ): Promise<QueryTestPlansResponse> {
    try {
      const response = await this.post<QueryTestPlansResponse>(this.queryTestPlansUrl, {
        filter,
        orderBy,
        descending,
        projection,
        take,
        continuationToken,
        returnCount
      });
      return response;
    } catch (error) {
      throw new Error(`An error occurred while querying test plans: ${error} `);
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
      const response = await this.post<QueryTemplatesResponse>(this.queryTemplatesUrl, {
        filter
      });
      return response.testPlanTemplates;
    } catch (error) {
      throw new Error(`An error occurred while querying test plan templates: ${error} `);
    }
  }
}
