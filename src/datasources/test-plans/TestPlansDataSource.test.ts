import { MockProxy } from "jest-mock-extended";
import { TestPlansDataSource } from "./TestPlansDataSource";
import { BackendSrv } from "@grafana/runtime";
import { createFetchError, createFetchResponse, requestMatching, setupDataSource } from "test/fixtures";
import { OrderByOptions, OutputType, Projections, Properties, QueryTestPlansResponse, TestPlansVariableQuery } from "./types";
import { DataQueryRequest, LegacyMetricFindQueryOptions } from "@grafana/data";

let datastore: TestPlansDataSource, backendServer: MockProxy<BackendSrv>;

const mockVariableQueryTestPlansResponse: QueryTestPlansResponse = {
  testPlans: [
    {
      id: '1',
      name: 'testPlan 1',
    },
    {
      id: '2',
      name: 'testPlan 2',
    }
  ],
  totalCount: 2
};

jest.mock('./asset.utils', () => {
  return {
    AssetUtils: jest.fn().mockImplementation(() => ({
      queryAssetsInBatches: jest.fn().mockResolvedValue(
        [
          { id: '1', name: 'Asset 1' },
          { id: '2', name: 'Asset 2' }
        ]
      )
    }))
  };
});

beforeEach(() => {
  [datastore, backendServer] = setupDataSource(TestPlansDataSource);
});

describe('testDatasource', () => {
  test('returns success', async () => {
    backendServer.fetch
      .calledWith(requestMatching({ url: '/niworkorder/v1/query-testplans', data: { take: 1 } }))
      .mockReturnValue(createFetchResponse(25));

    const result = await datastore.testDatasource();

    expect(result.status).toEqual('success');
  });

  test('bubbles up exception', async () => {
    backendServer.fetch
      .calledWith(requestMatching({ url: '/niworkorder/v1/query-testplans', data: { take: 1 } }))
      .mockReturnValue(createFetchError(400));

    await expect(datastore.testDatasource())
      .rejects
      .toThrow('Request to url "/niworkorder/v1/query-testplans" failed with status code: 400. Error message: "Error"');
  });

  test('default query output type as properties and default properties', async () => {
    const defaultQuery = datastore.defaultQuery;
    expect(defaultQuery.outputType).toEqual(OutputType.Properties);
    expect(defaultQuery.properties).toEqual([
      Properties.NAME,
      Properties.STATE,
      Properties.ASSIGNED_TO,
      Properties.PRODUCT,
      Properties.DUT_ID,
      Properties.PLANNED_START_DATE_TIME,
      Properties.ESTIMATED_DURATION_IN_SECONDS,
      Properties.SYSTEM_NAME,
      Properties.UPDATED_AT
    ]);
    expect(defaultQuery.orderBy).toEqual(OrderByOptions.UPDATED_AT);
    expect(defaultQuery.descending).toEqual(true);
    expect(defaultQuery.recordCount).toEqual(1000);
  });
});

describe('runQuery', () => {
  const mockOptions: DataQueryRequest = {} as DataQueryRequest;

  test('returns data frame with fields when test plans are available', async () => {
    const query = {
      refId: 'A',
      outputType: OutputType.Properties,
      properties: [Properties.NAME, Properties.STATE],
      orderBy: OrderByOptions.UPDATED_AT,
      recordCount: 10,
      descending: true,
    };

    const testPlansResponse = {
      testPlans: [
        { id: '1', name: 'Test Plan 1', state: 'Active' },
        { id: '2', name: 'Test Plan 2', state: 'Completed' },
      ],
    };

    jest.spyOn(datastore, 'queryTestPlansInBatches').mockResolvedValue(testPlansResponse);

    const result = await datastore.runQuery(query, mockOptions);

    expect(result.fields).toHaveLength(2);
    expect(result.fields[0].name).toEqual('Name');
    expect(result.fields[0].values).toEqual(['Test Plan 1', 'Test Plan 2']);
    expect(result.fields[1].name).toEqual('State');
    expect(result.fields[1].values).toEqual(['Active', 'Completed']);
  });

  test('returns empty data frame when no test plans are available', async () => {
    const query = {
      refId: 'A',
      outputType: OutputType.Properties,
      properties: [Properties.NAME, Properties.STATE],
      orderBy: OrderByOptions.UPDATED_AT,
      recordCount: 10,
      descending: true,
    };

    jest.spyOn(datastore, 'queryTestPlansInBatches').mockResolvedValue({ testPlans: [] });

    const result = await datastore.runQuery(query, mockOptions);

    expect(result.fields).toHaveLength(0);
  });

  test('returns total count when output type is TotalCount', async () => {
    const query = {
      refId: 'A',
      outputType: OutputType.TotalCount,
      orderBy: OrderByOptions.UPDATED_AT,
      recordCount: 10,
      descending: true,
    };

    const testPlansResponse = {
      testPlans: [],
      totalCount: 42,
    };

    jest.spyOn(datastore, 'queryTestPlans').mockResolvedValue(testPlansResponse);

    const result = await datastore.runQuery(query, mockOptions);

    expect(result.fields).toHaveLength(1);
    expect(result.fields[0].name).toEqual('Total count');
    expect(result.fields[0].values).toEqual([42]);
  });

  test('returns empty total count when no test plans are available and output type is TotalCount', async () => {
    const query = {
      refId: 'A',
      outputType: OutputType.TotalCount,
      orderBy: OrderByOptions.UPDATED_AT,
      recordCount: 10,
      descending: true,
    };

    const testPlansResponse = {
      testPlans: [],
      totalCount: 0,
    };

    jest.spyOn(datastore, 'queryTestPlans').mockResolvedValue(testPlansResponse);

    const result = await datastore.runQuery(query, mockOptions);

    expect(result.fields).toHaveLength(1);
    expect(result.fields[0].name).toEqual('Total count');
    expect(result.fields[0].values).toEqual([0]);
  });

  it('should convert fixtureIds to fixture names', async () => {
    const query = {
      refId: 'A',
      outputType: OutputType.Properties,
      properties: [Properties.FIXTURE_NAMES],
      orderBy: OrderByOptions.UPDATED_AT,
      recordCount: 10,
      descending: true,
    };

    const testPlansResponse = {
      testPlans: [
        { id: '1', fixtureIds: ['1'] },
        { id: '2', fixtureIds: ['1', '2'] }
      ],
    };

    jest.spyOn(datastore, 'queryTestPlansInBatches').mockResolvedValue(testPlansResponse);

    const result = await datastore.runQuery(query, mockOptions);

    expect(result.fields).toHaveLength(1);
    expect(result.fields[0].name).toEqual('Fixture names');
    expect(result.fields[0].values).toEqual(['Asset 1', 'Asset 1, Asset 2']);
  });

  it('should convert dutIds to dut names', async () => {
    const query = {
      refId: 'A',
      outputType: OutputType.Properties,
      properties: [Properties.DUT_ID],
      orderBy: OrderByOptions.UPDATED_AT,
      recordCount: 10,
      descending: true,
    };

    const testPlansResponse = {
      testPlans: [
        { id: '1', dutId: '1' },
        { id: '2', dutId: '2' }
      ],
    };

    jest.spyOn(datastore, 'queryTestPlansInBatches').mockResolvedValue(testPlansResponse);

    const result = await datastore.runQuery(query, mockOptions);

    expect(result.fields).toHaveLength(1);
    expect(result.fields[0].name).toEqual('DUT');
    expect(result.fields[0].values).toEqual(['Asset 1', 'Asset 2']);
  });
});

describe('queryTestPlansInBatches', () => {
  test('queries test plans in batches and returns aggregated response', async () => {
    const mockQueryResponse = {
      testPlans: [
        { id: '1', name: 'Test Plan 1' },
        { id: '2', name: 'Test Plan 2' }
      ],
      continuationToken: undefined,
      totalCount: 2,
    };

    jest.spyOn(datastore, 'queryTestPlans').mockResolvedValue(mockQueryResponse);

    const result = await datastore.queryTestPlansInBatches(OrderByOptions.UPDATED_AT, [Projections.NAME], 2, true);

    expect(result.testPlans).toEqual(mockQueryResponse.testPlans);
    expect(result.totalCount).toEqual(2);
  });

  test('handles errors during batch querying', async () => {
    jest.spyOn(datastore, 'queryTestPlans').mockRejectedValue(new Error('Query failed'));

    await expect(datastore.queryTestPlansInBatches(OrderByOptions.UPDATED_AT, [Projections.NAME], 2, true))
      .rejects
      .toThrow('Query failed');
  });
});

describe('queryTestPlans', () => {
  test('sends correct request and returns response', async () => {
    const mockResponse = { testPlans: [{ name: 'Test Plan 1' }], continuationToken: null, totalCount: 1 };

    backendServer.fetch
      .calledWith(requestMatching({ url: '/niworkorder/v1/query-testplans', data: { orderBy: OrderByOptions.UPDATED_AT, take: 1 } }))
      .mockReturnValue(createFetchResponse(mockResponse));

    const result = await datastore.queryTestPlans(OrderByOptions.UPDATED_AT, [Projections.NAME], 1, true);

    expect(result).toEqual(mockResponse);
  });

  test('throws error on failed request', async () => {
    backendServer.fetch
      .calledWith(requestMatching({ url: '/niworkorder/v1/query-testplans', data: { orderBy: OrderByOptions.UPDATED_AT, take: 1 } }))
      .mockReturnValue(createFetchError(500));

    await expect(datastore.queryTestPlans(OrderByOptions.UPDATED_AT, [Projections.NAME], 1, true))
      .rejects
      .toThrow('An error occurred while querying test plans: Error: Request to url "/niworkorder/v1/query-testplans" failed with status code: 500. Error message: "Error"');
  });
});

describe('metricFindQuery', () => {
  let options: LegacyMetricFindQueryOptions;
  beforeEach(() => {
    backendServer.fetch
      .calledWith(requestMatching({ url: '/niworkorder/v1/query-testplans' }))
      .mockReturnValue(
        createFetchResponse<QueryTestPlansResponse>(mockVariableQueryTestPlansResponse));
    options = {}
  });

  it('should return test plan name with id when queryBy is not provided', async () => {
    const query: TestPlansVariableQuery = {
      refId: '',
    };

    const results = await datastore.metricFindQuery(query, options);

    expect(results).toMatchSnapshot();
    expect(backendServer.fetch).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          descending: false,
          projection: ["ID", "NAME"],
          returnCount: false,
          take: 1000
        }
      })
    );
  });

  it('should return test plan name with id when orderBy is provided', async () => {
    const query: TestPlansVariableQuery = {
      refId: '',
      orderBy: OrderByOptions.UPDATED_AT,
      recordCount: 1000,
      descending: false,
    };

    const results = await datastore.metricFindQuery(query, options);

    expect(results).toMatchSnapshot();
    expect(backendServer.fetch).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          descending: false,
          orderBy: OrderByOptions.UPDATED_AT,
          projection: ["ID", "NAME"],
          returnCount: false,
          take: 1000
        }
      })
    );
  });
});
