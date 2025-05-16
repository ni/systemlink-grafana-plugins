import { BackendSrv } from '@grafana/runtime';
import { MockProxy } from 'jest-mock-extended';
import { setupDataSource, requestMatching, createFetchResponse, createFetchError } from 'test/fixtures';
import { WorkOrdersDataSource } from './WorkOrdersDataSource';
import { OutputType, State, Type, WorkOrdersResponse } from './types';
import { DataQueryRequest } from '@grafana/data';

let datastore: WorkOrdersDataSource, backendServer: MockProxy<BackendSrv>;

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
      const mockQuery = { refId: 'A', outputType: OutputType.Properties, queryBy: 'filter' };

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
  });

  describe('queryWorkordersData', () => {
    test('returns work orders from API response', async () => {
      jest.spyOn(datastore, 'queryWorkOrders').mockResolvedValue(mockWorkOrders);

      const result = await datastore.queryWorkordersData('filter', 10);

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
