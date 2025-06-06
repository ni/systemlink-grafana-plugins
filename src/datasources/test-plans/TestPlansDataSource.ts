import { DataFrameDTO, DataQueryRequest, DataSourceInstanceSettings, FieldType, LegacyMetricFindQueryOptions, MetricFindValue, TestDataSourceResponse } from '@grafana/data';
import { BackendSrv, TemplateSrv, getBackendSrv, getTemplateSrv } from '@grafana/runtime';
import { DataSourceBase } from 'core/DataSourceBase';
import { Asset, OrderByOptions, OutputType, Projections, Properties, PropertiesProjectionMap, QueryTestPlansResponse, TestPlanResponseProperties, TestPlansQuery, TestPlansVariableQuery } from './types';
import { getVariableOptions, queryInBatches } from 'core/utils';
import { QueryBuilderOption, QueryResponse } from 'core/types';
import { isTimeField } from './utils';
import { QUERY_TEST_PLANS_MAX_TAKE, QUERY_TEST_PLANS_REQUEST_PER_SECOND } from './constants/QueryTestPlans.constants';
import { AssetUtils } from './asset.utils';
import { QueryBuilderOperations } from 'core/query-builder.constants';
import { ExpressionTransformFunction, transformComputedFieldsQuery } from 'core/query-builder.utils';

export class TestPlansDataSource extends DataSourceBase<TestPlansQuery> {
  constructor(
    readonly instanceSettings: DataSourceInstanceSettings,
    readonly backendSrv: BackendSrv = getBackendSrv(),
    readonly templateSrv: TemplateSrv = getTemplateSrv()
  ) {
    super(instanceSettings, backendSrv, templateSrv);
    this.assetUtils = new AssetUtils(instanceSettings, backendSrv);
  }

  baseUrl = `${this.instanceSettings.url}/niworkorder/v1`;
  queryTestPlansUrl = `${this.baseUrl}/query-testplans`;
  assetUtils: AssetUtils;

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
          query.orderBy,
          projection,
          query.recordCount,
          query.descending,
          true
        )).testPlans;

      const labels = projectionAndFields?.map(data => data.label) ?? [];
      if (testPlans.length > 0) {
        let fixtureNames: Asset[] = await this.getFixtureNames(labels, testPlans);

        let dutNames: Asset[] = await this.getDutNames(labels, testPlans);

        const fields = projectionAndFields?.map((data) => {
          const label = data.label;
          const field = data.field[0];
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
                const dut = dutNames.find(data => data.id === value);
                return dut ? dut.name : value;
              default:
                return value == null ? '' : value;
            }
          });

          return {
            name: data.label,
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
    if (labels?.find(label => label === PropertiesProjectionMap.FIXTURE_NAMES.label)) {
      const fixtureIds = testPlans
        .map(data => data['fixtureIds'] as string[])
        .filter(data => data.length > 0)
        .flat();
      return await this.assetUtils.queryAssetsInBatches(fixtureIds);
    }
    return [];
  }

  private async getDutNames(labels: string[], testPlans: TestPlanResponseProperties[]): Promise<Asset[]> {
    if (labels?.find(label => label === PropertiesProjectionMap.DUT_ID.label)) {
      const dutIds = testPlans
        .map(data => data['dutId'] as string)
        .filter(data => data != null);
      return await this.assetUtils.queryAssetsInBatches(dutIds);
    }
    return [];
  }

  async metricFindQuery(query: TestPlansVariableQuery, options: LegacyMetricFindQueryOptions): Promise<MetricFindValue[]> {
    if (query.queryBy) {
      query.queryBy = transformComputedFieldsQuery(
        this.templateSrv.replace(query.queryBy, options.scopedVars),
        this.testPlansComputedDataFields
      );
    }
    const metadata = (await this.queryTestPlansInBatches(
      query.orderBy,
      [Projections.ID, Projections.NAME],
      query.recordCount,
      query.descending
    )).testPlans;
    return metadata ? metadata.map(frame => ({ text: `${frame.name} (${frame.id})`, value: frame.id })) : [];
  }

  readonly testPlansComputedDataFields = new Map<string, ExpressionTransformFunction>(
    Object.values(PropertiesProjectionMap).map(({ field, projection }) => {
      const fieldName = field[0];
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
    orderBy?: string,
    projection?: Projections[],
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
    projection?: Projections[],
    take?: number,
    descending?: boolean,
    continuationToken?: string,
    returnCount = false
  ): Promise<QueryTestPlansResponse> {
    try {
      const response = await this.post<QueryTestPlansResponse>(this.queryTestPlansUrl, {
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
}
