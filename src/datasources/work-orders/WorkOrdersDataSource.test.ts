import { BackendSrv } from '@grafana/runtime';
import { MockProxy } from 'jest-mock-extended';
import { setupDataSource, requestMatching, createFetchResponse, createFetchError } from 'test/fixtures';
import { WorkOrdersDataSource } from './WorkOrdersDataSource';
import { OrderByOptions, OutputType, State, Type, WorkOrder, WorkOrderPropertiesOptions, WorkOrdersVariableQuery } from './types';
import { DataQueryRequest, Field, FieldType, LegacyMetricFindQueryOptions } from '@grafana/data';
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

jest.mock('shared/workspace.utils', () => {
  return {
    WorkspaceUtils: jest.fn().mockImplementation(() => ({
      getWorkspaces: jest.fn().mockResolvedValue(
        new Map([
          ['Workspace1', { id: 'Workspace1', name: 'Workspace Name' }],
          ['Workspace2', { id: 'Workspace2', name: 'Another Workspace Name' }],
        ])
      )
    }))
  };
});

describe('WorkOrdersDataSource', () => {
  beforeEach(() => {
    [datastore, backendServer] = setupDataSource(WorkOrdersDataSource);

    backendServer.fetch
      .calledWith(requestMatching({ url: '/niworkorder/v1/query-workorders', method: 'POST' }))
      .mockReturnValue(createFetchResponse(mockWorkOrders));

    jest.spyOn(datastore, 'queryWorkordersData');

    const mockUsers = [
      {
        id: '1',
        firstName: 'User',
        lastName: '1',
        email: 'user1@123.com',
        properties: {},
        keywords: [],
        created: '',
        updated: '',
        orgId: '',
      },
      {
        id: '2',
        firstName: 'User',
        lastName: '2',
        email: 'user2@123.com',
        properties: {},
        keywords: [],
        created: '',
        updated: '',
        orgId: '',
      }
    ];
    jest.spyOn(datastore.usersUtils, 'getUsers').mockResolvedValue(
      new Map([
        ['1', mockUsers[0]],
        ['2', mockUsers[1]]
      ])
    );
  });

  describe('runQuery', () => {
    test('should return field without values when no work orders are found', async () => {
      const mockQuery = {
        refId: 'A',
        properties: [WorkOrderPropertiesOptions.NAME],
        outputType: OutputType.Properties,
        queryBy: 'filter',
      };

      jest.spyOn(datastore, 'queryWorkordersData').mockResolvedValue([]);

      const response = await datastore.runQuery(mockQuery, {} as DataQueryRequest);

      expect(response.fields).toHaveLength(1);
      expect(response.fields).toEqual([{"name": "Work order name", "type": "string", "values": []}]);
      expect(response.refId).toEqual('A');
      expect(response.name).toEqual('A');
      expect(datastore.queryWorkordersData).toHaveBeenCalledWith('filter', ["NAME"], undefined, undefined, undefined);
    });

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

      expect(result.fields).toEqual([{ name: 'B', values: [42] }]);
      expect(result.refId).toEqual('B');
    });

    test('should convert properties to Grafana fields', async () => {
      const query = {
        refId: 'A',
        outputType: OutputType.Properties,
      };

      const response = await datastore.runQuery(query, {} as DataQueryRequest);

      const fields = response.fields as Field[];
      expect(fields).toMatchSnapshot();
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
        { id: '1', assignedTo: '0' },
        { id: '2', assignedTo: '2' },
      ];

      jest.spyOn(datastore, 'queryWorkordersData').mockResolvedValue(workOrdersResponse as WorkOrder[]);

      const result = await datastore.runQuery(query, {} as DataQueryRequest);

      expect(result.fields).toHaveLength(1);
      expect(result.fields[0].name).toEqual('Assigned to');
      expect(result.fields[0].values).toEqual(['0', 'User 2']);
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
      expect(result.fields[0].values).toEqual(['User 2', '3']);
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
        { id: '1', requestedBy: '1' },
        { id: '2', requestedBy: '4' },
      ];

      jest.spyOn(datastore, 'queryWorkordersData').mockResolvedValue(workOrdersResponse as WorkOrder[]);

      const result = await datastore.runQuery(query, {} as DataQueryRequest);

      expect(result.fields).toHaveLength(1);
      expect(result.fields[0].name).toEqual('Requested by');
      expect(result.fields[0].values).toEqual(['User 1', '4']);
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
      expect(result.fields[0].values).toEqual(['4', 'User 1']);
    });

    it('should convert workspaceIds to workspace names for workspace field', async () => {
      const query = {
        refId: 'A',
        outputType: OutputType.Properties,
        properties: [WorkOrderPropertiesOptions.WORKSPACE],
        orderBy: OrderByOptions.UPDATED_AT,
        recordCount: 10,
        descending: true,
      };
    
      const result = await datastore.runQuery(query, {} as DataQueryRequest);
  
      expect(result.fields).toHaveLength(1);
      expect(result.fields[0].name).toEqual('Workspace');
      expect(result.fields[0].values).toEqual(['Workspace Name']);
    });

    test('should replace variables', async () => {
      const mockQuery = {
        refId: 'C',
        outputType: OutputType.Properties,
        queryBy: 'workspace = "${var}"'
      };
      jest.spyOn(datastore.templateSrv, 'replace').mockReturnValue('workspace = "testWorkspace"');

      const options = { scopedVars: { var: { value: 'testWorkspace' } } };
      await datastore.runQuery(mockQuery, options as unknown as DataQueryRequest);

      expect(datastore.templateSrv.replace).toHaveBeenCalledWith('workspace = "${var}"', options.scopedVars);
      expect(datastore.queryWorkordersData).toHaveBeenCalledWith(
        'workspace = "testWorkspace"',
        undefined,
        undefined,
        undefined,
        undefined
      );
    });

    test('should transform fields with multiple values', async () => {
      const mockQuery = {
        refId: 'C',
        outputType: OutputType.Properties,
        queryBy: 'workspace = "${var}"'
      };
      const options = { scopedVars: { var: { value: '{testWorkspace1,testWorkspace2}' } } };
      jest.spyOn(datastore.templateSrv, 'replace').mockReturnValue('workspace = "{testWorkspace1,testWorkspace2}"');

      await datastore.runQuery(mockQuery, options as unknown as DataQueryRequest);

      expect(datastore.queryWorkordersData).toHaveBeenCalledWith(
        '(workspace = "testWorkspace1" || workspace = "testWorkspace2")',
        undefined,
        undefined,
        undefined,
        undefined
      );
    });

    test('should transform fields when queryBy contains a date', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2025-01-01'));

      const mockQuery = {
        refId: 'C',
        outputType: OutputType.Properties,
        queryBy: 'updatedAt = "${__now:date}"'
      };

      await datastore.runQuery(mockQuery, {} as DataQueryRequest);

      expect(datastore.queryWorkordersData).toHaveBeenCalledWith(
        'updatedAt = "2025-01-01T00:00:00.000Z"',
        undefined,
        undefined,
        undefined,
        undefined
      );

      jest.useRealTimers();
    });

    test('should return type as string type', async () => {
      const mockQuery = {
        refId: 'A',
        outputType: OutputType.Properties,
        properties: [WorkOrderPropertiesOptions.NAME, WorkOrderPropertiesOptions.UPDATED_AT],
      };

      const workOrdersResponse = [
        {name: 'WorkOrder1', updatedAt: '2023-01-02T00:00:00Z'},
        {name: 'WorkOrder2', updatedAt: '2023-01-05T00:00:00Z'},
      ];

      jest.spyOn(datastore, 'queryWorkordersData').mockResolvedValue(workOrdersResponse as WorkOrder[]);

      const result = await datastore.runQuery(mockQuery, {} as DataQueryRequest);

      expect(result.fields).toHaveLength(2);
      expect(result.fields[0].type).toEqual(FieldType.string);
      expect(result.fields[1].type).toEqual(FieldType.string);
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

    test('should replace variables', async () => {
      const mockQuery = {
        refId: 'C',
        queryBy: 'workspace = "${var}"',
      };
      jest.spyOn(datastore.templateSrv, 'replace').mockReturnValue('workspace = "testWorkspace"');

      const options = { scopedVars: { var: { value: 'testWorkspace' } } };
      await datastore.metricFindQuery(mockQuery, options);

      expect(datastore.templateSrv.replace).toHaveBeenCalledWith('workspace = "${var}"', options.scopedVars);
      expect(datastore.queryWorkordersData).toHaveBeenCalledWith(
        'workspace = "testWorkspace"',
        ["ID", "NAME"],
        undefined,
        undefined,
        undefined
      );
    });

    test('should transform fields with multiple values', async () => {
      const mockQuery = {
        refId: 'C',
        outputType: OutputType.Properties,
        queryBy: 'workspace = "${var}"',
      };
      const options = { scopedVars: { var: { value: '{testWorkspace1,testWorkspace2}' } } };
      jest.spyOn(datastore.templateSrv, 'replace').mockReturnValue('workspace = "{testWorkspace1,testWorkspace2}"');

      await datastore.metricFindQuery(mockQuery, options);

      expect(datastore.queryWorkordersData).toHaveBeenCalledWith(
        '(workspace = "testWorkspace1" || workspace = "testWorkspace2")',
        ["ID", "NAME"],
        undefined,
        undefined,
        undefined
      );
    });

    test('should transform fields when queryBy contains a date', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2025-01-01'));

      const mockQuery = {
        refId: 'C',
        outputType: OutputType.Properties,
        queryBy: 'updatedAt = "${__now:date}"',
      };

      await datastore.metricFindQuery(mockQuery, {});

      expect(datastore.queryWorkordersData).toHaveBeenCalledWith(
        'updatedAt = "2025-01-01T00:00:00.000Z"',
        ["ID", "NAME"],
        undefined,
        undefined,
        undefined
      );

      jest.useRealTimers();
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
