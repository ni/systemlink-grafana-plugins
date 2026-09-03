import { WorkItemsDataSource } from './WorkItemsDataSource';
import { setupDataSource } from 'test/fixtures';
import { OrderByOptions, OutputType, WorkItemPropertiesOptions, WorkItemTypeOptions } from './types';

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
  it('should apply expected default query values', () => {
    const [datasource] = setupDataSource(WorkItemsDataSource);

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
