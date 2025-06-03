import { BackendSrv } from '@grafana/runtime';
import { MockProxy } from 'jest-mock-extended';
import { setupDataSource, requestMatching, createFetchResponse, createFetchError } from 'test/fixtures';
import { WorkOrdersDataSource } from './WorkOrdersDataSource';
import { OrderByOptions, OutputType, State, Type, WorkOrderPropertiesOptions, WorkOrdersVariableQuery } from './types';
import { DataQueryRequest, Field, LegacyMetricFindQueryOptions } from '@grafana/data';
import { QUERY_WORK_ORDERS_MAX_TAKE, QUERY_WORK_ORDERS_REQUEST_PER_SECOND } from './constants/QueryWorkOrders.constants';
import { queryInBatches } from 'core/utils';

let datastore: WorkOrdersDataSource, backendServer: MockProxy<BackendSrv>;
const mockWorkOrders = {
  workOrders: [
    {
      name: 'WorkOrder1',
      id: '1',
      state: State.Closed,
      type: Type.TestRequest,
      workspace: 'Workspace1',
      earliestStartDate: '2023-01-04T00:00:00Z',
      dueDate: '2023-01-03T00:00:00Z',
      createdAt: '2023-01-01T00:00:00Z',
      updatedAt: '2023-01-02T00:00:00Z',
      assignedTo: 'User1',
      requestedBy: 'User2',
      createdBy: 'User3',
      updatedBy: 'User4',
      description: 'Test description',
      properties: {
        'customProperty1': 'value1',
        'customProperty2': 'value2'
      },
    },
  ],
  continuationToken: '',
  totalCount: 2,
};
jest.mock('core/utils', () => ({
  queryInBatches: jest.fn(() => {
    return Promise.resolve({
      data: mockWorkOrders.workOrders,
      continuationToken: mockWorkOrders.continuationToken,
      totalCount: mockWorkOrders.totalCount,
    });
  }),
}));

describe('WorkOrdersDataSource', () => {
  beforeEach(() => {
    [datastore, backendServer] = setupDataSource(WorkOrdersDataSource);

    backendServer.fetch
      .calledWith(requestMatching({ url: '/niworkorder/v1/query-workorders', method: 'POST' }))
      .mockReturnValue(createFetchResponse(mockWorkOrders));
  });

  describe('runQuery', () => {
    test('processes work orders query when outputType is Properties', async () => {
      const mockQuery = { refId: 'A', outputType: OutputType.Properties, queryBy: 'filter', properties: [WorkOrderPropertiesOptions.WORKSPACE] };

      jest.spyOn(datastore, 'queryWorkordersData').mockResolvedValue(mockWorkOrders.workOrders);

      const response = await datastore.runQuery(mockQuery, {} as DataQueryRequest);

      expect(response.fields).toHaveLength(1);
      expect(response.fields).toMatchSnapshot();
    });

    test('returns total count when outputType is total count', async () => {
      const mockQuery = { refId: 'B', outputType: OutputType.TotalCount, queryBy: 'filter' };

      jest.spyOn(datastore, 'queryWorkordersCount').mockResolvedValue(42);

      const result = await datastore.runQuery(mockQuery, {} as DataQueryRequest);

      expect(result.fields).toEqual([{ name: 'Total count', values: [42] }]);
      expect(result.refId).toEqual('B');
    });

    

    test('should convert properties to Grafana fields', async () => {
      const query = {
          refId: 'A',
          outputType: OutputType.Properties
        };
    

      const response = await datastore.runQuery(query, {} as DataQueryRequest);

      const fields = response.fields as Field[];
      expect(fields).toMatchSnapshot();
  });
  });

  describe('queryWorkordersData', () => {
    test('returns work orders from API response', async () => {
      jest.spyOn(datastore, 'queryWorkOrders').mockResolvedValue(mockWorkOrders);

      const result = await datastore.queryWorkordersData('filter');

      expect(result).toMatchSnapshot();
    });

    test('queries work orders in batches and returns aggregated response', async () => {
      jest.spyOn(datastore, 'queryWorkOrders').mockResolvedValue(mockWorkOrders);

      const result = await datastore.queryWorkordersData(
        '',
        [WorkOrderPropertiesOptions.NAME, WorkOrderPropertiesOptions.STATE],
        OrderByOptions.UPDATED_AT,
        true,
        1000
      );

      expect(queryInBatches).toHaveBeenCalledWith(
        expect.any(Function),
        {
          maxTakePerRequest: QUERY_WORK_ORDERS_MAX_TAKE,
          requestsPerSecond: QUERY_WORK_ORDERS_REQUEST_PER_SECOND,
        },
        1000
      );
      expect(result).toMatchSnapshot();
    });
  });

  describe('queryWorkordersCount', () => {
    test('returns total count from API response', async () => {
      jest.spyOn(datastore, 'queryWorkOrders').mockResolvedValue(mockWorkOrders);

      const result = await datastore.queryWorkordersCount('filter');

      expect(result).toEqual(2);
    });
  });

  describe('queryWorkOrders', () => {
    test('returns response from API', async () => {
      const body = { filter: 'filter', take: 10 };
      const response = await datastore.queryWorkOrders(body);

      expect(response).toMatchSnapshot();
    });

    test('throws error when API call fails', async () => {
      backendServer.fetch
        .calledWith(requestMatching({ url: '/niworkorder/v1/query-workorders' }))
        .mockReturnValue(createFetchError(400));
      const body = { filter: 'filter', take: 10 };

      await expect(datastore.queryWorkOrders(body)).rejects.toThrow(
        'Request to url "/niworkorder/v1/query-workorders" failed with status code: 400. Error message: "Error"'
      );
    });
  });

  describe('default query', () => {
    test('default query output type should be properties', async () => {
      const defaultQuery = datastore.defaultQuery;
      expect(defaultQuery.outputType).toEqual(OutputType.Properties);
    });

    test('default query should have default order by value and order by direction', async () => {
      const defaultQuery = datastore.defaultQuery;
      expect(defaultQuery.orderBy).toEqual(OrderByOptions.UPDATED_AT);
      expect(defaultQuery.descending).toEqual(true);
    });

    test('default query should have default properties', async () => {
      const defaultQuery = datastore.defaultQuery;
      expect(defaultQuery.properties).toEqual([
        WorkOrderPropertiesOptions.NAME,
        WorkOrderPropertiesOptions.STATE,
        WorkOrderPropertiesOptions.REQUESTED_BY,
        WorkOrderPropertiesOptions.ASSIGNED_TO,
        WorkOrderPropertiesOptions.EARLIEST_START_DATE,
        WorkOrderPropertiesOptions.DUE_DATE,
        WorkOrderPropertiesOptions.UPDATED_AT,
      ]);
    });

    test('default query should have default take value', async () => {
      const defaultQuery = datastore.defaultQuery;
      expect(defaultQuery.take).toEqual(1000);
    });
  });

  describe('metricFindQuery', () => {
    let options: LegacyMetricFindQueryOptions;
    beforeEach(() => {
      options = {}
    });
  
    it('should return work orders name with id when query properties are not provided', async () => {
      const query: WorkOrdersVariableQuery = {
        refId: '',
        take: 1000,
      };
  
      const results = await datastore.metricFindQuery(query, options);
  
      expect(results).toMatchSnapshot();
    });

    it('should return work orders name with id when query properties are provided', async () => {
      const query: WorkOrdersVariableQuery = {
        refId: '',
        queryBy: 'filter = "test"',
        orderBy: OrderByOptions.ID,
        descending: true,
        take: 1000,
      };
  
      const results = await datastore.metricFindQuery(query, options);
  
      expect(results).toMatchSnapshot();
    });
  });

  describe('testDataSource', () => {
    test('returns success', async () => {
      backendServer.fetch
        .calledWith(requestMatching({ url: '/niworkorder/v1/query-workorders' }))
        .mockReturnValue(createFetchResponse('testData'));

      const response = await datastore.testDatasource();

      expect(response.status).toEqual('success');
    });

    test('bubbles up exception', async () => {
      backendServer.fetch
        .calledWith(requestMatching({ url: '/niworkorder/v1/query-workorders' }))
        .mockReturnValue(createFetchError(400));

      await expect(datastore.testDatasource()).rejects.toThrow(
        'Request to url "/niworkorder/v1/query-workorders" failed with status code: 400. Error message: "Error"'
      );
    });
  });
});
