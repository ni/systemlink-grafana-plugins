import { WorkItemsDataSource } from './WorkItemsDataSource';
import { setupDataSource } from 'test/fixtures';
import { DataQueryRequest, FieldType } from '@grafana/data';
import { firstValueFrom } from 'rxjs';
import { TAKE_LIMIT } from './constants';
import {
  OrderByOptions,
  OutputType,
  QueryWorkItemsResponse,
  WorkItemPropertiesOptions,
  WorkItemsQuery,
  WorkItemTypeOptions,
} from './types';

const queryOptions = {} as DataQueryRequest<WorkItemsQuery>;

const workItemsResponse: QueryWorkItemsResponse = {
  workItems: [
    {
      id: 'work-item-1',
      name: 'Battery Cycle Test',
      type: WorkItemTypeOptions.TestPlans,
      workspace: '1',
      assignedTo: '1',
      partNumber: 'part-number-1',
      systemId: '1',
      createdAt: '2025-01-01T12:00:00Z',
      timeline: { estimatedDurationInSeconds: 3600 },
      properties: { Location: 'Austin' },
    },
  ],
};

const createQuery = (query: Partial<WorkItemsQuery> = {}): WorkItemsQuery => ({
  refId: 'A',
  outputType: OutputType.Properties,
  types: [WorkItemTypeOptions.TestPlans],
  properties: [WorkItemPropertiesOptions.NAME],
  take: 1000,
  ...query,
});

jest.mock('shared/product.utils', () => {
  return {
    ProductUtils: jest.fn().mockImplementation(() => ({
      getProductNamesAndPartNumbers: jest.fn().mockResolvedValue(
        new Map([
          ['part-number-1', { id: '1', partNumber: 'part-number-1', name: 'Product 1' }],
          ['part-number-2', { id: '2', partNumber: 'part-number-2', name: 'Product 2' }],
        ])
      ),
    })),
  };
});

jest.mock('shared/users.utils', () => {
  return {
    UsersUtils: Object.assign(
      jest.fn().mockImplementation(() => ({
        getUsers: jest.fn().mockResolvedValue(
          new Map([
            ['1', { id: '1', firstName: 'User', lastName: '1', email: 'user1@123.com' }],
            ['2', { id: '2', firstName: 'User', lastName: '2', email: 'user2@123.com' }],
          ])
        ),
      })),
      {
        getUserFullName: (user: { firstName: string; lastName: string }) =>
          `${user.firstName} ${user.lastName}`,
      }
    ),
  };
});

jest.mock('shared/workspace.utils', () => {
  return {
    WorkspaceUtils: jest.fn().mockImplementation(() => ({
      getWorkspaces: jest.fn().mockResolvedValue(
        new Map([
          ['1', { id: '1', name: 'WorkspaceName' }],
          ['2', { id: '2', name: 'AnotherWorkspaceName' }],
        ])
      ),
    })),
  };
});

jest.mock('shared/system.utils', () => {
  return {
    SystemUtils: jest.fn().mockImplementation(() => ({
      getSystemAliases: jest.fn().mockResolvedValue(
        new Map([
          ['1', { id: '1', alias: 'System 1' }],
          ['2', { id: '2', alias: 'System 2' }],
        ])
      ),
    })),
  };
});

describe('WorkItemsDataSource', () => {
  it('should apply expected default query values', () => {
    const [datasource] = setupDataSource(WorkItemsDataSource);

    const query = datasource.prepareQuery({ refId: 'A' });

    expect(query.outputType).toBe(OutputType.Properties);
    expect(query.types).toEqual(Object.values(WorkItemTypeOptions));
    expect(query.properties).toEqual([
      WorkItemPropertiesOptions.ID,
      WorkItemPropertiesOptions.NAME,
      WorkItemPropertiesOptions.TYPE,
      WorkItemPropertiesOptions.STATE,
      WorkItemPropertiesOptions.WORKSPACE,
    ]);
    expect(query.orderBy).toBe(OrderByOptions.UPDATED_AT);
    expect(query.descending).toBe(true);
    expect(query.take).toBe(1000);
  });

  it('should validate types, properties, and take values before running a query', () => {
    const [datasource] = setupDataSource(WorkItemsDataSource);

    expect(datasource.isTypesValid([])).toBe(false);
    expect(datasource.isTypesValid([WorkItemTypeOptions.WorkOrders])).toBe(true);
    expect(datasource.isPropertiesValid([])).toBe(false);
    expect(datasource.isPropertiesValid([WorkItemPropertiesOptions.ID])).toBe(true);
    expect(datasource.isTakeValid(0)).toBe(false);
    expect(datasource.isTakeValid(TAKE_LIMIT + 1)).toBe(false);
    expect(datasource.isTakeValid(TAKE_LIMIT)).toBe(true);
  });

  it('should test datasource connection against the work-items service endpoint', async () => {
    const [datasource] = setupDataSource(WorkItemsDataSource);
    const postSpy = jest.spyOn(datasource, 'post').mockResolvedValue({} as any);

    const result = await datasource.testDatasource();

    expect(postSpy).toHaveBeenCalledWith('/niworkitem/v1/query-workitems', { take: 1 }, { showErrorAlert: false });
    expect(result.status).toBe('success');
  });

  it('should bubble up exception when datasource connectivity check fails', async () => {
    const [datasource] = setupDataSource(WorkItemsDataSource);
    jest.spyOn(datasource, 'post').mockRejectedValue(new Error('Failed'));

    await expect(datasource.testDatasource()).rejects.toThrow('Failed');
  });

  it('should expose global variable options for the query builder', () => {
    const [datasource] = setupDataSource(WorkItemsDataSource);

    expect(Array.isArray(datasource.globalVariableOptions())).toBe(true);
  });

  describe('runQuery', () => {
    it('should request selected work item properties and map them to Grafana fields', async () => {
      const [datasource] = setupDataSource(WorkItemsDataSource);
      const postSpy = jest.spyOn(datasource, 'post').mockResolvedValue(workItemsResponse);
      const query = createQuery({
        filter: 'state == "NEW"',
        properties: [
          WorkItemPropertiesOptions.NAME,
          WorkItemPropertiesOptions.WORKSPACE,
          WorkItemPropertiesOptions.ASSIGNED_TO,
          WorkItemPropertiesOptions.PART_NUMBER,
          WorkItemPropertiesOptions.SYSTEM_ID,
          WorkItemPropertiesOptions.CREATED_AT,
          WorkItemPropertiesOptions.ESTIMATED_DURATION,
          WorkItemPropertiesOptions.PROPERTIES,
        ],
      });

      const result = await datasource.runQuery(query, queryOptions);

      expect(postSpy).toHaveBeenCalledWith(
        '/niworkitem/v1/query-workitems',
        {
          filter: '(type == "TEST_PLANS") && (state == "NEW")',
          take: 1000,
          orderBy: undefined,
          descending: undefined,
          projection: query.properties,
          continuationToken: undefined,
        },
        { showErrorAlert: false }
      );
      expect(result.fields).toEqual([
        { name: 'Work item name', type: FieldType.string, values: ['Battery Cycle Test'] },
        { name: 'Workspace', type: FieldType.string, values: ['WorkspaceName'] },
        { name: 'Assigned to', type: FieldType.string, values: ['User 1'] },
        { name: 'Part number', type: FieldType.string, values: ['Product 1 (part-number-1)'] },
        { name: 'System ID', type: FieldType.string, values: ['System 1'] },
        {
          name: 'Created at',
          type: FieldType.time,
          values: ['2025-01-01T12:00:00Z'],
          config: { unit: 'time:YYYY-MM-DD HH:mm:ss' },
        },
        { name: 'Estimated duration', type: FieldType.number, values: [3600] },
        { name: 'Custom properties', type: FieldType.other, values: [{ Location: 'Austin' }] },
      ]);
    });

    it('should return the total count when total count output is selected', async () => {
      const [datasource] = setupDataSource(WorkItemsDataSource);
      const postSpy = jest.spyOn(datasource, 'post').mockResolvedValue({ workItems: [], totalCount: 24 });

      const result = await datasource.runQuery(
        createQuery({ outputType: OutputType.TotalCount, filter: undefined }),
        queryOptions
      );

      expect(postSpy).toHaveBeenCalledWith(
        '/niworkitem/v1/query-workitems',
        {
          filter: '(type == "TEST_PLANS")',
          take: 1,
          orderBy: undefined,
          descending: undefined,
          returnCount: true,
        },
        { showErrorAlert: false }
      );
      expect(result).toEqual({
        refId: 'A',
        name: 'A',
        fields: [{ name: 'A', type: FieldType.number, values: [24] }],
      });
    });

    it('should transform duration filters to the API seconds fields', async () => {
      const [datasource] = setupDataSource(WorkItemsDataSource);
      const postSpy = jest.spyOn(datasource, 'post').mockResolvedValue({ workItems: [] });

      await datasource.runQuery(
        createQuery({
          filter:
            'estimatedDurationInDays >= "2" && estimatedDurationInHours < "72" && plannedDurationInDays = "3" && plannedDurationInHours > "12"',
        }),
        queryOptions
      );

      expect(postSpy).toHaveBeenCalledWith(
        '/niworkitem/v1/query-workitems',
        expect.objectContaining({
          filter:
            '(type == "TEST_PLANS") && (timeline.estimatedDurationInSeconds >= 172800 && timeline.estimatedDurationInSeconds < 259200 && schedule.plannedDurationInSeconds = 259200 && schedule.plannedDurationInSeconds > 43200)',
        }),
        { showErrorAlert: false }
      );
    });

    it('should request continuation pages when take exceeds the API maximum', async () => {
      const [datasource] = setupDataSource(WorkItemsDataSource);
      const postSpy = jest
        .spyOn(datasource, 'post')
        .mockResolvedValueOnce({
          workItems: Array.from({ length: 1000 }, (_, index) => ({ name: `Work item ${index}` })),
          continuationToken: 'next-page',
        })
        .mockResolvedValueOnce({ workItems: [{ name: 'Second' }] });

      const result = await datasource.runQuery(createQuery({ take: 1001 }), queryOptions);

      expect(postSpy).toHaveBeenNthCalledWith(
        1,
        '/niworkitem/v1/query-workitems',
        expect.objectContaining({ take: 1000, continuationToken: undefined }),
        { showErrorAlert: false }
      );
      expect(postSpy).toHaveBeenNthCalledWith(
        2,
        '/niworkitem/v1/query-workitems',
        expect.objectContaining({ take: 1, continuationToken: 'next-page' }),
        { showErrorAlert: false }
      );
      expect(result.fields[0].values).toHaveLength(1001);
      expect((result.fields[0]?.values ?? [])[1000]).toBe('Second');
    });

    it('should reject a failed work-items query with an actionable error', async () => {
      const [datasource] = setupDataSource(WorkItemsDataSource);
      jest.spyOn(datasource, 'post').mockRejectedValue(new Error('Request failed'));

      await expect(datasource.runQuery(createQuery(), queryOptions)).rejects.toThrow(
        'Unable to query work items. Please try again.'
      );
    });

    it('should not dispatch hidden or invalid queries through the datasource query flow', async () => {
      const [datasource] = setupDataSource(WorkItemsDataSource);
      const runQuerySpy = jest.spyOn(datasource, 'runQuery');

      const response = await firstValueFrom(datasource.query({
        targets: [
          createQuery({ hide: true }),
          createQuery({ refId: 'B', types: [] }),
          createQuery({ refId: 'C', properties: [] }),
          createQuery({ refId: 'D', take: 0 }),
        ],
      } as DataQueryRequest<WorkItemsQuery>));

      expect(runQuerySpy).not.toHaveBeenCalled();
      expect(response).toEqual({ data: [] });
    });
  });
});

describe('loadProductNamesAndPartNumbers', () => {
  it('should return product names and part numbers when the API call succeeds', async () => {
    const [datasource] = setupDataSource(WorkItemsDataSource);

    const result = await datasource.loadProductNamesAndPartNumbers();

    expect(result.get('part-number-1')?.name).toBe('Product 1');
    expect(result.get('part-number-2')?.name).toBe('Product 2');
  });

  it('should return an empty map and set a generic error when the API call fails with an unknown error', async () => {
    const [datasource] = setupDataSource(WorkItemsDataSource);
    jest.spyOn(datasource.productUtils, 'getProductNamesAndPartNumbers').mockRejectedValue(new Error('Error'));

    const result = await datasource.loadProductNamesAndPartNumbers();

    expect(result.size).toBe(0);
    expect(datasource.errorTitle).toBe('Warning during work items query');
    expect(datasource.errorDescription).toContain(
      'Some values may not be available in the query builder lookups due to an unknown error.'
    );
  });

  it('should set a not found error when the API call fails with a 404 status', async () => {
    const [datasource] = setupDataSource(WorkItemsDataSource);
    jest
      .spyOn(datasource.productUtils, 'getProductNamesAndPartNumbers')
      .mockRejectedValue(new Error('Request failed with status code: 404'));

    await datasource.loadProductNamesAndPartNumbers();

    expect(datasource.errorTitle).toBe('Warning during work items query');
    expect(datasource.errorDescription).toContain(
      'The query builder lookups failed because the requested resource was not found. Please check the query parameters and try again.'
    );
  });
});

describe('loadUsers', () => {
  it('should return the list of users when the API call succeeds', async () => {
    const [datasource] = setupDataSource(WorkItemsDataSource);

    const result = await datasource.loadUsers();

    expect(result.get('1')?.firstName).toBe('User');
    expect(result.get('2')?.firstName).toBe('User');
  });

  it('should return an empty map and set an error when the API call fails', async () => {
    const [datasource] = setupDataSource(WorkItemsDataSource);
    jest.spyOn(datasource.usersUtils, 'getUsers').mockRejectedValue(new Error('Error'));

    const result = await datasource.loadUsers();

    expect(result.size).toBe(0);
    expect(datasource.errorTitle).toBe('Warning during work items query');
  });
});

describe('loadWorkspaces', () => {
  it('should return the list of workspaces when the API call succeeds', async () => {
    const [datasource] = setupDataSource(WorkItemsDataSource);

    const result = await datasource.loadWorkspaces();

    expect(result.get('1')?.name).toBe('WorkspaceName');
    expect(result.get('2')?.name).toBe('AnotherWorkspaceName');
  });

  it('should return an empty map and set an error when the API call fails', async () => {
    const [datasource] = setupDataSource(WorkItemsDataSource);
    jest.spyOn(datasource.workspaceUtils, 'getWorkspaces').mockRejectedValue(new Error('Error'));

    const result = await datasource.loadWorkspaces();

    expect(result.size).toBe(0);
    expect(datasource.errorTitle).toBe('Warning during work items query');
  });
});

describe('loadSystemAliases', () => {
  it('should return the list of system aliases when the API call succeeds', async () => {
    const [datasource] = setupDataSource(WorkItemsDataSource);

    const result = await datasource.loadSystemAliases();

    expect(result.get('1')?.alias).toBe('System 1');
    expect(result.get('2')?.alias).toBe('System 2');
  });

  it('should return an empty map and set an error when the API call fails', async () => {
    const [datasource] = setupDataSource(WorkItemsDataSource);
    jest.spyOn(datasource.systemUtils, 'getSystemAliases').mockRejectedValue(new Error('Error'));

    const result = await datasource.loadSystemAliases();

    expect(result.size).toBe(0);
    expect(datasource.errorTitle).toBe('Warning during work items query');
  });
});
