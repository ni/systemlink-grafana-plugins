import { DataQueryRequest, TypedVariableModel } from '@grafana/data';
import { WorkItemsDataSource } from './WorkItemsDataSource';
import { setupDataSource } from 'test/fixtures';
import { OrderByOptions, OutputType, WorkItemPropertiesOptions, WorkItemsVariableQueryType, WorkItemTypeOptions } from './types';

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
    UsersUtils: jest.fn().mockImplementation(() => ({
      getUsers: jest.fn().mockResolvedValue(
        new Map([
          ['1', { id: '1', firstName: 'User', lastName: '1', email: 'user1@123.com' }],
          ['2', { id: '2', firstName: 'User', lastName: '2', email: 'user2@123.com' }],
        ])
      ),
    })),
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
  let datasource: WorkItemsDataSource;

  beforeEach(() => {
    [datasource] = setupDataSource(WorkItemsDataSource);
  });

  it('should apply expected default query values', () => {
    const query = datasource.prepareQuery({ refId: 'A' });

    expect(query.outputType).toBe(OutputType.Properties);
    expect(query.types).toEqual(Object.values(WorkItemTypeOptions));
    expect(query.properties).toEqual([
      WorkItemPropertiesOptions.NAME,
      WorkItemPropertiesOptions.STATE,
      WorkItemPropertiesOptions.ASSIGNED_TO,
      WorkItemPropertiesOptions.PLANNED_START_DATE,
      WorkItemPropertiesOptions.DUE_DATE,
    ]);
    expect(query.orderBy).toBe(OrderByOptions.UPDATED_AT);
    expect(query.descending).toBe(true);
    expect(query.take).toBe(1000);
  });

  it('should test datasource connection against the work-items service endpoint', async () => {
    const postSpy = jest.spyOn(datasource, 'post').mockResolvedValue({} as any);

    const result = await datasource.testDatasource();

    expect(postSpy).toHaveBeenCalledWith('/niworkitem/v1/query-workitems', { take: 1 }, { showErrorAlert: false });
    expect(result.status).toBe('success');
  });

  it('should bubble up exception when datasource connectivity check fails', async () => {
    jest.spyOn(datasource, 'post').mockRejectedValue(new Error('Failed'));

    await expect(datasource.testDatasource()).rejects.toThrow('Failed');
  });

  describe('metricFindQuery', () => {
    it('should return the list of work item types when the query type is list work item types', async () => {
      const [datasource] = setupDataSource(WorkItemsDataSource);

      const result = await datasource.metricFindQuery(
        { refId: 'A', queryType: WorkItemsVariableQueryType.ListWorkItemTypes },
        {} as any
      );

      expect(result).toEqual([
        { text: 'Work orders', value: WorkItemTypeOptions.WorkOrders },
        { text: 'Test plans', value: WorkItemTypeOptions.TestPlans },
        { text: 'Job', value: WorkItemTypeOptions.Job },
        { text: 'Maintenance', value: WorkItemTypeOptions.Maintenance },
        { text: 'Calibration', value: WorkItemTypeOptions.Calibration },
        { text: 'Reservation', value: WorkItemTypeOptions.Reservation },
        { text: 'Transport Order', value: WorkItemTypeOptions.TransportOrder },
      ]);
    });

    // TODO: AB#3923375 - Update once work items querying is implemented.
    it('should return an empty list for the list work items query type', async () => {
      const [datasource] = setupDataSource(WorkItemsDataSource);

      const result = await datasource.metricFindQuery(
        { refId: 'A', queryType: WorkItemsVariableQueryType.ListWorkItems },
        {} as any
      );

      expect(result).toEqual([]);
    });
  });

  describe('runQuery', () => {
    it('should return an empty data frame without querying when no types are selected', async () => {
      const postSpy = jest.spyOn(datasource, 'post');
      const query = { refId: 'A', outputType: OutputType.TotalCount, types: [] };

      const result = await datasource.runQuery(query, {} as DataQueryRequest);

      expect(result).toEqual({ refId: 'A', name: 'A', fields: [] });
      expect(postSpy).not.toHaveBeenCalled();
    });

    it('should combine the type filter and the queryBy filter', async () => {
      const postSpy = jest.spyOn(datasource, 'post').mockResolvedValue({ totalCount: 1 });
      const query = {
        refId: 'A',
        outputType: OutputType.TotalCount,
        types: [WorkItemTypeOptions.WorkOrders, WorkItemTypeOptions.TestPlans],
        filter: 'state = "NEW"',
      };

      await datasource.runQuery(query, { scopedVars: {} } as DataQueryRequest);

      expect(postSpy).toHaveBeenCalledWith(
        '/niworkitem/v1/query-workitems',
        {
          filter: '(type = "workorder" || type = "testplan") && (state = "NEW")',
          take: 0,
          returnCount: true,
        },
        { showErrorAlert: false }
      );
    });

    it('should group each filter when one type is selected', async () => {
      const postSpy = jest.spyOn(datasource, 'post').mockResolvedValue({ totalCount: 1 });
      const query = {
        refId: 'A',
        outputType: OutputType.TotalCount,
        types: [WorkItemTypeOptions.WorkOrders],
        filter: 'state = "NEW"',
      };

      await datasource.runQuery(query, {} as DataQueryRequest);

      expect(postSpy).toHaveBeenCalledWith(
        '/niworkitem/v1/query-workitems',
        {
          filter: '(type = "workorder") && (state = "NEW")',
          take: 0,
          returnCount: true,
        },
        { showErrorAlert: false }
      );
    });

    it('should omit the type filter when all types are selected', async () => {
      const postSpy = jest.spyOn(datasource, 'post').mockResolvedValue({ totalCount: 1 });
      const query = {
        refId: 'A',
        outputType: OutputType.TotalCount,
        types: Object.values(WorkItemTypeOptions),
      };

      await datasource.runQuery(query, {} as DataQueryRequest);

      expect(postSpy).toHaveBeenCalledWith(
        '/niworkitem/v1/query-workitems',
        { 
          filter: undefined,
          take: 0,
          returnCount: true
        },
        { showErrorAlert: false }
      );
    });

    describe('properties output type', () => {
      it('should return an empty fields array when outputType is Properties', async () => {
        const query = { refId: 'A', outputType: OutputType.Properties };
        const result = await datasource.runQuery(query, {} as DataQueryRequest);
        
        expect(result).toEqual({ refId: 'A', name: 'A', fields: [] });
      });
    });

    describe('total count output type', () => {
      it('should return the total count when outputType is TotalCount', async () => {
        jest.spyOn(datasource, 'post').mockResolvedValue({ totalCount: 42 });

        const query = {
          refId: 'A',
          outputType: OutputType.TotalCount,
          types: [WorkItemTypeOptions.WorkOrders],
        };
        const result = await datasource.runQuery(query, {} as DataQueryRequest);

        expect(result).toEqual({
          refId: 'A',
          name: 'A',
          fields: [{ name: 'A', values: [42] }],
        });
      });

      it('should return 0 as total count when the API returns no totalCount', async () => {
        jest.spyOn(datasource, 'post').mockResolvedValue({});
        const query = {
          refId: 'A',
          outputType: OutputType.TotalCount,
          types: [WorkItemTypeOptions.WorkOrders],
        };

        const result = await datasource.runQuery(query, {} as DataQueryRequest);

        expect(result.fields).toEqual([{ name: 'A', values: [0] }]);
      });
    });

    describe('error handling', () => {
      const errorCases = [
        {
          description: 'an unknown status code',
          rejectedError: 'Request failed',
          expectedMessage: 'The query failed due to an unknown error.',
        },
        {
          description: 'status code 404',
          rejectedError: 'Request failed with status code: 404',
          expectedMessage:
            'The query to fetch work items failed because the requested resource was not found. Please check the query parameters and try again.',
        },
        {
          description: 'status code 429',
          rejectedError: 'Request failed with status code: 429',
          expectedMessage: 'The query to fetch work items failed due to too many requests. Please try again later.',
        },
        {
          description: 'status code 504',
          rejectedError: 'Request failed with status code: 504',
          expectedMessage:
            'The query to fetch work items experienced a timeout error. Narrow your query with a more specific filter and try again.',
        },
        {
          description: 'an unhandled status code',
          rejectedError: 'Request failed with status code: 500 Error message: Internal error',
          expectedMessage: 'The query failed due to the following error: (status 500) Internal error.',
        },
      ];

      it.each(errorCases)(
        'should display an error message when the request fails with $description',
        async ({ rejectedError, expectedMessage }) => {
          jest.spyOn(datasource, 'post').mockRejectedValue(new Error(rejectedError));

          const query = {
            refId: 'A',
            outputType: OutputType.TotalCount,
            types: [WorkItemTypeOptions.WorkOrders],
          };

          await expect(datasource.runQuery(query, {} as DataQueryRequest)).rejects.toThrow(expectedMessage);
        }
      );

      it('should publish an alertError event when the request fails', async () => {
        const publishMock = jest.fn();
        (datasource as any).appEvents = { publish: publishMock };
        jest.spyOn(datasource, 'post').mockRejectedValue(new Error('Request failed with status code: 404'));

        const query = {
          refId: 'A',
          outputType: OutputType.TotalCount,
          types: [WorkItemTypeOptions.WorkOrders],
        };

        await expect(datasource.runQuery(query, {} as DataQueryRequest)).rejects.toThrow();
        expect(publishMock).toHaveBeenCalledWith({
          type: 'alert-error',
          payload: [
            'Error during work items query',
            'The query to fetch work items failed because the requested resource was not found. Please check the query parameters and try again.',
          ],
        });
      });
    });
  });

  describe('shouldRunQuery', () => {
    it('should return true when the query is not hidden', () => {
      const query = { refId: 'A', hide: false };

      const shouldRunQueryResult = datasource.shouldRunQuery(query);

      expect(shouldRunQueryResult).toBe(true);
    });

    it('should return false when the query is hidden', () => {
      const query = { refId: 'A', hide: true };

      const shouldRunQueryResult = datasource.shouldRunQuery(query);

      expect(shouldRunQueryResult).toBe(false);
    });
  });
});


describe('globalVariableOptions', () => {
  it('should offer every dashboard variable prefixed with a dollar sign in value of query by', () => {
    const [datasource, , templateSrv] = setupDataSource(WorkItemsDataSource);
    templateSrv.getVariables.mockReturnValue([
      { name: 'workspace_var' },
      { name: 'product_var' },
    ] as TypedVariableModel[]);

    expect(datasource.globalVariableOptions()).toEqual([
      { label: '$workspace_var', value: '$workspace_var' },
      { label: '$product_var', value: '$product_var' },
    ]);
  });

  it('should offer no options when the dashboard has no variables in value of query by', () => {
    const [datasource, , templateSrv] = setupDataSource(WorkItemsDataSource);
    templateSrv.getVariables.mockReturnValue([]);

    expect(datasource.globalVariableOptions()).toEqual([]);
  });
});

describe('loadProductNamesAndPartNumbers', () => {
  it('should return product names and part numbers when the API call succeeds', async () => {
    const [datasource] = setupDataSource(WorkItemsDataSource);

    const result = await datasource.loadProductNamesAndPartNumbers();

    expect(result.get('part-number-1')?.name).toBe('Product 1');
    expect(result.get('part-number-2')?.name).toBe('Product 2');
  });

  it('should return an empty map when the lookup fails', async () => {
    const [datasource] = setupDataSource(WorkItemsDataSource);
    jest
      .spyOn(datasource.productUtils, 'getProductNamesAndPartNumbers')
      .mockRejectedValue(new Error('Error'));

    const result = await datasource.loadProductNamesAndPartNumbers();

    expect(result.size).toBe(0);
  });
});

describe('loadUsers', () => {
  it('should return the list of users when the API call succeeds', async () => {
    const [datasource] = setupDataSource(WorkItemsDataSource);

    const result = await datasource.loadUsers();

    expect(result.get('1')?.firstName).toBe('User');
    expect(result.get('2')?.firstName).toBe('User');
  });

  it('should return an empty map when the lookup fails', async () => {
    const [datasource] = setupDataSource(WorkItemsDataSource);
    jest.spyOn(datasource.usersUtils, 'getUsers').mockRejectedValue(new Error('Error'));

    const result = await datasource.loadUsers();

    expect(result.size).toBe(0);
  });
});

describe('loadWorkspaces', () => {
  it('should return the list of workspaces when the API call succeeds', async () => {
    const [datasource] = setupDataSource(WorkItemsDataSource);

    const result = await datasource.loadWorkspaces();

    expect(result.get('1')?.name).toBe('WorkspaceName');
    expect(result.get('2')?.name).toBe('AnotherWorkspaceName');
  });

  it('should return an empty map when the lookup fails', async () => {
    const [datasource] = setupDataSource(WorkItemsDataSource);
    jest.spyOn(datasource.workspaceUtils, 'getWorkspaces').mockRejectedValue(new Error('Error'));

    const result = await datasource.loadWorkspaces();

    expect(result.size).toBe(0);
  });
});

describe('loadSystemAliases', () => {
  it('should return the list of system aliases when the API call succeeds', async () => {
    const [datasource] = setupDataSource(WorkItemsDataSource);

    const result = await datasource.loadSystemAliases();

    expect(result.get('1')?.alias).toBe('System 1');
    expect(result.get('2')?.alias).toBe('System 2');
  });

  it('should return an empty map when the lookup fails', async () => {
    const [datasource] = setupDataSource(WorkItemsDataSource);
    jest.spyOn(datasource.systemUtils, 'getSystemAliases').mockRejectedValue(new Error('Error'));

    const result = await datasource.loadSystemAliases();

    expect(result.size).toBe(0);
  });
});

describe('query builder lookup error descriptions', () => {
  const productLookup = {
    name: 'product',
    fail: (datasource: WorkItemsDataSource, error: Error) =>
      jest.spyOn(datasource.productUtils, 'getProductNamesAndPartNumbers').mockRejectedValue(error),
    load: (datasource: WorkItemsDataSource) => datasource.loadProductNamesAndPartNumbers(),
  };
  const userLookup = {
    name: 'user',
    fail: (datasource: WorkItemsDataSource, error: Error) =>
      jest.spyOn(datasource.usersUtils, 'getUsers').mockRejectedValue(error),
    load: (datasource: WorkItemsDataSource) => datasource.loadUsers(),
  };
  const workspaceLookup = {
    name: 'workspace',
    fail: (datasource: WorkItemsDataSource, error: Error) =>
      jest.spyOn(datasource.workspaceUtils, 'getWorkspaces').mockRejectedValue(error),
    load: (datasource: WorkItemsDataSource) => datasource.loadWorkspaces(),
  };
  const systemAliasLookup = {
    name: 'system alias',
    fail: (datasource: WorkItemsDataSource, error: Error) =>
      jest.spyOn(datasource.systemUtils, 'getSystemAliases').mockRejectedValue(error),
    load: (datasource: WorkItemsDataSource) => datasource.loadSystemAliases(),
  };

  const failures = [
    {
      scenario: 'a not found response',
      error: 'Request failed with status code: 404',
      expected:
        'The query builder lookups failed because the requested resource was not found. Please check the query parameters and try again.',
    },
    {
      scenario: 'a too many requests response',
      error: 'Request failed with status code: 429',
      expected:
        'The query builder lookups failed due to too many requests. Please try again later.',
    },
    {
      scenario: 'a timeout response',
      error: 'Request failed with status code: 504',
      expected:
        'The query builder lookups experienced a timeout error. Some values might not be available. Narrow your query with a more specific filter and try again.',
    },
    {
      scenario: 'an unhandled status code that reports a message',
      error: 'Request failed with status code: 500. Error message: Internal Server Error',
      expected:
        'Some values may not be available in the query builder lookups due to the following error: Internal Server Error.',
    },
    {
      scenario: 'an error without a status code or message',
      error: 'Error',
      expected:
        'Some values may not be available in the query builder lookups due to an unknown error.',
    },
  ];

  describe.each([productLookup, userLookup, workspaceLookup, systemAliasLookup])(
    '$name lookup',
    ({ fail, load }) => {
      it.each(failures)('should describe $scenario', async ({ error, expected }) => {
        const [datasource] = setupDataSource(WorkItemsDataSource);
        fail(datasource, new Error(error));

        await load(datasource);

        expect(datasource.errorTitle).toBe('Warning during work items query');
        expect(datasource.errorDescription).toBe(expected);
      });
    }
  );

  it('should show only the first failure when several lookups fail', async () => {
    const [datasource] = setupDataSource(WorkItemsDataSource);
    productLookup.fail(datasource, new Error('Request failed with status code: 404'));
    userLookup.fail(datasource, new Error('Request failed with status code: 429'));

    await productLookup.load(datasource);
    await userLookup.load(datasource);

    expect(datasource.errorDescription).toBe(
      'The query builder lookups failed because the requested resource was not found. Please check the query parameters and try again.'
    );
  });
});
