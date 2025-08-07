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

describe.skip('WorkOrdersDataSource', () => {
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
        take: 1000
      };

      jest.spyOn(datastore, 'queryWorkordersData').mockResolvedValue([]);

      const response = await datastore.runQuery(mockQuery, {} as DataQueryRequest);

      expect(response.fields).toHaveLength(1);
      expect(response.fields).toEqual([{"name": "Work order name", "type": "string", "values": []}]);
      expect(response.refId).toEqual('A');
      expect(response.name).toEqual('A');
      expect(datastore.queryWorkordersData).toHaveBeenCalledWith('filter', ["NAME"], undefined, undefined, 1000);
    });

    test('processes work orders query when outputType is Properties', async () => {
      const mockQuery = {
        refId: 'A',
        outputType: OutputType.Properties,
        queryBy: 'filter',
        properties: [WorkOrderPropertiesOptions.WORKSPACE],
        take: 1000
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
        properties: [WorkOrderPropertiesOptions.NAME, WorkOrderPropertiesOptions.STATE],
        take: 1000
      };

      const response = await datastore.runQuery(query, {} as DataQueryRequest);

      const fields = response.fields as Field[];
      expect(fields).toMatchSnapshot();
    });

    it('should handle test plan custom properties', async () => {
      const query = {
        refId: 'A',
        outputType: OutputType.Properties,
        properties: [WorkOrderPropertiesOptions.PROPERTIES],
        take: 1000,
      };
      const workordersResponse = [
        { id: '1', properties: { customProp1: 'value1', customProp2: 'value2' } },
        { id: '2', properties: { customProp1: 'value3' } },
      ];
      jest.spyOn(datastore, 'queryWorkordersData').mockResolvedValue(workordersResponse as unknown as WorkOrder[]);

      const result = await datastore.runQuery(query, {} as DataQueryRequest);

      expect(result.fields).toHaveLength(1);
      expect(result.fields[0].name).toEqual('Properties');
      expect(result.fields[0].values).toEqual([
        JSON.stringify({ customProp1: 'value1', customProp2: 'value2' }),
        JSON.stringify({ customProp1: 'value3' }),
      ]);
    });

    it('should display empty cell when properties is empty', async () => {
      const query = {
        refId: 'A',
        outputType: OutputType.Properties,
        properties: [WorkOrderPropertiesOptions.PROPERTIES],
        take: 1000,
      };
      const workordersResponse = [{ id: '1', properties: {} }];
      jest.spyOn(datastore, 'queryWorkordersData').mockResolvedValue(workordersResponse as unknown as WorkOrder[]);

      const result = await datastore.runQuery(query, {} as DataQueryRequest);

      expect(result.fields).toHaveLength(1);
      expect(result.fields[0].name).toEqual('Properties');
      expect(result.fields[0].values).toEqual(['']);
    });    
    
    it('should convert user Ids to user names for assigned to field', async () => {
      const query = {
        refId: 'A',
        outputType: OutputType.Properties,
        properties: [WorkOrderPropertiesOptions.ASSIGNED_TO],
        orderBy: OrderByOptions.UPDATED_AT,
        take: 10,
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
        take: 10,
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
        take: 10,
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
        take: 10,
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
        take: 10,
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
        queryBy: 'workspace = "${var}"',
        properties: [WorkOrderPropertiesOptions.NAME],
        take: 1000
      };
      jest.spyOn(datastore.templateSrv, 'replace').mockReturnValue('workspace = "testWorkspace"');

      const options = { scopedVars: { var: { value: 'testWorkspace' } } };
      await datastore.runQuery(mockQuery, options as unknown as DataQueryRequest);

      expect(datastore.templateSrv.replace).toHaveBeenCalledWith('workspace = "${var}"', options.scopedVars);
      expect(datastore.queryWorkordersData).toHaveBeenCalledWith(
        'workspace = "testWorkspace"',
        ["NAME"],
        undefined,
        undefined,
        1000
      );
    });

    test('should transform fields with multiple values', async () => {
      const mockQuery = {
        refId: 'C',
        outputType: OutputType.Properties,
        queryBy: 'workspace = "${var}"',
        properties: [WorkOrderPropertiesOptions.NAME],
        take: 1000
      };
      const options = { scopedVars: { var: { value: '{testWorkspace1,testWorkspace2}' } } };
      jest.spyOn(datastore.templateSrv, 'replace').mockReturnValue('workspace = "{testWorkspace1,testWorkspace2}"');

      await datastore.runQuery(mockQuery, options as unknown as DataQueryRequest);

      expect(datastore.queryWorkordersData).toHaveBeenCalledWith(
        '(workspace = "testWorkspace1" || workspace = "testWorkspace2")',
        ["NAME"],
        undefined,
        undefined,
        1000
      );
    });

    test('should transform fields when queryBy contains a date', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2025-01-01'));

      const mockQuery = {
        refId: 'C',
        outputType: OutputType.Properties,
        queryBy: 'updatedAt = "${__now:date}"',
        properties: [WorkOrderPropertiesOptions.NAME],
        take: 1000
      };

      await datastore.runQuery(mockQuery, {} as DataQueryRequest);

      expect(datastore.queryWorkordersData).toHaveBeenCalledWith(
        'updatedAt = "2025-01-01T00:00:00.000Z"',
        ["NAME"],
        undefined,
        undefined,
        1000
      );

      jest.useRealTimers();
    });

    test('should return type as string type', async () => {
      const mockQuery = {
        refId: 'A',
        outputType: OutputType.Properties,
        properties: [WorkOrderPropertiesOptions.NAME, WorkOrderPropertiesOptions.UPDATED_AT],
        take: 1000
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

    it('should set field names as expected', async () => {
      const mockQuery = {
        refId: 'A',
        outputType: OutputType.Properties,
        properties: [
          WorkOrderPropertiesOptions.ID,
          WorkOrderPropertiesOptions.NAME,
          WorkOrderPropertiesOptions.TYPE,
          WorkOrderPropertiesOptions.STATE,
          WorkOrderPropertiesOptions.REQUESTED_BY,
          WorkOrderPropertiesOptions.ASSIGNED_TO,
          WorkOrderPropertiesOptions.CREATED_AT,
          WorkOrderPropertiesOptions.UPDATED_AT,
          WorkOrderPropertiesOptions.CREATED_BY,
          WorkOrderPropertiesOptions.UPDATED_BY,
          WorkOrderPropertiesOptions.DESCRIPTION,
          WorkOrderPropertiesOptions.EARLIEST_START_DATE,
          WorkOrderPropertiesOptions.DUE_DATE,
          WorkOrderPropertiesOptions.WORKSPACE,
          WorkOrderPropertiesOptions.PROPERTIES
        ],
        take: 1000
      };

      jest.spyOn(datastore, 'queryWorkordersData').mockResolvedValue([] as WorkOrder[]);

      const result = await datastore.runQuery(mockQuery, {} as DataQueryRequest);

      expect(result.fields[0].name).toEqual('Work order ID');
      expect(result.fields[1].name).toEqual('Work order name');
      expect(result.fields[2].name).toEqual('Work order type');
      expect(result.fields[3].name).toEqual('State');
      expect(result.fields[4].name).toEqual('Requested by');
      expect(result.fields[5].name).toEqual('Assigned to');
      expect(result.fields[6].name).toEqual('Created');
      expect(result.fields[7].name).toEqual('Updated');
      expect(result.fields[8].name).toEqual('Created by');
      expect(result.fields[9].name).toEqual('Updated by');
      expect(result.fields[10].name).toEqual('Description');
      expect(result.fields[11].name).toEqual('Earliest start date');
      expect(result.fields[12].name).toEqual('Due date');
      expect(result.fields[13].name).toEqual('Workspace');
      expect(result.fields[14].name).toEqual('Properties');
    });

    it('should return empty data when properties is invalid', async () => {
      const mockQuery = {
        refId: 'A',
        outputType: OutputType.Properties,
        properties: [],
        take: 1000,
      };

      jest.spyOn(datastore, 'queryWorkordersData').mockResolvedValue([] as WorkOrder[]);

      const result = await datastore.runQuery(mockQuery, {} as DataQueryRequest);

      expect(result.fields).toHaveLength(0);
    });

    it('should return empty data when take is invalid', async () => {
      const mockQuery = {
        refId: 'A',
        outputType: OutputType.Properties,
        properties: [WorkOrderPropertiesOptions.NAME],
        take: undefined,
      };

      jest.spyOn(datastore, 'queryWorkordersData').mockResolvedValue([] as WorkOrder[]);

      const result = await datastore.runQuery(mockQuery, {} as DataQueryRequest);

      expect(result.fields).toHaveLength(0);
    });

    test('should return expected data when take is 0', async () => {
      const mockQuery = {
        refId: 'A',
        outputType: OutputType.Properties,
        properties: [WorkOrderPropertiesOptions.NAME],
        take: 0,
      };

      const result = await datastore.runQuery(mockQuery, {} as DataQueryRequest);

      expect(result).toMatchSnapshot();
    });

    test('should return expected data when take is 10000', async () => {
      const mockQuery = {
        refId: 'A',
        outputType: OutputType.Properties,
        properties: [WorkOrderPropertiesOptions.NAME],
        take: 10000,
      };

      const result = await datastore.runQuery(mockQuery, {} as DataQueryRequest);

      expect(result).toMatchSnapshot();
    });

    it('should return empty data when take is less than 0', async () => {
      const mockQuery = {
        refId: 'A',
        outputType: OutputType.Properties,
        properties: [WorkOrderPropertiesOptions.NAME],
        take: -1,
      };

      jest.spyOn(datastore, 'queryWorkordersData').mockResolvedValue([] as WorkOrder[]);

      const result = await datastore.runQuery(mockQuery, {} as DataQueryRequest);

      expect(result.fields).toHaveLength(0);
    });

    it('should return empty data when take is greater than max take', async () => {
      const mockQuery = {
        refId: 'A',
        outputType: OutputType.Properties,
        properties: [WorkOrderPropertiesOptions.NAME],
        take: 100000,
      };

      jest.spyOn(datastore, 'queryWorkordersData').mockResolvedValue([] as WorkOrder[]);

      const result = await datastore.runQuery(mockQuery, {} as DataQueryRequest);

      expect(result.fields).toHaveLength(0);
    });
  });

  describe('loadWorkspaces', () => {
    test('returns workspaces', async () => {
      const result = await datastore.loadWorkspaces();

      expect(result.get('Workspace1')?.name).toBe('Workspace Name');
      expect(result.get('Workspace2')?.name).toBe('Another Workspace Name');
    });

    it('should handle errors and set error and innerError fields', async () => {
      jest.spyOn(datastore.workspaceUtils, 'getWorkspaces').mockRejectedValue(new Error('Error'));

      await datastore.loadWorkspaces();

      expect(datastore.errorTitle).toBe('Warning during workorders query');
      expect(datastore.errorDescription).toContain(
        'Some values may not be available in the query builder lookups due to an unknown error.'
      );
    });

    it('should handle errors and set innerError fields with error message detail', async () => {
      datastore.errorTitle = '';
      jest
        .spyOn(datastore.workspaceUtils, 'getWorkspaces')
        .mockRejectedValue(
          new Error('Request failed with status code: 500, Error message: {"message": "Internal Server Error"}')
        );

      await datastore.loadWorkspaces();

      expect(datastore.errorTitle).toBe('Warning during workorders query');
      expect(datastore.errorDescription).toContain(
        'Some values may not be available in the query builder lookups due to the following error: Internal Server Error.'
      );
    });

    test('should throw timeOut error when API returns 504 status', async () => {
      datastore.errorTitle = '';
      jest
        .spyOn(datastore.workspaceUtils, 'getWorkspaces')
        .mockRejectedValue(new Error('Request failed with status code: 504'));

      await datastore.loadWorkspaces();

      expect(datastore.errorTitle).toBe('Warning during workorders query');
      expect(datastore.errorDescription).toContain(
        `The query builder lookups experienced a timeout error. Some values might not be available. Narrow your query with a more specific filter and try again.`
      );
    });

    it('should throw too many requests error when API returns 429 status', async () => {
      datastore.errorTitle = '';
      jest
        .spyOn(datastore.workspaceUtils, 'getWorkspaces')
        .mockRejectedValue(new Error('Request failed with status code: 429'));

      await datastore.loadWorkspaces();

      expect(datastore.errorTitle).toBe('Warning during workorders query');
      expect(datastore.errorDescription).toContain(
        `The query builder lookups failed due to too many requests. Please try again later.`
      );
    });

    it('should throw not found error when API returns 404 status', async () => {
      datastore.errorTitle = '';
      jest
        .spyOn(datastore.workspaceUtils, 'getWorkspaces')
        .mockRejectedValue(new Error('Request failed with status code: 404'));

      await datastore.loadWorkspaces();

      expect(datastore.errorTitle).toBe('Warning during workorders query');
      expect(datastore.errorDescription).toContain(
        `The query builder lookups failed because the requested resource was not found. Please check the query parameters and try again.`
      );
    });
  });

  describe('loadUsers', () => {
    test('returns users', async () => {
      const result = await datastore.loadUsers();

      expect(result.get('1')?.lastName).toBe('1');
      expect(result.get('2')?.lastName).toBe('2');
    });

    it('should handle errors and set error and innerError fields', async () => {
      jest.spyOn(datastore.usersUtils, 'getUsers').mockRejectedValue(new Error('Error'));

      await datastore.loadUsers();

      expect(datastore.errorTitle).toBe('Warning during workorders query');
      expect(datastore.errorDescription).toContain(
        'Some values may not be available in the query builder lookups due to an unknown error.'
      );
    });

    it('should handle errors and set innerError fields with error message detail', async () => {
      datastore.errorTitle = '';
      jest
        .spyOn(datastore.usersUtils, 'getUsers')
        .mockRejectedValue(
          new Error('Request failed with status code: 500, Error message: {"message": "Internal Server Error"}')
        );

      await datastore.loadUsers();

      expect(datastore.errorTitle).toBe('Warning during workorders query');
      expect(datastore.errorDescription).toContain(
        'Some values may not be available in the query builder lookups due to the following error: Internal Server Error.'
      );
    });

    test('should throw timeOut error when API returns 504 status', async () => {
      datastore.errorTitle = '';
      jest
        .spyOn(datastore.usersUtils, 'getUsers')
        .mockRejectedValue(new Error('Request failed with status code: 504'));

      await datastore.loadUsers();

      expect(datastore.errorTitle).toBe('Warning during workorders query');
      expect(datastore.errorDescription).toContain(
        `The query builder lookups experienced a timeout error. Some values might not be available. Narrow your query with a more specific filter and try again.`
      );
    });

    it('should throw too many requests error when API returns 429 status', async () => {
      datastore.errorTitle = '';
      jest
        .spyOn(datastore.usersUtils, 'getUsers')
        .mockRejectedValue(new Error('Request failed with status code: 429'));

      await datastore.loadUsers();

      expect(datastore.errorTitle).toBe('Warning during workorders query');
      expect(datastore.errorDescription).toContain(
        `The query builder lookups failed due to too many requests. Please try again later.`
      );
    });

    it('should throw not found error when API returns 404 status', async () => {
      datastore.errorTitle = '';
      jest
        .spyOn(datastore.usersUtils, 'getUsers')
        .mockRejectedValue(new Error('Request failed with status code: 404'));

      await datastore.loadUsers();

      expect(datastore.errorTitle).toBe('Warning during workorders query');
      expect(datastore.errorDescription).toContain(
        `The query builder lookups failed because the requested resource was not found. Please check the query parameters and try again.`
      );
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
        'The query failed due to the following error: (status 400) "Error".'
      );
    });

    it('should throw timeOut error when API returns 504 status', async () => {
      backendServer.fetch
        .calledWith(requestMatching({ url: '/niworkorder/v1/query-workorders' }))
        .mockReturnValue(createFetchError(504));

      await expect(datastore.queryWorkOrders({})).rejects.toThrow(
        'The query to fetch workorders experienced a timeout error. Narrow your query with a more specific filter and try again.'
      );
    });

    it('should throw too many requests error when API returns 429 status', async () => {
      jest.spyOn(datastore, 'post').mockImplementation(() => {
        throw new Error('Request failed with status code: 429');
      });

      await expect(datastore.queryWorkOrders({})).rejects.toThrow(
        'The query to fetch workorders failed due to too many requests. Please try again later.'
      );
    });

    it('should throw not found error when API returns 404 status', async () => {
      backendServer.fetch
        .calledWith(requestMatching({ url: '/niworkorder/v1/query-workorders' }))
        .mockReturnValue(createFetchError(404));

      await expect(datastore.queryWorkOrders({})).rejects.toThrow(
        'The query to fetch workorders failed because the requested resource was not found. Please check the query parameters and try again.'
      );
    })

    it('should throw error with unknown error when API returns error without status', async () => {
      backendServer.fetch
        .calledWith(requestMatching({ url: '/niworkorder/v1/query-workorders' }))
        .mockImplementation(() => {
          throw new Error('Error');
        });

      await expect(datastore.queryWorkOrders({})).rejects.toThrow('The query failed due to an unknown error.');
    });

    it('should publish alertError event when error occurs', async () => {
      const publishMock = jest.fn();
      (datastore as any).appEvents = { publish: publishMock };
      backendServer.fetch
        .calledWith(requestMatching({ url: '/niworkorder/v1/query-workorders' }))
        .mockReturnValue(createFetchError(400));

      await expect(datastore.queryWorkOrders({})).rejects.toThrow(
        'The query failed due to the following error: (status 400) "Error".'
      );

      expect(publishMock).toHaveBeenCalledWith({
        type: 'alert-error',
        payload: [
          'Error during workorders query',
          expect.stringContaining('The query failed due to the following error: (status 400) "Error".'),
        ],
      });
    });
  });

  describe('default query', () => {
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
        take: 1000,
      };
      jest.spyOn(datastore.templateSrv, 'replace').mockReturnValue('workspace = "testWorkspace"');

      const options = { scopedVars: { var: { value: 'testWorkspace' } } };
      await datastore.metricFindQuery(mockQuery, options);

      expect(datastore.templateSrv.replace).toHaveBeenCalledWith('workspace = "${var}"', options.scopedVars);
      expect(datastore.queryWorkordersData).toHaveBeenCalledWith(
        'workspace = "testWorkspace"',
        ["ID", "NAME"],
        "UPDATED_AT",
        true,
        1000
      );
    });

    test('should transform fields with multiple values', async () => {
      const mockQuery = {
        refId: 'C',
        outputType: OutputType.Properties,
        queryBy: 'workspace = "${var}"',
        take: 1000,
      };
      const options = { scopedVars: { var: { value: '{testWorkspace1,testWorkspace2}' } } };
      jest.spyOn(datastore.templateSrv, 'replace').mockReturnValue('workspace = "{testWorkspace1,testWorkspace2}"');

      await datastore.metricFindQuery(mockQuery, options);

      expect(datastore.queryWorkordersData).toHaveBeenCalledWith(
        '(workspace = "testWorkspace1" || workspace = "testWorkspace2")',
        ["ID", "NAME"],
        "UPDATED_AT",
        true,
        1000
      );
    });

    test('should transform fields when queryBy contains a date', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2025-01-01'));

      const mockQuery = {
        refId: 'C',
        outputType: OutputType.Properties,
        queryBy: 'updatedAt = "${__now:date}"',
        take: 1000,
      };

      await datastore.metricFindQuery(mockQuery, {});

      expect(datastore.queryWorkordersData).toHaveBeenCalledWith(
        'updatedAt = "2025-01-01T00:00:00.000Z"',
        ["ID", "NAME"],
        "UPDATED_AT",
        true,
        1000
      );

      jest.useRealTimers();
    });

    test('should populate defalult query properties', async () => {
      const mockQuery = {
        refId: 'A',
      };  
      await datastore.metricFindQuery(mockQuery, {});

      expect(datastore.queryWorkordersData).toHaveBeenCalledWith(
        undefined,
        ["ID", "NAME"],
        "UPDATED_AT",
        true,
        1000
      );

      jest.useRealTimers();
    });

    test('should return expected data when take is 0', async () => {
      const mockQuery = {
        refId: 'A',
        take: 0,
      };

      const result = await datastore.metricFindQuery(mockQuery, {} as LegacyMetricFindQueryOptions);

      expect(result).toMatchSnapshot();
    });

    test('should return expected data when take is 10000', async () => {
      const mockQuery = {
        refId: 'A',
        take: 10000,
      };

      const result = await datastore.metricFindQuery(mockQuery, {} as LegacyMetricFindQueryOptions);

      expect(result).toMatchSnapshot();
    });

    test('should return empty array when take is invalid', async () => {
      const mockQuery = {
        refId: 'A',
        take: undefined,
      };

      const result = await datastore.metricFindQuery(mockQuery, {} as LegacyMetricFindQueryOptions);

      expect(result).toEqual([]);
    });

    test('should return empty array when take is less than 0', async () => {
      const mockQuery = {
        refId: 'A',
        take: -1,
      };

      const result = await datastore.metricFindQuery(mockQuery, {} as LegacyMetricFindQueryOptions);

      expect(result).toEqual([]);
    });

    test('should return empty array when take is greater than max take', async () => {
      const mockQuery = {
        refId: 'A',
        take: 100000,
      };

      const result = await datastore.metricFindQuery(mockQuery, {} as LegacyMetricFindQueryOptions);

      expect(result).toEqual([]);
    });

    test('should sort work order options by name', async () => {
      const mockQuery = {
        refId: 'A',
        take: 1000,
      };
      jest.spyOn(datastore, 'queryWorkordersData').mockResolvedValue([
        { id: '2', name: 'WorkOrder B' },
        { id: '1', name: 'WorkOrder C' },
        { id: '3', name: 'WorkOrder A' },
      ] as WorkOrder[]);

      const results = await datastore.metricFindQuery(mockQuery, {} as LegacyMetricFindQueryOptions);

      expect(results).toEqual([
        { text: 'WorkOrder A (3)', value: '3' },
        { text: 'WorkOrder B (2)', value: '2' },
        { text: 'WorkOrder C (1)', value: '1' },
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
