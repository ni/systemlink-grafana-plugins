import { BackendSrv } from '@grafana/runtime';
import { MockProxy } from 'jest-mock-extended';
import { setupDataSource, requestMatching, createFetchResponse, createFetchError } from 'test/fixtures';
import { WorkOrdersDataSource } from './WorkOrdersDataSource';
import {
  OrderByOptions,
  OutputType,
  State,
  Type,
  WorkOrder,
  WorkOrderPropertiesOptions,
  WorkOrdersResponse,
} from './types';
import { DataQueryRequest } from '@grafana/data';

let datastore: WorkOrdersDataSource, backendServer: MockProxy<BackendSrv>;
jest.mock('shared/Users', () => {
  return {
    Users: jest.fn().mockImplementation(() => ({
      usersMapCache: Promise.resolve(
        new Map([
          ['1', 'user 1'],
          ['2', 'user 2'],
          ['3', 'user 3'],
          ['4', 'user 4'],
        ])
      ),
    })),
  };
});

describe('WorkOrdersDataSource', () => {
  const mockWorkOrders: WorkOrdersResponse = {
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
        properties: {},
      },
    ],
    continuationToken: '',
    totalCount: 2,
  };

  beforeEach(() => {
    [datastore, backendServer] = setupDataSource(WorkOrdersDataSource);

    backendServer.fetch
      .calledWith(requestMatching({ url: '/niworkorder/v1/query-workorders', method: 'POST' }))
      .mockReturnValue(createFetchResponse(mockWorkOrders));
  });

  describe('runQuery', () => {
    test('processes work orders query when outputType is Properties', async () => {
      const mockQuery = {
        refId: 'A',
        outputType: OutputType.Properties,
        queryBy: 'filter',
        properties: [WorkOrderPropertiesOptions.WORKSPACE],
      };

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

    it('should convert user Ids to user names for assigned to field', async () => {
      const query = {
        refId: 'A',
        outputType: OutputType.Properties,
        properties: [WorkOrderPropertiesOptions.ASSIGNED_TO],
        orderBy: OrderByOptions.UPDATED_AT,
        recordCount: 10,
        descending: true,
      };

      const workOrdersResponse = [
        { id: '1', assignedTo: '1' },
        { id: '2', assignedTo: '2' },
      ];

      jest.spyOn(datastore, 'queryWorkordersData').mockResolvedValue(workOrdersResponse as WorkOrder[]);

      const result = await datastore.runQuery(query, {} as DataQueryRequest);

      expect(result.fields).toHaveLength(1);
      expect(result.fields[0].name).toEqual('Assigned to');
      expect(result.fields[0].values).toEqual(['user 1', 'user 2']);
    });

    it('should convert user Ids to user names for created by field', async () => {
      const query = {
        refId: 'A',
        outputType: OutputType.Properties,
        properties: [WorkOrderPropertiesOptions.CREATED_BY],
        orderBy: OrderByOptions.UPDATED_AT,
        recordCount: 10,
        descending: true,
      };

      const workOrdersResponse = [
        { id: '1', createdBy: '2' },
        { id: '2', createdBy: '3' },
      ];

      jest.spyOn(datastore, 'queryWorkordersData').mockResolvedValue(workOrdersResponse as WorkOrder[]);

      const result = await datastore.runQuery(query, {} as DataQueryRequest);

      expect(result.fields).toHaveLength(1);
      expect(result.fields[0].name).toEqual('Created by');
      expect(result.fields[0].values).toEqual(['user 2', 'user 3']);
    });

    it('should convert user Ids to user names for requested by field', async () => {
      const query = {
        refId: 'A',
        outputType: OutputType.Properties,
        properties: [WorkOrderPropertiesOptions.REQUESTED_BY],
        orderBy: OrderByOptions.UPDATED_AT,
        recordCount: 10,
        descending: true,
      };

      const workOrdersResponse = [
        { id: '1', requestedBy: '3' },
        { id: '2', requestedBy: '4' },
      ];

      jest.spyOn(datastore, 'queryWorkordersData').mockResolvedValue(workOrdersResponse as WorkOrder[]);

      const result = await datastore.runQuery(query, {} as DataQueryRequest);

      expect(result.fields).toHaveLength(1);
      expect(result.fields[0].name).toEqual('Requested by');
      expect(result.fields[0].values).toEqual(['user 3', 'user 4']);
    });

    it('should convert user Ids to user names for updated by field', async () => {
      const query = {
        refId: 'A',
        outputType: OutputType.Properties,
        properties: [WorkOrderPropertiesOptions.UPDATED_BY],
        orderBy: OrderByOptions.UPDATED_AT,
        recordCount: 10,
        descending: true,
      };

      const workOrdersResponse = [
        { id: '1', updatedBy: '4' },
        { id: '2', updatedBy: '1' },
      ];

      jest.spyOn(datastore, 'queryWorkordersData').mockResolvedValue(workOrdersResponse as WorkOrder[]);

      const result = await datastore.runQuery(query, {} as DataQueryRequest);

      expect(result.fields).toHaveLength(1);
      expect(result.fields[0].name).toEqual('Updated by');
      expect(result.fields[0].values).toEqual(['user 4', 'user 1']);
    });
  });

  describe('queryWorkordersData', () => {
    test('returns work orders from API response', async () => {
      jest.spyOn(datastore, 'queryWorkOrders').mockResolvedValue(mockWorkOrders);

      const result = await datastore.queryWorkordersData('filter');

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
