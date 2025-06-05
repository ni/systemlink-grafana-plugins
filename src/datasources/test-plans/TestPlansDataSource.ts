import { DataFrameDTO, DataQueryRequest, DataSourceInstanceSettings, FieldType, LegacyMetricFindQueryOptions, MetricFindValue, TestDataSourceResponse } from '@grafana/data';
import { BackendSrv, TemplateSrv, getBackendSrv, getTemplateSrv } from '@grafana/runtime';
import { DataSourceBase } from 'core/DataSourceBase';
import { OrderByOptions, OutputType, Projections, Properties, PropertiesProjectionMap, QueryTestPlansResponse, TestPlanResponseProperties, TestPlansQuery, TestPlansVariableQuery } from './types';
import { queryInBatches } from 'core/utils';
import { QueryResponse } from 'core/types';
import { isTimeField } from './utils';
import { QUERY_TEST_PLANS_MAX_TAKE, QUERY_TEST_PLANS_REQUEST_PER_SECOND } from './constants/QueryTestPlans.constants';
import { ProductUtils } from 'shared/product.utils';

export class TestPlansDataSource extends DataSourceBase<TestPlansQuery> {
  constructor(
    readonly instanceSettings: DataSourceInstanceSettings,
    readonly backendSrv: BackendSrv = getBackendSrv(),
    readonly templateSrv: TemplateSrv = getTemplateSrv()
  ) {
    super(instanceSettings, backendSrv, templateSrv);
    this.productUtils = new ProductUtils(instanceSettings, backendSrv);
  }

  baseUrl = `${this.instanceSettings.url}/niworkorder/v1`;
  queryTestPlansUrl = `${this.baseUrl}/query-testplans`;
  productUtils: ProductUtils;

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

  async runQuery(query: TestPlansQuery, { range }: DataQueryRequest): Promise<DataFrameDTO> {
    const products = await this.productUtils.getProducts();

    if (query.outputType === OutputType.Properties) {
      const projectionAndFields = query.properties?.map(property => PropertiesProjectionMap[property]);
      const projection = [...new Set(projectionAndFields?.map(data => data.projection).flat())];

      const testPlans = (
        await this.queryTestPlansInBatches(
          query.orderBy,
          projection,
          query.recordCount,
          query.descending,
          true
        )).testPlans;

      if (testPlans.length > 0) {
        const fields = projectionAndFields?.map((data) => {
          const label = data.label;
          const field = data.field[0];
          const fieldType = isTimeField(field)
            ? FieldType.time
            : FieldType.string;
          const values = testPlans
            .map(data => data[field as unknown as keyof TestPlanResponseProperties] as string);

          // TODO: AB#3133188 Add support for other field mapping
          const fieldValues = values.map(value => {
            switch (label) {
              case PropertiesProjectionMap.PRODUCT.label:
                const product = products.get(value);
                return (product && product.name) ? `${product.name} (${product.partNumber})` : value;
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

  async metricFindQuery(query: TestPlansVariableQuery, options: LegacyMetricFindQueryOptions): Promise<MetricFindValue[]> {
    const metadata = (await this.queryTestPlansInBatches(
      query.orderBy,
      [Projections.ID, Projections.NAME],
      query.recordCount,
      query.descending
    )).testPlans;
    return metadata ? metadata.map(frame => ({ text: `${frame.name} (${frame.id})`, value: frame.id })) : [];
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
