import { DataQueryRequest, TypedVariableModel } from '@grafana/data';
import { WorkItemsDataSource } from './WorkItemsDataSource';
import { setupDataSource } from 'test/fixtures';
import { 
  OrderByOptions, 
  OutputType, 
  WorkItemPropertiesGroup, 
  WorkItemPropertiesOptions, 
  WorkItemsVariableQueryType, 
  WorkItemTypeOptions 
} from './types';
import { queryInBatches } from 'core/utils';
import { 
  CUSTOM_PROPERTY_OPTIONS_LIMIT, 
  CUSTOM_PROPERTY_SUFFIX, 
  DEFAULT_TAKE 
} from './constants';

jest.mock('core/utils', () => ({
  ...jest.requireActual('core/utils'),
  queryInBatches: jest.fn(jest.requireActual('core/utils').queryInBatches),
}));

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
  const UsersUtils: any = jest.fn().mockImplementation(() => ({
    getUsers: jest.fn().mockResolvedValue(
      new Map([
        ['1', { id: '1', firstName: 'User', lastName: '1', email: 'user1@123.com' }],
        ['2', { id: '2', firstName: 'User', lastName: '2', email: 'user2@123.com' }],
      ])
    ),
  }));
  UsersUtils.getUserFullName = jest.fn(user => `${user.firstName} ${user.lastName}`);
  return { UsersUtils };
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

  describe('wrapInParenthesesIfNeeded', () => {
    it('should not wrap a filter that is already fully enclosed', () => {
      const filter = '(createdBy = "user-1" && createdAt > "2026-01-01T00:00:00.000Z")';

      expect((datasource as any).wrapInParenthesesIfNeeded(filter)).toBe(filter);
    });

    it('should wrap a single condition that is not enclosed', () => {
      expect((datasource as any).wrapInParenthesesIfNeeded('state = "NEW"')).toBe('(state = "NEW")');
    });

    it('should wrap two separate groups joined at the top level', () => {
      const filter = '(state = "NEW") || (state = "DEFINED")';

      expect((datasource as any).wrapInParenthesesIfNeeded(filter)).toBe(`(${filter})`);
    });

    it('should wrap top-level "||" even when escaped quotes appear inside the groups', () => {
      // The outer parentheses do not enclose the whole expression, so wrapping is required to
      // preserve precedence when combined with the type filter via '&&'.
      const filter = '(name = "a\\"") || (state = "b\\"")';

      expect((datasource as any).wrapInParenthesesIfNeeded(filter)).toBe(`(${filter})`);
    });

    it('should not wrap a fully enclosed filter that contains escaped quotes', () => {
      const filter = '(name = "a\\"" && state = "b\\"")';

      expect((datasource as any).wrapInParenthesesIfNeeded(filter)).toBe(filter);
    });
  });

  it('should apply expected default query values', () => {
    const query = datasource.prepareQuery({ refId: 'A' });

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

  it('should apply expected default variable query values', () => {
    const variableQuery = datasource.prepareVariableQuery({ refId: 'A' });

    expect(variableQuery.queryType).toBe(WorkItemsVariableQueryType.ListWorkItems);
    expect(variableQuery.types).toEqual(Object.values(WorkItemTypeOptions));
    expect(variableQuery.orderBy).toBe(OrderByOptions.UPDATED_AT);
    expect(variableQuery.descending).toBe(true);
    expect(variableQuery.take).toBe(1000);
  });

  it('should preserve provided values over defaults in the variable query', () => {
    const variableQuery = datasource.prepareVariableQuery({
      refId: 'A',
      queryType: WorkItemsVariableQueryType.ListWorkItemTypes,
      take: 25,
    });

    expect(variableQuery.queryType).toBe(WorkItemsVariableQueryType.ListWorkItemTypes);
    expect(variableQuery.take).toBe(25);
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

  describe('runQuery', () => {
    it('should return an empty data frame without querying when no types are selected', async () => {
      const postSpy = jest.spyOn(datasource, 'post');
      const query = { refId: 'A', outputType: OutputType.TotalCount, types: [] };

      const result = await datasource.runQuery(query, {} as DataQueryRequest);

      expect(result).toEqual({ refId: 'A', name: 'A', fields: [] });
      expect(postSpy).not.toHaveBeenCalled();
    });

    it('should send a separate count query per selected type and combine them into columns', async () => {
      const postSpy = jest
        .spyOn(datasource, 'post')
        .mockResolvedValueOnce({ totalCount: 3 })
        .mockResolvedValueOnce({ totalCount: 5 });
      const query = {
        refId: 'A',
        outputType: OutputType.TotalCount,
        types: [WorkItemTypeOptions.WorkOrders, WorkItemTypeOptions.TestPlans],
        filter: 'state = "NEW"',
      };

      const result = await datasource.runQuery(query, { scopedVars: {} } as DataQueryRequest);

      expect(postSpy).toHaveBeenCalledTimes(2);
      expect(postSpy).toHaveBeenCalledWith(
        '/niworkitem/v1/query-workitems',
        {
          filter: '(type = "workorder") && (state = "NEW")',
          take: 0,
          returnCount: true,
        },
        { showErrorAlert: false }
      );
      expect(postSpy).toHaveBeenCalledWith(
        '/niworkitem/v1/query-workitems',
        {
          filter: '(type = "testplan") && (state = "NEW")',
          take: 0,
          returnCount: true,
        },
        { showErrorAlert: false }
      );
      expect(result.fields).toEqual([
        { name: 'Work order', values: [3] },
        { name: 'Test plan', values: [5] },
      ]);
    });

    it('should return a single column when one type is selected', async () => {
      const postSpy = jest.spyOn(datasource, 'post').mockResolvedValue({ totalCount: 7 });
      const query = {
        refId: 'A',
        outputType: OutputType.TotalCount,
        types: [WorkItemTypeOptions.WorkOrders],
        filter: 'state = "NEW"',
      };

      const result = await datasource.runQuery(query, {} as DataQueryRequest);

      expect(postSpy).toHaveBeenCalledTimes(1);
      expect(postSpy).toHaveBeenCalledWith(
        '/niworkitem/v1/query-workitems',
        {
          filter: '(type = "workorder") && (state = "NEW")',
          take: 0,
          returnCount: true
        },
        { showErrorAlert: false }
      );
      expect(result.fields).toEqual([{ name: 'Work order', values: [7] }]);
    });

    it('should map each type response to its own column in the selected order', async () => {
      jest
        .spyOn(datasource, 'post')
        .mockResolvedValueOnce({ totalCount: 11 })
        .mockResolvedValueOnce({ totalCount: 22 })
        .mockResolvedValueOnce({ totalCount: 33 });
      const query = {
        refId: 'A',
        outputType: OutputType.TotalCount,
        types: [WorkItemTypeOptions.Job, WorkItemTypeOptions.Calibration, WorkItemTypeOptions.Reservation],
      };

      const result = await datasource.runQuery(query, {} as DataQueryRequest);

      expect(result.fields).toEqual([
        { name: 'Job', values: [11] },
        { name: 'Calibration', values: [22] },
        { name: 'Reservation', values: [33] },
      ]);
    });

    it('should default a column to 0 when the API returns no totalCount for that type', async () => {
      jest
        .spyOn(datasource, 'post')
        .mockResolvedValueOnce({ totalCount: 4 })
        .mockResolvedValueOnce({});
      const query = {
        refId: 'A',
        outputType: OutputType.TotalCount,
        types: [WorkItemTypeOptions.WorkOrders, WorkItemTypeOptions.TestPlans],
      };

      const result = await datasource.runQuery(query, {} as DataQueryRequest);

      expect(result.fields).toEqual([
        { name: 'Work order', values: [4] },
        { name: 'Test plan', values: [0] },
      ]);
    });

    it('should send only the type filter when no query filter is provided', async () => {
      const postSpy = jest.spyOn(datasource, 'post').mockResolvedValue({ totalCount: 1 });
      const query = {
        refId: 'A',
        outputType: OutputType.TotalCount,
        types: [WorkItemTypeOptions.WorkOrders],
      };

      await datasource.runQuery(query, {} as DataQueryRequest);

      expect(postSpy).toHaveBeenCalledWith(
        '/niworkitem/v1/query-workitems',
        {
          filter: '(type = "workorder")',
          take: 0,
          returnCount: true,
        },
        { showErrorAlert: false }
      );
    });

    it('should still apply a per-type filter for every type when all types are selected', async () => {
      const postSpy = jest.spyOn(datasource, 'post').mockResolvedValue({ totalCount: 1 });
      const query = {
        refId: 'A',
        outputType: OutputType.TotalCount,
        types: Object.values(WorkItemTypeOptions),
      };

      const result = await datasource.runQuery(query, {} as DataQueryRequest);

      expect(postSpy).toHaveBeenCalledTimes(Object.values(WorkItemTypeOptions).length);
      expect(postSpy).toHaveBeenCalledWith(
        '/niworkitem/v1/query-workitems',
        {
          filter: '(type = "workorder")',
          take: 0,
          returnCount: true
        },
        { showErrorAlert: false }
      );
      expect(result.fields).toEqual([
        { name: 'Work order', values: [1] },
        { name: 'Test plan', values: [1] },
        { name: 'Job', values: [1] },
        { name: 'Maintenance', values: [1] },
        { name: 'Calibration', values: [1] },
        { name: 'Reservation', values: [1] },
        { name: 'Transport order', values: [1] },
      ]);
    });

    describe('request batching', () => {
      beforeEach(() => {
        jest.useFakeTimers();
      });

      afterEach(() => {
        jest.useRealTimers();
      });

      it('should send at most five count queries per one-second window', async () => {
        const postSpy = jest.spyOn(datasource, 'post').mockResolvedValue({ totalCount: 1 });
        const query = {
          refId: 'A',
          outputType: OutputType.TotalCount,
          types: Object.values(WorkItemTypeOptions),
        };

        const promise = datasource.runQuery(query, {} as DataQueryRequest);

        // Flush the microtasks for the first sequential batch without advancing the clock.
        await jest.advanceTimersByTimeAsync(0);
        expect(postSpy).toHaveBeenCalledTimes(5);

        // Advance past the one-second throttle window to release the next batch.
        await jest.advanceTimersByTimeAsync(1000);
        await promise;
        expect(postSpy).toHaveBeenCalledTimes(Object.values(WorkItemTypeOptions).length);
      });

      it('should not wait when all types fit within a single batch', async () => {
        const postSpy = jest.spyOn(datasource, 'post').mockResolvedValue({ totalCount: 1 });
        const query = {
          refId: 'A',
          outputType: OutputType.TotalCount,
          types: [WorkItemTypeOptions.WorkOrders, WorkItemTypeOptions.TestPlans],
        };

        const promise = datasource.runQuery(query, {} as DataQueryRequest);
        await jest.advanceTimersByTimeAsync(0);

        expect(postSpy).toHaveBeenCalledTimes(2);
        // No throttle timer is scheduled because there is no subsequent batch to wait for.
        expect(jest.getTimerCount()).toBe(0);
        await promise;
      });

      it('should send all five requests of a batch in parallel without waiting for each other', async () => {
        const resolvers: Array<(value: { totalCount: number }) => void> = [];
        const postSpy = jest.spyOn(datasource, 'post').mockImplementation(
          () => new Promise(resolve => resolvers.push(resolve))
        );
        const query = {
          refId: 'A',
          outputType: OutputType.TotalCount,
          types: Object.values(WorkItemTypeOptions).slice(0, 5),
        };

        const promise = datasource.runQuery(query, {} as DataQueryRequest);
        await jest.advanceTimersByTimeAsync(0);

        // All five requests are already in flight even though none has resolved yet.
        expect(postSpy).toHaveBeenCalledTimes(5);

        resolvers.forEach(resolve => resolve({ totalCount: 1 }));
        await promise;
      });

      it('should preserve the type-to-column order across batches', async () => {
        jest
          .spyOn(datasource, 'post')
          .mockResolvedValueOnce({ totalCount: 1 })
          .mockResolvedValueOnce({ totalCount: 2 })
          .mockResolvedValueOnce({ totalCount: 3 })
          .mockResolvedValueOnce({ totalCount: 4 })
          .mockResolvedValueOnce({ totalCount: 5 })
          .mockResolvedValueOnce({ totalCount: 6 })
          .mockResolvedValueOnce({ totalCount: 7 });
        const query = {
          refId: 'A',
          outputType: OutputType.TotalCount,
          types: Object.values(WorkItemTypeOptions),
        };

        const promise = datasource.runQuery(query, {} as DataQueryRequest);
        await jest.advanceTimersByTimeAsync(1000);
        const result = await promise;

        expect(result.fields).toEqual([
          { name: 'Work order', values: [1] },
          { name: 'Test plan', values: [2] },
          { name: 'Job', values: [3] },
          { name: 'Maintenance', values: [4] },
          { name: 'Calibration', values: [5] },
          { name: 'Reservation', values: [6] },
          { name: 'Transport order', values: [7] },
        ]);
      });

      it('should reject the whole query when a per-type count query fails', async () => {
        const postSpy = jest
          .spyOn(datasource, 'post')
          .mockResolvedValueOnce({ totalCount: 1 })
          .mockResolvedValueOnce({ totalCount: 2 })
          .mockRejectedValueOnce(new Error('Request failed with status code: 500 Error message: Internal error'))
          .mockResolvedValue({ totalCount: 99 });
        const query = {
          refId: 'A',
          outputType: OutputType.TotalCount,
          types: [
            WorkItemTypeOptions.WorkOrders,
            WorkItemTypeOptions.TestPlans,
            WorkItemTypeOptions.Job,
            WorkItemTypeOptions.Maintenance,
            WorkItemTypeOptions.Calibration,
          ],
        };

        // The whole query rejects rather than returning a partial data frame.
        await expect(datasource.runQuery(query, {} as DataQueryRequest)).rejects.toThrow(
          'The query failed due to the following error: (status 500) Internal error.'
        );

        // Requests within a batch run concurrently, so all five per-type queries are sent
        // even though the third one fails.
        expect(postSpy).toHaveBeenCalledTimes(5);
      });

      it('should wait only the remaining time when a batch takes part of the one-second window', async () => {
        const delaySpy = jest.spyOn(datasource as any, 'delay').mockResolvedValue(undefined);
        jest.spyOn(datasource, 'post').mockResolvedValue({ totalCount: 1 });
        // Simulate the first batch consuming 400ms of the one-second window so only the
        // remaining 600ms should be waited before the next batch starts.
        const nowSpy = jest
          .spyOn(Date, 'now')
          .mockReturnValueOnce(0) // first batch start
          .mockReturnValueOnce(400) // first batch elapsed -> 400ms used
          .mockReturnValue(2000); // second (final) batch start/elapsed
        const query = {
          refId: 'A',
          outputType: OutputType.TotalCount,
          types: Object.values(WorkItemTypeOptions), // seven types -> two batches
        };

        await datasource.runQuery(query, {} as DataQueryRequest);

        expect(delaySpy).toHaveBeenCalledTimes(1);
        expect(delaySpy).toHaveBeenCalledWith(600);
        nowSpy.mockRestore();
      });
    });

    it('should replace a template variable in the selected types before building the type filter', async () => {
      const [datasource, , templateSrv] = setupDataSource(WorkItemsDataSource);
      const postSpy = jest.spyOn(datasource, 'post').mockResolvedValue({ totalCount: 1 });
      templateSrv.containsTemplate.mockImplementation((value?: string) => value === '$type_var');
      templateSrv.replace.mockImplementation((value?: string) =>
        value === '$type_var' ? WorkItemTypeOptions.WorkOrders : value ?? ''
      );
      const query = {
        refId: 'A',
        outputType: OutputType.TotalCount,
        types: ['$type_var'] as unknown as WorkItemTypeOptions[],
      };

      await datasource.runQuery(query, {} as DataQueryRequest);

      expect(postSpy).toHaveBeenCalledWith(
        '/niworkitem/v1/query-workitems',
        {
          filter: '(type = "workorder")',
          take: 0,
          returnCount: true,
        },
        { showErrorAlert: false }
      );
    });

    it('should send a separate per-type count query for each type a multi-value variable expands to', async () => {
      const [datasource, , templateSrv] = setupDataSource(WorkItemsDataSource);
      const postSpy = jest.spyOn(datasource, 'post').mockResolvedValue({ totalCount: 1 });
      templateSrv.containsTemplate.mockImplementation((value?: string) => value === '$type_var');
      templateSrv.replace.mockImplementation((value?: string) =>
        value === '$type_var'
          ? `{${WorkItemTypeOptions.WorkOrders},${WorkItemTypeOptions.TestPlans}}`
          : value ?? ''
      );
      const query = {
        refId: 'A',
        outputType: OutputType.TotalCount,
        types: ['$type_var'] as unknown as WorkItemTypeOptions[],
      };

      const result = await datasource.runQuery(query, {} as DataQueryRequest);

      expect(postSpy).toHaveBeenCalledTimes(2);
      expect(postSpy).toHaveBeenCalledWith(
        '/niworkitem/v1/query-workitems',
        {
          filter: '(type = "workorder")',
          take: 0,
          returnCount: true,
        },
        { showErrorAlert: false }
      );
      expect(postSpy).toHaveBeenCalledWith(
        '/niworkitem/v1/query-workitems',
        {
          filter: '(type = "testplan")',
          take: 0,
          returnCount: true,
        },
        { showErrorAlert: false }
      );
      expect(result.fields).toEqual([
        { name: 'Work order', values: [1] },
        { name: 'Test plan', values: [1] },
      ]);
    });

    it('should return an empty data frame without querying when a template variable resolves to no values', async () => {
      const [datasource, , templateSrv] = setupDataSource(WorkItemsDataSource);
      const postSpy = jest.spyOn(datasource, 'post').mockResolvedValue({ totalCount: 1 });
      templateSrv.containsTemplate.mockImplementation((value?: string) => value === '$type_var');
      templateSrv.replace.mockImplementation((value?: string) => (value === '$type_var' ? '' : value ?? ''));
      const query = {
        refId: 'A',
        outputType: OutputType.TotalCount,
        types: ['$type_var'] as unknown as WorkItemTypeOptions[],
      };

      const result = await datasource.runQuery(query, {} as DataQueryRequest);

      expect(result).toEqual({ refId: 'A', name: 'A', fields: [] });
      expect(postSpy).not.toHaveBeenCalled();
    });

    it('should return an empty data frame without querying when a template variable resolves only to unrecognized types', async () => {
      const [datasource, , templateSrv] = setupDataSource(WorkItemsDataSource);
      const postSpy = jest.spyOn(datasource, 'post').mockResolvedValue({ totalCount: 1 });
      templateSrv.containsTemplate.mockImplementation((value?: string) => value === '$type_var');
      templateSrv.replace.mockImplementation((value?: string) =>
        value === '$type_var' ? 'UNKNOWN_TYPE' : value ?? ''
      );
      const query = {
        refId: 'A',
        outputType: OutputType.TotalCount,
        types: ['$type_var'] as unknown as WorkItemTypeOptions[],
      };

      const result = await datasource.runQuery(query, {} as DataQueryRequest);

      expect(result).toEqual({ refId: 'A', name: 'A', fields: [] });
      expect(postSpy).not.toHaveBeenCalled();
    });

    it('should drop unrecognized values when a multi-value variable resolves to a mix of valid and invalid types', async () => {
      const [datasource, , templateSrv] = setupDataSource(WorkItemsDataSource);
      const postSpy = jest.spyOn(datasource, 'post').mockResolvedValue({ totalCount: 1 });
      templateSrv.containsTemplate.mockImplementation((value?: string) => value === '$type_var');
      templateSrv.replace.mockImplementation((value?: string) =>
        value === '$type_var' ? `{${WorkItemTypeOptions.WorkOrders},UNKNOWN_TYPE}` : value ?? ''
      );
      const query = {
        refId: 'A',
        outputType: OutputType.TotalCount,
        types: ['$type_var'] as unknown as WorkItemTypeOptions[],
      };

      await datasource.runQuery(query, {} as DataQueryRequest);

      expect(postSpy).toHaveBeenCalledWith(
        '/niworkitem/v1/query-workitems',
        {
          filter: '(type = "workorder")',
          take: 0,
          returnCount: true,
        },
        { showErrorAlert: false }
      );
    });

    it('should deduplicate a type that is selected both statically and through a variable', async () => {
      const [datasource, , templateSrv] = setupDataSource(WorkItemsDataSource);
      const postSpy = jest.spyOn(datasource, 'post').mockResolvedValue({ totalCount: 1 });
      templateSrv.containsTemplate.mockImplementation((value?: string) => value === '$type_var');
      templateSrv.replace.mockImplementation((value?: string) =>
        value === '$type_var' ? WorkItemTypeOptions.WorkOrders : value ?? ''
      );
      const query = {
        refId: 'A',
        outputType: OutputType.TotalCount,
        types: [WorkItemTypeOptions.WorkOrders, '$type_var'] as unknown as WorkItemTypeOptions[],
      };

      await datasource.runQuery(query, {} as DataQueryRequest);

      expect(postSpy).toHaveBeenCalledTimes(1);
      expect(postSpy).toHaveBeenCalledWith(
        '/niworkitem/v1/query-workitems',
        {
          filter: '(type = "workorder")',
          take: 0,
          returnCount: true,
        },
        { showErrorAlert: false }
      );
    });

    it('should send a per-type count query for each type when a variable expands to cover all work item types', async () => {
      const [datasource, , templateSrv] = setupDataSource(WorkItemsDataSource);
      const postSpy = jest.spyOn(datasource, 'post').mockResolvedValue({ totalCount: 1 });
      templateSrv.containsTemplate.mockImplementation((value?: string) => value === '$type_var');
      templateSrv.replace.mockImplementation((value?: string) =>
        value === '$type_var' ? `{${Object.values(WorkItemTypeOptions).join(',')}}` : value ?? ''
      );
      const query = {
        refId: 'A',
        outputType: OutputType.TotalCount,
        types: ['$type_var'] as unknown as WorkItemTypeOptions[],
      };

      await datasource.runQuery(query, {} as DataQueryRequest);

      expect(postSpy).toHaveBeenCalledTimes(Object.values(WorkItemTypeOptions).length);
      expect(postSpy).toHaveBeenCalledWith(
        '/niworkitem/v1/query-workitems',
        {
          filter: '(type = "workorder")',
          take: 0,
          returnCount: true,
        },
        { showErrorAlert: false }
      );
    });

    it('should pass the request scoped variables when resolving the selected types', async () => {
      const [datasource, , templateSrv] = setupDataSource(WorkItemsDataSource);
      jest.spyOn(datasource, 'post').mockResolvedValue({ totalCount: 1 });
      templateSrv.containsTemplate.mockImplementation((value?: string) => value === '$type_var');
      templateSrv.replace.mockImplementation((value?: string) =>
        value === '$type_var' ? WorkItemTypeOptions.WorkOrders : value ?? ''
      );
      const scopedVars = { type_var: { text: 'Work order', value: WorkItemTypeOptions.WorkOrders } };
      const query = {
        refId: 'A',
        outputType: OutputType.TotalCount,
        types: ['$type_var'] as unknown as WorkItemTypeOptions[],
      };

      await datasource.runQuery(query, { scopedVars } as unknown as DataQueryRequest);

      expect(templateSrv.replace).toHaveBeenCalledWith('$type_var', scopedVars);
    });

    describe('duration filter transformation', () => {
      it('should convert estimatedDurationInDays to timeline.estimatedDurationInSeconds', async () => {
        const postSpy = jest.spyOn(datasource, 'post').mockResolvedValue({ totalCount: 1 });
        const query = {
          refId: 'A',
          outputType: OutputType.TotalCount,
          types: [WorkItemTypeOptions.WorkOrders],
          filter: 'estimatedDurationInDays > "2"',
        };

        await datasource.runQuery(query, {} as DataQueryRequest);

        expect(postSpy).toHaveBeenCalledWith(
          '/niworkitem/v1/query-workitems',
          {
            filter: '(type = "workorder") && (timeline.estimatedDurationInSeconds > "172800")',
            take: 0,
            returnCount: true,
          },
          { showErrorAlert: false }
        );
      });

      it('should convert estimatedDurationInHours to timeline.estimatedDurationInSeconds', async () => {
        const postSpy = jest.spyOn(datasource, 'post').mockResolvedValue({ totalCount: 1 });
        const query = {
          refId: 'A',
          outputType: OutputType.TotalCount,
          types: [WorkItemTypeOptions.WorkOrders],
          filter: 'estimatedDurationInHours <= "3"',
        };

        await datasource.runQuery(query, {} as DataQueryRequest);

        expect(postSpy).toHaveBeenCalledWith(
          '/niworkitem/v1/query-workitems',
          {
            filter: '(type = "workorder") && (timeline.estimatedDurationInSeconds <= "10800")',
            take: 0,
            returnCount: true,
          },
          { showErrorAlert: false }
        );
      });

      it('should convert plannedDurationInDays to schedule.plannedDurationInSeconds', async () => {
        const postSpy = jest.spyOn(datasource, 'post').mockResolvedValue({ totalCount: 1 });
        const query = {
          refId: 'A',
          outputType: OutputType.TotalCount,
          types: [WorkItemTypeOptions.WorkOrders],
          filter: 'plannedDurationInDays != "-1"',
        };

        await datasource.runQuery(query, {} as DataQueryRequest);

        expect(postSpy).toHaveBeenCalledWith(
          '/niworkitem/v1/query-workitems',
          {
            filter: '(type = "workorder") && (schedule.plannedDurationInSeconds != "-86400")',
            take: 0,
            returnCount: true,
          },
          { showErrorAlert: false }
        );
      });

      it('should convert plannedDurationInHours to schedule.plannedDurationInSeconds', async () => {
        const postSpy = jest.spyOn(datasource, 'post').mockResolvedValue({ totalCount: 1 });
        const query = {
          refId: 'A',
          outputType: OutputType.TotalCount,
          types: [WorkItemTypeOptions.WorkOrders],
          filter: 'plannedDurationInHours >= "5"',
        };

        await datasource.runQuery(query, {} as DataQueryRequest);

        expect(postSpy).toHaveBeenCalledWith(
          '/niworkitem/v1/query-workitems',
          {
            filter: '(type = "workorder") && (schedule.plannedDurationInSeconds >= "18000")',
            take: 0,
            returnCount: true,
          },
          { showErrorAlert: false }
        );
      });

      it('should convert multiple duration filters combined with the type filter', async () => {
        const postSpy = jest.spyOn(datasource, 'post').mockResolvedValue({ totalCount: 1 });
        const query = {
          refId: 'A',
          outputType: OutputType.TotalCount,
          types: [WorkItemTypeOptions.WorkOrders],
          filter: 'estimatedDurationInDays > "1" && plannedDurationInHours < "4"',
        };

        await datasource.runQuery(query, {} as DataQueryRequest);

        expect(postSpy).toHaveBeenCalledWith(
          '/niworkitem/v1/query-workitems',
          {
            filter:
              '(type = "workorder") && (timeline.estimatedDurationInSeconds > "86400" && ' +
              'schedule.plannedDurationInSeconds < "14400")',
            take: 0,
            returnCount: true,
          },
          { showErrorAlert: false }
        );
      });

      it('should convert decimal estimatedDurationInDays to rounded whole seconds', async () => {
        const postSpy = jest.spyOn(datasource, 'post').mockResolvedValue({ totalCount: 1 });
        const query = {
          refId: 'A',
          outputType: OutputType.TotalCount,
          types: [WorkItemTypeOptions.WorkOrders],
          filter: 'estimatedDurationInDays > "1.5"',
        };

        await datasource.runQuery(query, {} as DataQueryRequest);

        expect(postSpy).toHaveBeenCalledWith(
          '/niworkitem/v1/query-workitems',
          {
            filter: '(type = "workorder") && (timeline.estimatedDurationInSeconds > "129600")',
            take: 0,
            returnCount: true,
          },
          { showErrorAlert: false }
        );
      });

      it('should convert decimal plannedDurationInHours to rounded whole seconds', async () => {
        const postSpy = jest.spyOn(datasource, 'post').mockResolvedValue({ totalCount: 1 });
        const query = {
          refId: 'A',
          outputType: OutputType.TotalCount,
          types: [WorkItemTypeOptions.WorkOrders],
          filter: 'plannedDurationInHours <= "-2.25"',
        };

        await datasource.runQuery(query, {} as DataQueryRequest);

        expect(postSpy).toHaveBeenCalledWith(
          '/niworkitem/v1/query-workitems',
          {
            filter: '(type = "workorder") && (schedule.plannedDurationInSeconds <= "-8100")',
            take: 0,
            returnCount: true,
          },
          { showErrorAlert: false }
        );
      });
    });

    describe('template variable replacement', () => {
      it('should replace a single-value template variable in the query builder filter', async () => {
        const replaceSpy = jest
          .spyOn(datasource.templateSrv, 'replace')
          .mockReturnValue('state = "NEW"');
        const postSpy = jest.spyOn(datasource, 'post').mockResolvedValue({ totalCount: 1 });
        const scopedVars = { state: { text: 'NEW', value: 'NEW' } };
        const query = {
          refId: 'A',
          outputType: OutputType.TotalCount,
          types: [WorkItemTypeOptions.WorkOrders],
          filter: 'state = "$state"',
        };

        await datasource.runQuery(query, { scopedVars } as any);

        expect(replaceSpy).toHaveBeenCalledWith('state = "$state"', scopedVars);
        expect(postSpy).toHaveBeenCalledWith(
          '/niworkitem/v1/query-workitems',
          expect.objectContaining({ filter: '(type = "workorder") && (state = "NEW")' }),
          { showErrorAlert: false }
        );
      });

      it('should not add redundant parentheses when the query builder filter is already enclosed', async () => {
        jest
          .spyOn(datasource.templateSrv, 'replace')
          .mockImplementation((value?: string) => value ?? '');
        const postSpy = jest.spyOn(datasource, 'post').mockResolvedValue({ totalCount: 1 });
        const query = {
          refId: 'A',
          outputType: OutputType.TotalCount,
          types: [WorkItemTypeOptions.WorkOrders],
          filter: '(createdBy = "user-1" && createdAt > "2026-01-01T00:00:00.000Z")',
        };

        await datasource.runQuery(query, { scopedVars: {} } as any);

        expect(postSpy).toHaveBeenCalledWith(
          '/niworkitem/v1/query-workitems',
          expect.objectContaining({
            filter: '(type = "workorder") && (createdBy = "user-1" && createdAt > "2026-01-01T00:00:00.000Z")',
          }),
          { showErrorAlert: false }
        );
      });

      it('should expand a multi-value template variable into multiple expressions', async () => {
        jest
          .spyOn(datasource.templateSrv, 'replace')
          .mockReturnValue('state = "{NEW,DEFINED}"');
        const postSpy = jest.spyOn(datasource, 'post').mockResolvedValue({ totalCount: 1 });
        const query = {
          refId: 'A',
          outputType: OutputType.TotalCount,
          types: [WorkItemTypeOptions.WorkOrders],
          filter: 'state = "$state"',
        };

        await datasource.runQuery(query, { scopedVars: {} } as any);

        expect(postSpy).toHaveBeenCalledWith(
          '/niworkitem/v1/query-workitems',
          expect.objectContaining({
            filter: '(type = "workorder") && (state = "NEW" || state = "DEFINED")',
          }),
          { showErrorAlert: false }
        );
      });

      it('should expand a multi-value duration variable before converting to seconds', async () => {
        jest
          .spyOn(datasource.templateSrv, 'replace')
          .mockReturnValue('estimatedDurationInDays = "{1,2}"');
        const postSpy = jest.spyOn(datasource, 'post').mockResolvedValue({ totalCount: 1 });
        const query = {
          refId: 'A',
          outputType: OutputType.TotalCount,
          types: [WorkItemTypeOptions.WorkOrders],
          filter: 'estimatedDurationInDays = "$dur"',
        };

        await datasource.runQuery(query, { scopedVars: {} } as any);

        expect(postSpy).toHaveBeenCalledWith(
          '/niworkitem/v1/query-workitems',
          expect.objectContaining({
            filter:
              '(type = "workorder") && (timeline.estimatedDurationInSeconds = "86400" || ' +
              'timeline.estimatedDurationInSeconds = "172800")',
          }),
          { showErrorAlert: false }
        );
      });

      it('should resolve a template variable to the now macro in a time field', async () => {
        jest
          .spyOn(datasource.templateSrv, 'replace')
          .mockReturnValue('createdAt > "${__now:date}"');
        const postSpy = jest.spyOn(datasource, 'post').mockResolvedValue({ totalCount: 1 });
        const query = {
          refId: 'A',
          outputType: OutputType.TotalCount,
          types: [WorkItemTypeOptions.WorkOrders],
          filter: 'createdAt > "$time"',
        };

        await datasource.runQuery(query, { scopedVars: {} } as any);

        const requestBody = postSpy.mock.calls[0][1] as { filter: string };
        expect(requestBody.filter).toMatch(
          /^\(type = "workorder"\) && \(createdAt > "\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z"\)$/
        );
      });
    });

    describe('properties output type', () => {
      it('should return basic properties mapped directly from the response', async () => {
        jest.spyOn(datasource, 'post').mockResolvedValue({
          workItems: [
            {
              id: '1',
              name: 'Battery Cycle Test',
              type: 'testplan',
              state: 'NEW',
              substate: 'substate1',
              description: 'Battery cycle test at various temperatures.',
              parentId: '1000',
              templateId: '2000',
              testProgram: 'Battery cycle test',
              partNumber: '156502A-11L',
              createdAt: '2018-05-09T15:07:42.527921Z',
              updatedAt: '2018-05-09T15:07:42.527921Z',
              timeline: {
                earliestStartDateTime: '2018-05-19T15:07:42.527921Z',
                dueDateTime: '2018-05-23T15:07:42.527921Z',
              },
              schedule: {
                plannedStartDateTime: '2018-05-20T15:07:42.527921Z',
                plannedEndDateTime: '2018-05-22T15:07:42.527921Z',
              },
            },
          ],
          continuationToken: '',
          totalCount: 1,
        });

        const query = {
          refId: 'A',
          outputType: OutputType.Properties,
          types: [WorkItemTypeOptions.WorkOrders],
          properties: [
            WorkItemPropertiesOptions.ID,
            WorkItemPropertiesOptions.NAME,
            WorkItemPropertiesOptions.TYPE,
            WorkItemPropertiesOptions.STATE,
            WorkItemPropertiesOptions.SUBSTATE,
            WorkItemPropertiesOptions.DESCRIPTION,
            WorkItemPropertiesOptions.TEST_PROGRAM,
            WorkItemPropertiesOptions.PART_NUMBER,
            WorkItemPropertiesOptions.PARENT_WORK_ITEM_ID,
            WorkItemPropertiesOptions.TEMPLATE_ID,
            WorkItemPropertiesOptions.CREATED_AT,
            WorkItemPropertiesOptions.UPDATED_AT,
            WorkItemPropertiesOptions.EARLIEST_START_DATE,
            WorkItemPropertiesOptions.DUE_DATE,
            WorkItemPropertiesOptions.PLANNED_START_DATE,
            WorkItemPropertiesOptions.PLANNED_END_DATE,
          ],
          take: 1000,
        };

        const result = await datasource.runQuery(query, {} as DataQueryRequest);

        const timeConfig = { unit: 'time:YYYY-MM-DD HH:mm:ss' };

        expect(result.fields).toEqual([
          { name: 'Work item ID', values: ['1'], type: 'string' },
          { name: 'Work item name', values: ['Battery Cycle Test'], type: 'string' },
          { name: 'Work item type', values: ['Test plan'], type: 'string' },
          { name: 'State', values: ['New'], type: 'string' },
          { name: 'Substate', values: ['substate1'], type: 'string' },
          { name: 'Description', values: ['Battery cycle test at various temperatures.'], type: 'string' },
          { name: 'Test program', values: ['Battery cycle test'], type: 'string' },
          { name: 'Part number', values: ['156502A-11L'], type: 'string' },
          { name: 'Work order ID', values: ['1000'], type: 'string' },
          { name: 'Template ID', values: ['2000'], type: 'string' },
          { name: 'Created at', values: ['2018-05-09T15:07:42.527921Z'], type: 'time', config: timeConfig },
          { name: 'Updated at', values: ['2018-05-09T15:07:42.527921Z'], type: 'time', config: timeConfig },
          {
            name: 'Earliest start date',
            values: ['2018-05-19T15:07:42.527921Z'],
            type: 'time',
            config: timeConfig,
          },
          { name: 'Due date', values: ['2018-05-23T15:07:42.527921Z'], type: 'time', config: timeConfig },
          { name: 'Planned start date', values: ['2018-05-20T15:07:42.527921Z'], type: 'time', config: timeConfig },
          { name: 'Planned end date', values: ['2018-05-22T15:07:42.527921Z'], type: 'time', config: timeConfig },
        ]);
      });

      it('should format estimated and planned duration properties', async () => {
        jest.spyOn(datasource, 'post').mockResolvedValue({
          workItems: [
            {
              timeline: { estimatedDurationInSeconds: 90061 },
              schedule: { plannedDurationInSeconds: 3661 },
            },
          ],
        });
        const query = {
          refId: 'A',
          outputType: OutputType.Properties,
          types: [WorkItemTypeOptions.WorkOrders],
          properties: [
            WorkItemPropertiesOptions.ESTIMATED_DURATION,
            WorkItemPropertiesOptions.PLANNED_DURATION,
          ],
          take: 1000,
        };

        const result = await datasource.runQuery(query, {} as DataQueryRequest);

        expect(result.fields).toEqual([
          {
            name: 'Estimated duration',
            values: ['1 day, 1 hr, 1 min, 1 sec'],
            type: 'string',
          },
          {
            name: 'Planned duration',
            values: ['1 hr, 1 min, 1 sec'],
            type: 'string',
          },
        ]);
      });

      it('should return null for all time fields with missing data', async () => {
        jest.spyOn(datasource, 'post').mockResolvedValue({
          workItems: [{ id: '1' }],
          continuationToken: '',
          totalCount: 1,
        });

        const query = {
          refId: 'A',
          outputType: OutputType.Properties,
          types: [WorkItemTypeOptions.WorkOrders],
          properties: [
            WorkItemPropertiesOptions.CREATED_AT,
            WorkItemPropertiesOptions.UPDATED_AT,
            WorkItemPropertiesOptions.EARLIEST_START_DATE,
            WorkItemPropertiesOptions.DUE_DATE,
            WorkItemPropertiesOptions.PLANNED_START_DATE,
            WorkItemPropertiesOptions.PLANNED_END_DATE,
          ],
          take: 1000,
        };

        const result = await datasource.runQuery(query, {} as DataQueryRequest);

        const timeConfig = { unit: 'time:YYYY-MM-DD HH:mm:ss' };

        expect(result.fields).toEqual([
          { name: 'Created at', values: [null], type: 'time', config: timeConfig },
          { name: 'Updated at', values: [null], type: 'time', config: timeConfig },
          { name: 'Earliest start date', values: [null], type: 'time', config: timeConfig },
          { name: 'Due date', values: [null], type: 'time', config: timeConfig },
          { name: 'Planned start date', values: [null], type: 'time', config: timeConfig },
          { name: 'Planned end date', values: [null], type: 'time', config: timeConfig },
        ]);
      });

      it('should not include a config on string typed fields', async () => {
        jest.spyOn(datasource, 'post').mockResolvedValue({
          workItems: [{ id: '1', name: 'Battery Cycle Test' }],
          continuationToken: '',
          totalCount: 1,
        });

        const query = {
          refId: 'A',
          outputType: OutputType.Properties,
          types: [WorkItemTypeOptions.WorkOrders],
          properties: [WorkItemPropertiesOptions.ID, WorkItemPropertiesOptions.NAME],
          take: 1000,
        };

        const result = await datasource.runQuery(query, {} as DataQueryRequest);

        expect(result.fields).toEqual([
          { name: 'Work item ID', values: ['1'], type: 'string' },
          { name: 'Work item name', values: ['Battery Cycle Test'], type: 'string' },
        ]);
        result.fields.forEach(field => expect(field).not.toHaveProperty('config'));
      });

      it('should format known type and state values into readable labels', async () => {
        jest.spyOn(datasource, 'post').mockResolvedValue({
          workItems: [
            { id: '1', type: 'testplan', state: 'IN_PROGRESS' },
            { id: '2', type: 'transportorder', state: 'PENDING_APPROVAL' },
          ],
          continuationToken: '',
          totalCount: 2,
        });

        const query = {
          refId: 'A',
          outputType: OutputType.Properties,
          types: [WorkItemTypeOptions.WorkOrders],
          properties: [WorkItemPropertiesOptions.TYPE, WorkItemPropertiesOptions.STATE],
          take: 1000,
        };

        const result = await datasource.runQuery(query, {} as DataQueryRequest);

        expect(result.fields).toEqual([
          { name: 'Work item type', values: ['Test plan', 'Transport order'], type: 'string' },
          { name: 'State', values: ['In progress', 'Pending approval'], type: 'string' },
        ]);
      });

      it('should fall back to the raw value for unknown type and state values', async () => {
        jest.spyOn(datasource, 'post').mockResolvedValue({
          workItems: [{ id: '1', type: 'customtype', state: 'UNKNOWN_STATE' }],
          continuationToken: '',
          totalCount: 1,
        });

        const query = {
          refId: 'A',
          outputType: OutputType.Properties,
          types: [WorkItemTypeOptions.WorkOrders],
          properties: [WorkItemPropertiesOptions.TYPE, WorkItemPropertiesOptions.STATE],
          take: 1000,
        };

        const result = await datasource.runQuery(query, {} as DataQueryRequest);

        expect(result.fields).toEqual([
          { name: 'Work item type', values: ['customtype'], type: 'string' },
          { name: 'State', values: ['UNKNOWN_STATE'], type: 'string' },
        ]);
      });

      it('should return an empty fields array without querying when properties is an empty array', async () => {
        const postSpy = jest.spyOn(datasource, 'post').mockResolvedValue({ workItems: [], totalCount: 0 });
        const query = {
          refId: 'A',
          outputType: OutputType.Properties,
          types: [WorkItemTypeOptions.WorkOrders],
          properties: [],
        };

        const result = await datasource.runQuery(query, {} as DataQueryRequest);

        expect(result).toEqual({ refId: 'A', name: 'A', fields: [] });
        expect(postSpy).not.toHaveBeenCalled();
      });

      it('should request the deduplicated projection for every selected property', async () => {
        const postSpy = jest.spyOn(datasource, 'post').mockResolvedValue({ workItems: [], totalCount: 0 });
        const query = {
          refId: 'A',
          outputType: OutputType.Properties,
          types: [WorkItemTypeOptions.WorkOrders],
          properties: Object.values(WorkItemPropertiesOptions),
          take: 1000,
        };

        await datasource.runQuery(query, {} as DataQueryRequest);

        expect(postSpy).toHaveBeenCalledWith(
          '/niworkitem/v1/query-workitems',
          expect.objectContaining({
            projection: [
              'ID',
              'NAME',
              'TYPE',
              'STATE',
              'SUBSTATE',
              'DESCRIPTION',
              'TEST_PROGRAM',
              'PART_NUMBER',
              'WORKSPACE',
              'ASSIGNED_TO',
              'REQUESTED_BY',
              'CREATED_BY',
              'UPDATED_BY',
              'CREATED_AT',
              'UPDATED_AT',
              'PARENT_ID',
              'TEMPLATE_ID',
              'TIMELINE_EARLIEST_START_DATE_TIME',
              'TIMELINE_DUE_DATE_TIME',
              'TIMELINE_ESTIMATED_DURATION_IN_SECONDS',
              'SCHEDULE_PLANNED_START_DATE_TIME',
              'SCHEDULE_PLANNED_END_DATE_TIME',
              'SCHEDULE_PLANNED_DURATION_IN_SECONDS',
              'RESOURCES_ASSETS_SELECTIONS_ID',
              'RESOURCES_DUTS_SELECTIONS_ID',
              'RESOURCES_FIXTURES_SELECTIONS_ID',
              'RESOURCES_ASSETS_SELECTIONS_TARGET_SYSTEM_ID',
              'RESOURCES_ASSETS_SELECTIONS_TARGET_LOCATION_ID',
              'RESOURCES_DUTS_SELECTIONS_TARGET_SYSTEM_ID',
              'RESOURCES_DUTS_SELECTIONS_TARGET_LOCATION_ID',
              'RESOURCES_ASSETS_SELECTIONS_TARGET_PARENT_ID',
              'RESOURCES_DUTS_SELECTIONS_TARGET_PARENT_ID',
              'RESOURCES_SYSTEMS_SELECTIONS_ID',
              'PROPERTIES',
            ],
          }),
          { showErrorAlert: false }
        );
      });

      it('should query work items in batches according to the take value', async () => {
        jest.spyOn(datasource, 'post').mockResolvedValue({ workItems: [], totalCount: 0 });
        const query = {
          refId: 'A',
          outputType: OutputType.Properties,
          types: [WorkItemTypeOptions.WorkOrders],
          properties: [WorkItemPropertiesOptions.ID],
          take: 5000,
        };

        await datasource.runQuery(query, {} as DataQueryRequest);

        expect(queryInBatches).toHaveBeenCalledWith(
          expect.any(Function),
          { maxTakePerRequest: 1000, requestsPerSecond: 5 },
          5000
        );
      });

      it.each([0, -1])(
        'should return an empty data frame without querying when take is %d',
        async take => {
          const postSpy = jest.spyOn(datasource, 'post');
          const query = {
            refId: 'A',
            outputType: OutputType.Properties,
            types: [WorkItemTypeOptions.WorkOrders],
            properties: [WorkItemPropertiesOptions.ID, WorkItemPropertiesOptions.NAME],
            take,
          };

          const result = await datasource.runQuery(query, {} as DataQueryRequest);

          expect(postSpy).not.toHaveBeenCalled();
          expect(result).toEqual({ refId: 'A', name: 'A', fields: [] });
        }
      );
    });

    describe('custom properties', () => {
      it('should not include the PROPERTIES projection when customProperties is empty or undefined', async () => {
        const postSpy = jest.spyOn(datasource, 'post').mockResolvedValue({ workItems: [], totalCount: 0 });
        const query = {
          refId: 'A',
          outputType: OutputType.Properties,
          types: [WorkItemTypeOptions.WorkOrders],
          properties: [WorkItemPropertiesOptions.ID],
          take: 1000,
        };

        await datasource.runQuery(query, {} as DataQueryRequest);

        expect(postSpy).toHaveBeenCalledWith(
          '/niworkitem/v1/query-workitems',
          expect.objectContaining({ projection: ['ID'] }),
          { showErrorAlert: false }
        );
      });

      it('should include the PROPERTIES projection when customProperties is non-empty', async () => {
        const postSpy = jest.spyOn(datasource, 'post').mockResolvedValue({ workItems: [], totalCount: 0 });
        const query = {
          refId: 'A',
          outputType: OutputType.Properties,
          types: [WorkItemTypeOptions.WorkOrders],
          properties: [WorkItemPropertiesOptions.ID],
          customProperties: ['workflow'],
          take: 1000,
        };

        await datasource.runQuery(query, {} as DataQueryRequest);

        expect(postSpy).toHaveBeenCalledWith(
          '/niworkitem/v1/query-workitems',
          expect.objectContaining({ projection: ['ID', 'PROPERTIES'] }),
          { showErrorAlert: false }
        );
      });

      it('should build only custom property fields when no standard properties are selected', async () => {
        jest.spyOn(datasource, 'post').mockResolvedValue({
          workItems: [{ id: '1', properties: { workflow: 'Approved' } }],
          continuationToken: '',
          totalCount: 1,
        });
        const query = {
          refId: 'A',
          outputType: OutputType.Properties,
          types: [WorkItemTypeOptions.WorkOrders],
          properties: [],
          customProperties: ['workflow'],
          take: 1000,
        };

        const result = await datasource.runQuery(query, {} as DataQueryRequest);

        expect(result.fields).toEqual([{ name: 'workflow', values: ['Approved'], type: 'string' }]);
      });

      it('should include both standard and custom property fields together', async () => {
        jest.spyOn(datasource, 'post').mockResolvedValue({
          workItems: [{ id: '1', name: 'Battery Cycle Test', properties: { workflow: 'Approved' } }],
          continuationToken: '',
          totalCount: 1,
        });
        const query = {
          refId: 'A',
          outputType: OutputType.Properties,
          types: [WorkItemTypeOptions.WorkOrders],
          properties: [WorkItemPropertiesOptions.ID, WorkItemPropertiesOptions.NAME],
          customProperties: ['workflow'],
          take: 1000,
        };

        const result = await datasource.runQuery(query, {} as DataQueryRequest);

        expect(result.fields).toEqual([
          { name: 'Work item ID', values: ['1'], type: 'string' },
          { name: 'Work item name', values: ['Battery Cycle Test'], type: 'string' },
          { name: 'workflow', values: ['Approved'], type: 'string' },
        ]);
      });

      it('should show an empty value when a work item is missing the selected custom property', async () => {
        jest.spyOn(datasource, 'post').mockResolvedValue({
          workItems: [{ id: '1', properties: {} }],
          continuationToken: '',
          totalCount: 1,
        });
        const query = {
          refId: 'A',
          outputType: OutputType.Properties,
          types: [WorkItemTypeOptions.WorkOrders],
          properties: [],
          customProperties: ['workflow'],
          take: 1000,
        };

        const result = await datasource.runQuery(query, {} as DataQueryRequest);

        expect(result.fields).toEqual([{ name: 'workflow', values: [''], type: 'string' }]);
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
          fields: [{ name: 'Work order', values: [42] }],
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

        expect(result.fields).toEqual([{ name: 'Work order', values: [0] }]);
      });
    });

    describe('workspace and user lookup properties', () => {
      const mockWorkspace = { id: 'ws-1', name: 'Production', default: false, enabled: true };
      const mockUser = {
        id: 'user-1',
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane@example.com',
        properties: {},
        keywords: [],
        created: '',
        updated: '',
        orgId: '',
      };

      beforeEach(() => {
        jest.spyOn(datasource.workspaceUtils, 'getWorkspaces').mockResolvedValue(new Map([['ws-1', mockWorkspace]]));
        jest.spyOn(datasource.usersUtils, 'getUsers').mockResolvedValue(new Map([['user-1', mockUser]]));
      });

      it('should not load workspace or user lookup data when no workspace or user lookup property is selected', async () => {
        jest.spyOn(datasource, 'post').mockResolvedValue({
          workItems: [{ id: '1', name: 'Battery Cycle Test' }],
          continuationToken: '',
          totalCount: 1,
        });
        const getWorkspacesSpy = jest.spyOn(datasource.workspaceUtils, 'getWorkspaces');
        const getUsersSpy = jest.spyOn(datasource.usersUtils, 'getUsers');
        const query = {
          refId: 'A',
          outputType: OutputType.Properties,
          types: [WorkItemTypeOptions.WorkOrders],
          properties: [WorkItemPropertiesOptions.NAME],
          take: 1000,
        };

        await datasource.runQuery(query, {} as DataQueryRequest);

        expect(getWorkspacesSpy).not.toHaveBeenCalled();
        expect(getUsersSpy).not.toHaveBeenCalled();
      });

      it('should resolve product name and product ID from the products lookup', async () => {
        jest.spyOn(datasource, 'post').mockResolvedValue({
          workItems: [{ id: '1', partNumber: 'part-number-1' }],
          continuationToken: '',
          totalCount: 1,
        });
        const getProductsSpy = jest.spyOn(datasource.productUtils, 'getProductNamesAndPartNumbers');
        const query = {
          refId: 'A',
          outputType: OutputType.Properties,
          types: [WorkItemTypeOptions.WorkOrders],
          properties: [WorkItemPropertiesOptions.PRODUCT_NAME, WorkItemPropertiesOptions.PRODUCT_ID],
          take: 1000,
        };

        const result = await datasource.runQuery(query, {} as DataQueryRequest);

        expect(getProductsSpy).toHaveBeenCalled();
        expect(result.fields).toEqual([
          { name: 'Product name', values: ['Product 1'], type: 'string' },
          { name: 'Product ID', values: ['1'], type: 'string' },
        ]);
      });

      it('should return empty product name and product ID when the product is missing from the lookup', async () => {
        jest.spyOn(datasource, 'post').mockResolvedValue({
          workItems: [{ id: '1', partNumber: 'unknown-part-number' }],
          continuationToken: '',
          totalCount: 1,
        });
        const query = {
          refId: 'A',
          outputType: OutputType.Properties,
          types: [WorkItemTypeOptions.WorkOrders],
          properties: [WorkItemPropertiesOptions.PRODUCT_NAME, WorkItemPropertiesOptions.PRODUCT_ID],
          take: 1000,
        };

        const result = await datasource.runQuery(query, {} as DataQueryRequest);

        expect(result.fields).toEqual([
          { name: 'Product name', values: [''], type: 'string' },
          { name: 'Product ID', values: [''], type: 'string' },
        ]);
      });

      it('should return empty product name and product ID when the products lookup fails', async () => {
        jest.spyOn(datasource, 'post').mockResolvedValue({
          workItems: [{ id: '1', partNumber: 'part-number-1' }],
          continuationToken: '',
          totalCount: 1,
        });
        jest
          .spyOn(datasource.productUtils, 'getProductNamesAndPartNumbers')
          .mockRejectedValue(new Error('Error'));
        const query = {
          refId: 'A',
          outputType: OutputType.Properties,
          types: [WorkItemTypeOptions.WorkOrders],
          properties: [WorkItemPropertiesOptions.PRODUCT_NAME, WorkItemPropertiesOptions.PRODUCT_ID],
          take: 1000,
        };

        const result = await datasource.runQuery(query, {} as DataQueryRequest);

        expect(result.fields).toEqual([
          { name: 'Product name', values: [''], type: 'string' },
          { name: 'Product ID', values: [''], type: 'string' },
        ]);
      });

      it('should return empty product name and product ID when the work item has no part number', async () => {
        jest.spyOn(datasource, 'post').mockResolvedValue({
          workItems: [{ id: '1' }, { id: '2', partNumber: null }],
          continuationToken: '',
          totalCount: 2,
        });
        const query = {
          refId: 'A',
          outputType: OutputType.Properties,
          types: [WorkItemTypeOptions.WorkOrders],
          properties: [WorkItemPropertiesOptions.PRODUCT_NAME, WorkItemPropertiesOptions.PRODUCT_ID],
          take: 1000,
        };

        const result = await datasource.runQuery(query, {} as DataQueryRequest);

        expect(result.fields).toEqual([
          { name: 'Product name', values: ['', ''], type: 'string' },
          { name: 'Product ID', values: ['', ''], type: 'string' },
        ]);
      });

      it('should not load the products lookup when no product property is selected', async () => {
        jest.spyOn(datasource, 'post').mockResolvedValue({
          workItems: [{ id: '1', partNumber: 'part-number-1' }],
          continuationToken: '',
          totalCount: 1,
        });
        const getProductsSpy = jest.spyOn(datasource.productUtils, 'getProductNamesAndPartNumbers');
        const query = {
          refId: 'A',
          outputType: OutputType.Properties,
          types: [WorkItemTypeOptions.WorkOrders],
          properties: [WorkItemPropertiesOptions.PART_NUMBER],
          take: 1000,
        };

        await datasource.runQuery(query, {} as DataQueryRequest);

        expect(getProductsSpy).not.toHaveBeenCalled();
      });

      it('should resolve the workspace name for the workspaceId filtered', async () => {
        jest.spyOn(datasource, 'post').mockResolvedValue({
          workItems: [{ id: '1', workspace: 'ws-1' }],
          continuationToken: '',
          totalCount: 1,
        });

        const query = {
          refId: 'A',
          outputType: OutputType.Properties,
          types: [WorkItemTypeOptions.WorkOrders],
          properties: [WorkItemPropertiesOptions.WORKSPACE],
          take: 1000,
        };

        const result = await datasource.runQuery(query, {} as DataQueryRequest);

        expect(result.fields).toEqual([{ name: 'Workspace', values: ['Production'], type: 'string' }]);
      });

      it('should fall back to the raw workspace ID when the workspace is not found', async () => {
        jest.spyOn(datasource, 'post').mockResolvedValue({
          workItems: [{ id: '1', workspace: 'unknown-ws' }],
          continuationToken: '',
          totalCount: 1,
        });

        const query = {
          refId: 'A',
          outputType: OutputType.Properties,
          types: [WorkItemTypeOptions.WorkOrders],
          properties: [WorkItemPropertiesOptions.WORKSPACE],
          take: 1000,
        };

        const result = await datasource.runQuery(query, {} as DataQueryRequest);

        expect(result.fields).toEqual([{ name: 'Workspace', values: ['unknown-ws'], type: 'string' }]);
      });

      it('should fall back to the raw workspace ID when the workspace lookup fails', async () => {
        jest.spyOn(datasource.workspaceUtils, 'getWorkspaces').mockRejectedValue(new Error('Failed'));
        jest.spyOn(datasource, 'post').mockResolvedValue({
          workItems: [{ id: '1', workspace: 'ws-1' }],
          continuationToken: '',
          totalCount: 1,
        });

        const query = {
          refId: 'A',
          outputType: OutputType.Properties,
          types: [WorkItemTypeOptions.WorkOrders],
          properties: [WorkItemPropertiesOptions.WORKSPACE],
          take: 1000,
        };

        const result = await datasource.runQuery(query, {} as DataQueryRequest);

        expect(result.fields).toEqual([{ name: 'Workspace', values: ['ws-1'], type: 'string' }]);
      });

      it.each([
        [WorkItemPropertiesOptions.ASSIGNED_TO, 'assignedTo', 'Assigned to'],
        [WorkItemPropertiesOptions.REQUESTED_BY, 'requestedBy', 'Requested by'],
        [WorkItemPropertiesOptions.CREATED_BY, 'createdBy', 'Created by'],
        [WorkItemPropertiesOptions.UPDATED_BY, 'updatedBy', 'Updated by'],
      ])('should resolve the user full name for the %s property', async (property, field, label) => {
        jest.spyOn(datasource, 'post').mockResolvedValue({
          workItems: [{ id: '1', [field]: 'user-1' }],
          continuationToken: '',
          totalCount: 1,
        });

        const query = {
          refId: 'A',
          outputType: OutputType.Properties,
          types: [WorkItemTypeOptions.WorkOrders],
          properties: [property],
          take: 1000,
        };

        const result = await datasource.runQuery(query, {} as DataQueryRequest);

        expect(result.fields).toEqual([{ name: label, values: ['Jane Doe'], type: 'string' }]);
      });

      it('should fall back to the raw user ID when the user is not found', async () => {
        jest.spyOn(datasource, 'post').mockResolvedValue({
          workItems: [{ id: '1', assignedTo: 'unknown-user' }],
          continuationToken: '',
          totalCount: 1,
        });

        const query = {
          refId: 'A',
          outputType: OutputType.Properties,
          types: [WorkItemTypeOptions.WorkOrders],
          properties: [WorkItemPropertiesOptions.ASSIGNED_TO],
          take: 1000,
        };

        const result = await datasource.runQuery(query, {} as DataQueryRequest);

        expect(result.fields).toEqual([{ name: 'Assigned to', values: ['unknown-user'], type: 'string' }]);
      });

      it('should fall back to the raw user ID when the users lookup fails', async () => {
        jest.spyOn(datasource.usersUtils, 'getUsers').mockRejectedValue(new Error('Failed'));
        jest.spyOn(datasource, 'post').mockResolvedValue({
          workItems: [{ id: '1', assignedTo: 'user-1' }],
          continuationToken: '',
          totalCount: 1,
        });

        const query = {
          refId: 'A',
          outputType: OutputType.Properties,
          types: [WorkItemTypeOptions.WorkOrders],
          properties: [WorkItemPropertiesOptions.ASSIGNED_TO],
          take: 1000,
        };

        const result = await datasource.runQuery(query, {} as DataQueryRequest);

        expect(result.fields).toEqual([{ name: 'Assigned to', values: ['user-1'], type: 'string' }]);
      });
    });

    describe('parent work item name property', () => {
      it('should resolve the parent work item name via a lookup query', async () => {
        const postSpy = jest.spyOn(datasource, 'post').mockImplementation(async (_url, body: any) => {
          if (body.filter === 'id = "1000"') {
            return { workItems: [{ id: '1000', name: 'Parent Work Item' }], continuationToken: '', totalCount: 1 };
          }
          return { workItems: [{ id: '1', parentId: '1000' }], continuationToken: '', totalCount: 1 };
        });
        const query = {
          refId: 'A',
          outputType: OutputType.Properties,
          types: [WorkItemTypeOptions.WorkOrders],
          properties: [WorkItemPropertiesOptions.PARENT_WORK_ITEM_NAME],
          take: 1000,
        };

        const result = await datasource.runQuery(query, {} as DataQueryRequest);

        expect(result.fields).toEqual([
          { name: 'Work order name', values: ['Parent Work Item'], type: 'string' },
        ]);
        expect(postSpy).toHaveBeenCalledWith(
          '/niworkitem/v1/query-workitems',
          expect.objectContaining({ filter: 'id = "1000"', projection: ['ID', 'NAME'], take: 1 }),
          { showErrorAlert: false }
        );
        expect(queryInBatches).toHaveBeenCalledWith(
          expect.any(Function),
          { maxTakePerRequest: 1000, requestsPerSecond: 5 },
          1
        );
      });

      it('should fall back to an empty value when the parent work item lookup fails', async () => {
        jest.spyOn(datasource, 'post').mockImplementation(async (_url, body: any) => {
          if (body.filter === 'id = "1000"') {
            throw new Error('Request failed');
          }
          return { workItems: [{ id: '1', parentId: '1000' }], continuationToken: '', totalCount: 1 };
        });

        const result = await datasource.runQuery(
          {
            refId: 'A',
            outputType: OutputType.Properties,
            types: [WorkItemTypeOptions.WorkOrders],
            properties: [WorkItemPropertiesOptions.PARENT_WORK_ITEM_NAME],
            take: 1000,
          },
          {} as DataQueryRequest
        );

        expect(result.fields).toEqual([
          { name: 'Work order name', values: [''], type: 'string' },
        ]);
      });

      it('should deduplicate parent IDs before querying for their names', async () => {
        const postSpy = jest.spyOn(datasource, 'post').mockImplementation(async (_url, body: any) => {
          if (body.filter?.startsWith('id = ')) {
            return { workItems: [{ id: '1000', name: 'Parent Work Item' }], continuationToken: '', totalCount: 1 };
          }
          return {
            workItems: [
              { id: '1', parentId: '1000' },
              { id: '2', parentId: '1000' },
            ],
            continuationToken: '',
            totalCount: 2,
          };
        });
        const query = {
          refId: 'A',
          outputType: OutputType.Properties,
          types: [WorkItemTypeOptions.WorkOrders],
          properties: [WorkItemPropertiesOptions.PARENT_WORK_ITEM_NAME],
          take: 1000,
        };

        await datasource.runQuery(query, {} as DataQueryRequest);

        expect(postSpy).toHaveBeenCalledWith(
          '/niworkitem/v1/query-workitems',
          expect.objectContaining({ filter: 'id = "1000"', take: 1 }),
          { showErrorAlert: false }
        );
      });

      it('should fall back to an empty value when the parent work item is not found', async () => {
        jest.spyOn(datasource, 'post').mockImplementation(async (_url, body: any) => {
          if (body.filter === 'id = "1000"') {
            return { workItems: [], continuationToken: '', totalCount: 0 };
          }
          return { workItems: [{ id: '1', parentId: '1000' }], continuationToken: '', totalCount: 1 };
        });
        const query = {
          refId: 'A',
          outputType: OutputType.Properties,
          types: [WorkItemTypeOptions.WorkOrders],
          properties: [WorkItemPropertiesOptions.PARENT_WORK_ITEM_NAME],
          take: 1000,
        };

        const result = await datasource.runQuery(query, {} as DataQueryRequest);

        expect(result.fields).toEqual([{ name: 'Work order name', values: [''], type: 'string' }]);
      });

      it('should return an empty value and skip the lookup when the work item has no parent', async () => {
        const postSpy = jest.spyOn(datasource, 'post').mockResolvedValue({
          workItems: [{ id: '1' }],
          continuationToken: '',
          totalCount: 1,
        });
        const query = {
          refId: 'A',
          outputType: OutputType.Properties,
          types: [WorkItemTypeOptions.WorkOrders],
          properties: [WorkItemPropertiesOptions.PARENT_WORK_ITEM_NAME],
          take: 1000,
        };

        const result = await datasource.runQuery(query, {} as DataQueryRequest);

        expect(result.fields).toEqual([{ name: 'Work order name', values: [''], type: 'string' }]);
        expect(postSpy).toHaveBeenCalledTimes(1);
      });

      it('should not publish an alertError event when the parent work item lookup fails', async () => {
        const publishMock = jest.fn();
        (datasource as any).appEvents = { publish: publishMock };
        jest.spyOn(datasource, 'post').mockImplementation(async (_url, body: any) => {
          if (body.filter === 'id = "1000"') {
            throw new Error('Request failed');
          }
          return { workItems: [{ id: '1', parentId: '1000' }], continuationToken: '', totalCount: 1 };
        });

        await datasource.runQuery(
          {
            refId: 'A',
            outputType: OutputType.Properties,
            types: [WorkItemTypeOptions.WorkOrders],
            properties: [WorkItemPropertiesOptions.PARENT_WORK_ITEM_NAME],
            take: 1000,
          },
          {} as DataQueryRequest
        );

        expect(publishMock).not.toHaveBeenCalled();
      });
    });

    describe('resources row flattening and lookup properties', () => {
      it('should duplicate work item details for each row and flatten resource selections by index', async () => {
        jest.spyOn(datasource, 'post').mockResolvedValue({
          workItems: [
            {
              id: '1',
              name: 'Test Requirement',
              resources: {
                assets: { selections: [{ id: 'a1' }] },
                duts: { selections: [{ id: 'd1' }, { id: 'd2' }] },
                fixtures: { selections: [{ id: 'f1' }, { id: 'f2' }, { id: 'f3' }] },
                systems: { selections: [{ id: 's1' }] },
              },
            },
          ],
          continuationToken: '',
          totalCount: 1,
        });

        const query = {
          refId: 'A',
          outputType: OutputType.Properties,
          types: [WorkItemTypeOptions.WorkOrders],
          properties: [
            WorkItemPropertiesOptions.NAME,
            WorkItemPropertiesOptions.ASSET_ID,
            WorkItemPropertiesOptions.DUT_ID,
            WorkItemPropertiesOptions.FIXTURE_ID,
            WorkItemPropertiesOptions.SYSTEM_ID,
          ],
          take: 1000,
        };

        const result = await datasource.runQuery(query, {} as DataQueryRequest);

        expect(result.fields).toEqual([
          { name: 'Work item name', values: ['Test Requirement', 'Test Requirement', 'Test Requirement'], type: 'string' },
          { name: 'Asset ID', values: ['a1', '', ''], type: 'string' },
          { name: 'DUT ID', values: ['d1', 'd2', ''], type: 'string' },
          { name: 'Fixture ID', values: ['f1', 'f2', 'f3'], type: 'string' },
          { name: 'System ID', values: ['s1', '', ''], type: 'string' },
        ]);
      });

      it('should not duplicate rows when a work item has no reserved resources', async () => {
        jest.spyOn(datasource, 'post').mockResolvedValue({
          workItems: [{ id: '1', name: 'No Resources' }],
          continuationToken: '',
          totalCount: 1,
        });

        const query = {
          refId: 'A',
          outputType: OutputType.Properties,
          types: [WorkItemTypeOptions.WorkOrders],
          properties: [WorkItemPropertiesOptions.NAME],
          take: 1000,
        };

        const result = await datasource.runQuery(query, {} as DataQueryRequest);

        expect(result.fields).toEqual([{ name: 'Work item name', values: ['No Resources'], type: 'string' }]);
      });

      it('should resolve asset, DUT and fixture names via AssetUtils', async () => {
        const queryAssetsSpy = jest
          .spyOn(datasource.assetUtils, 'queryAssetsInBatches')
          .mockResolvedValue([
            { id: 'a1', name: 'Asset 1' },
            { id: 'd1', name: 'DUT 1' },
            { id: 'f1', name: 'Fixture 1' },
          ]);
        jest.spyOn(datasource, 'post').mockResolvedValue({
          workItems: [
            {
              id: '1',
              resources: {
                assets: { selections: [{ id: 'a1' }] },
                duts: { selections: [{ id: 'd1' }] },
                fixtures: { selections: [{ id: 'f1' }] },
              },
            },
          ],
          continuationToken: '',
          totalCount: 1,
        });

        const query = {
          refId: 'A',
          outputType: OutputType.Properties,
          types: [WorkItemTypeOptions.WorkOrders],
          properties: [
            WorkItemPropertiesOptions.ASSET_NAME,
            WorkItemPropertiesOptions.DUT_NAME,
            WorkItemPropertiesOptions.FIXTURE_NAME,
          ],
          take: 1000,
        };

        const result = await datasource.runQuery(query, {} as DataQueryRequest);

        expect(queryAssetsSpy).toHaveBeenCalledWith(['a1', 'd1', 'f1'], expect.any(Array));
        expect(result.fields).toEqual([
          { name: 'Asset name', values: ['Asset 1'], type: 'string' },
          { name: 'DUT name', values: ['DUT 1'], type: 'string' },
          { name: 'Fixture name', values: ['Fixture 1'], type: 'string' },
        ]);
      });

      it.each([
        [WorkItemPropertiesOptions.ASSET_NAME, 'assets', 'a1', 'Asset name'],
        [WorkItemPropertiesOptions.DUT_NAME, 'duts', 'd1', 'DUT name'],
        [WorkItemPropertiesOptions.FIXTURE_NAME, 'fixtures', 'f1', 'Fixture name'],
      ])(
        'should fall back to empty when %s cannot be resolved',
        async (property, resourceType, id, label) => {
          jest.spyOn(datasource.assetUtils, 'queryAssetsInBatches').mockResolvedValue([]);
          jest.spyOn(datasource, 'post').mockResolvedValue({
            workItems: [{ id: '1', resources: { [resourceType]: { selections: [{ id }] } } }],
            continuationToken: '',
            totalCount: 1,
          });

          const query = {
            refId: 'A',
            outputType: OutputType.Properties,
            types: [WorkItemTypeOptions.WorkOrders],
            properties: [property],
            take: 1000,
          };

          const result = await datasource.runQuery(query, {} as DataQueryRequest);

          expect(result.fields).toEqual([{ name: label, values: [''], type: 'string' }]);
        }
      );

      it.each([
        [WorkItemPropertiesOptions.ASSET_NAME, 'assets', 'a1', 'Asset name'],
        [WorkItemPropertiesOptions.DUT_NAME, 'duts', 'd1', 'DUT name'],
        [WorkItemPropertiesOptions.FIXTURE_NAME, 'fixtures', 'f1', 'Fixture name'],
      ])(
        'should fall back to empty when %s is found but unnamed',
        async (property, resourceType, id, label) => {
          jest.spyOn(datasource.assetUtils, 'queryAssetsInBatches').mockResolvedValue([{ id }]);
          jest.spyOn(datasource, 'post').mockResolvedValue({
            workItems: [{ id: '1', resources: { [resourceType]: { selections: [{ id }] } } }],
            continuationToken: '',
            totalCount: 1,
          });

          const query = {
            refId: 'A',
            outputType: OutputType.Properties,
            types: [WorkItemTypeOptions.WorkOrders],
            properties: [property],
            take: 1000,
          };

          const result = await datasource.runQuery(query, {} as DataQueryRequest);

          expect(result.fields).toEqual([{ name: label, values: [''], type: 'string' }]);
        }
      );

      it('should not call AssetUtils when no resource name or target parent property is selected', async () => {
        const queryAssetsSpy = jest.spyOn(datasource.assetUtils, 'queryAssetsInBatches');
        jest.spyOn(datasource, 'post').mockResolvedValue({
          workItems: [{ id: '1', resources: { assets: { selections: [{ id: 'a1' }] } } }],
          continuationToken: '',
          totalCount: 1,
        });

        const query = {
          refId: 'A',
          outputType: OutputType.Properties,
          types: [WorkItemTypeOptions.WorkOrders],
          properties: [WorkItemPropertiesOptions.ASSET_ID],
          take: 1000,
        };

        await datasource.runQuery(query, {} as DataQueryRequest);

        expect(queryAssetsSpy).not.toHaveBeenCalled();
      });

      it('should resolve the system alias via SystemUtils for the SYSTEM_NAME property', async () => {
        jest
          .spyOn(datasource.systemUtils, 'getSystemAliases')
          .mockResolvedValue(new Map([['s1', { id: 's1', alias: 'System Alias 1' }]]));
        jest.spyOn(datasource, 'post').mockResolvedValue({
          workItems: [{ id: '1', resources: { systems: { selections: [{ id: 's1' }] } } }],
          continuationToken: '',
          totalCount: 1,
        });

        const query = {
          refId: 'A',
          outputType: OutputType.Properties,
          types: [WorkItemTypeOptions.WorkOrders],
          properties: [WorkItemPropertiesOptions.SYSTEM_NAME],
          take: 1000,
        };

        const result = await datasource.runQuery(query, {} as DataQueryRequest);

        expect(result.fields).toEqual([{ name: 'System name', values: ['System Alias 1'], type: 'string' }]);
      });

      it('should fall back to empty when the system lookup fails', async () => {
        jest.spyOn(datasource.systemUtils, 'getSystemAliases').mockRejectedValue(new Error('Failed'));
        jest.spyOn(datasource, 'post').mockResolvedValue({
          workItems: [{ id: '1', resources: { systems: { selections: [{ id: 's1' }] } } }],
          continuationToken: '',
          totalCount: 1,
        });

        const query = {
          refId: 'A',
          outputType: OutputType.Properties,
          types: [WorkItemTypeOptions.WorkOrders],
          properties: [WorkItemPropertiesOptions.SYSTEM_NAME],
          take: 1000,
        };

        const result = await datasource.runQuery(query, {} as DataQueryRequest);

        expect(result.fields).toEqual([{ name: 'System name', values: [''], type: 'string' }]);
      });

      it('should not call SystemUtils when no system name or target location property is selected', async () => {
        const getSystemAliasesSpy = jest.spyOn(datasource.systemUtils, 'getSystemAliases');
        jest.spyOn(datasource, 'post').mockResolvedValue({
          workItems: [{ id: '1', resources: { systems: { selections: [{ id: 's1' }] } } }],
          continuationToken: '',
          totalCount: 1,
        });

        const query = {
          refId: 'A',
          outputType: OutputType.Properties,
          types: [WorkItemTypeOptions.WorkOrders],
          properties: [WorkItemPropertiesOptions.SYSTEM_ID],
          take: 1000,
        };

        await datasource.runQuery(query, {} as DataQueryRequest);

        expect(getSystemAliasesSpy).not.toHaveBeenCalled();
      });

      it('should not call LocationUtils when the target location property is not selected', async () => {
        const getLocationsSpy = jest.spyOn(datasource.locationUtils, 'getLocations');
        jest.spyOn(datasource, 'post').mockResolvedValue({
          workItems: [{ id: '1', resources: { assets: { selections: [{ id: 'a1', targetLocationId: 'loc1' }] } } }],
          continuationToken: '',
          totalCount: 1,
        });

        const query = {
          refId: 'A',
          outputType: OutputType.Properties,
          types: [WorkItemTypeOptions.WorkOrders],
          properties: [WorkItemPropertiesOptions.ASSET_ID],
          take: 1000,
        };

        await datasource.runQuery(query, {} as DataQueryRequest);

        expect(getLocationsSpy).not.toHaveBeenCalled();
      });

      it('should split TARGET_LOCATION into asset and DUT columns resolved via system aliases', async () => {
        jest
          .spyOn(datasource.systemUtils, 'getSystemAliases')
          .mockResolvedValue(new Map([['sys1', { id: 'sys1', alias: 'System Alias 1' }]]));
        jest.spyOn(datasource, 'post').mockResolvedValue({
          workItems: [
            {
              id: '1',
              resources: {
                assets: { selections: [{ id: 'a1', targetSystemId: 'sys1' }] },
                duts: { selections: [{ id: 'd1', targetSystemId: 'sys2' }] },
              },
            },
          ],
          continuationToken: '',
          totalCount: 1,
        });

        const query = {
          refId: 'A',
          outputType: OutputType.Properties,
          types: [WorkItemTypeOptions.WorkOrders],
          properties: [WorkItemPropertiesOptions.TARGET_LOCATION],
          take: 1000,
        };

        const result = await datasource.runQuery(query, {} as DataQueryRequest);

        expect(result.fields).toEqual([
          { name: 'Target Location (Asset)', values: ['System Alias 1'], type: 'string' },
          { name: 'Target Location (DUT)', values: ['sys2'], type: 'string' },
        ]);
      });

      it('should resolve TARGET_LOCATION via location lookup when target system ID is not present', async () => {
        jest
          .spyOn(datasource.locationUtils, 'getLocations')
          .mockResolvedValue(new Map([['loc1', { id: 'loc1', name: 'Building 1', pathWithNames: 'Site > Building 1' }]]));
        jest.spyOn(datasource, 'post').mockResolvedValue({
          workItems: [
            {
              id: '1',
              resources: {
                assets: { selections: [{ id: 'a1', targetLocationId: 'loc1' }] },
                duts: { selections: [{ id: 'd1', targetLocationId: 'loc2' }] },
              },
            },
          ],
          continuationToken: '',
          totalCount: 1,
        });

        const query = {
          refId: 'A',
          outputType: OutputType.Properties,
          types: [WorkItemTypeOptions.WorkOrders],
          properties: [WorkItemPropertiesOptions.TARGET_LOCATION],
          take: 1000,
        };

        const result = await datasource.runQuery(query, {} as DataQueryRequest);

        expect(result.fields).toEqual([
          { name: 'Target Location (Asset)', values: ['Building 1: Site > Building 1'], type: 'string' },
          { name: 'Target Location (DUT)', values: ['loc2'], type: 'string' },
        ]);
      });

      it('should prefer the target system over the target location when both are present', async () => {
        jest
          .spyOn(datasource.systemUtils, 'getSystemAliases')
          .mockResolvedValue(new Map([['sys1', { id: 'sys1', alias: 'System Alias 1' }]]));
        jest
          .spyOn(datasource.locationUtils, 'getLocations')
          .mockResolvedValue(new Map([['loc1', { id: 'loc1', name: 'Building 1', pathWithNames: 'Site > Building 1' }]]));
        jest.spyOn(datasource, 'post').mockResolvedValue({
          workItems: [
            {
              id: '1',
              resources: {
                assets: { selections: [{ id: 'a1', targetSystemId: 'sys1', targetLocationId: 'loc1' }] },
              },
            },
          ],
          continuationToken: '',
          totalCount: 1,
        });

        const query = {
          refId: 'A',
          outputType: OutputType.Properties,
          types: [WorkItemTypeOptions.WorkOrders],
          properties: [WorkItemPropertiesOptions.TARGET_LOCATION],
          take: 1000,
        };

        const result = await datasource.runQuery(query, {} as DataQueryRequest);

        expect(result.fields[0]).toEqual({
          name: 'Target Location (Asset)',
          values: ['System Alias 1'],
          type: 'string',
        });
      });

      it('should fall back to the raw location ID when the location lookup fails', async () => {
        jest.spyOn(datasource.locationUtils, 'getLocations').mockRejectedValue(new Error('Failed'));
        jest.spyOn(datasource, 'post').mockResolvedValue({
          workItems: [
            { id: '1', resources: { assets: { selections: [{ id: 'a1', targetLocationId: 'loc1' }] } } },
          ],
          continuationToken: '',
          totalCount: 1,
        });

        const query = {
          refId: 'A',
          outputType: OutputType.Properties,
          types: [WorkItemTypeOptions.WorkOrders],
          properties: [WorkItemPropertiesOptions.TARGET_LOCATION],
          take: 1000,
        };

        const result = await datasource.runQuery(query, {} as DataQueryRequest);

        expect(result.fields[0]).toEqual({
          name: 'Target Location (Asset)',
          values: ['loc1'],
          type: 'string',
        });
      });

      it('should fall back to the system ID when the target system has no alias', async () => {
        jest
          .spyOn(datasource.systemUtils, 'getSystemAliases')
          .mockResolvedValue(new Map([['sys1', { id: 'sys1', alias: '' }]]));
        jest.spyOn(datasource, 'post').mockResolvedValue({
          workItems: [
            { id: '1', resources: { assets: { selections: [{ id: 'a1', targetSystemId: 'sys1' }] } } },
          ],
          continuationToken: '',
          totalCount: 1,
        });

        const query = {
          refId: 'A',
          outputType: OutputType.Properties,
          types: [WorkItemTypeOptions.WorkOrders],
          properties: [WorkItemPropertiesOptions.TARGET_LOCATION],
          take: 1000,
        };

        const result = await datasource.runQuery(query, {} as DataQueryRequest);

        expect(result.fields[0]).toEqual({
          name: 'Target Location (Asset)',
          values: ['sys1'],
          type: 'string',
        });
      });

      it('should fall back to the location ID when the target location has no name', async () => {
        jest
          .spyOn(datasource.locationUtils, 'getLocations')
          .mockResolvedValue(new Map([['loc1', { id: 'loc1', name: '', pathWithNames: 'Site > Building 1' }]]));
        jest.spyOn(datasource, 'post').mockResolvedValue({
          workItems: [
            { id: '1', resources: { assets: { selections: [{ id: 'a1', targetLocationId: 'loc1' }] } } },
          ],
          continuationToken: '',
          totalCount: 1,
        });

        const query = {
          refId: 'A',
          outputType: OutputType.Properties,
          types: [WorkItemTypeOptions.WorkOrders],
          properties: [WorkItemPropertiesOptions.TARGET_LOCATION],
          take: 1000,
        };

        const result = await datasource.runQuery(query, {} as DataQueryRequest);

        expect(result.fields[0]).toEqual({
          name: 'Target Location (Asset)',
          values: ['loc1'],
          type: 'string',
        });
      });

      it('should split TARGET_PARENT into asset and DUT columns resolved via asset names', async () => {
        jest.spyOn(datasource.assetUtils, 'queryAssetsInBatches').mockResolvedValue([
          { id: 'p1', name: 'Parent Asset 1' },
        ]);
        jest.spyOn(datasource, 'post').mockResolvedValue({
          workItems: [
            {
              id: '1',
              resources: {
                assets: { selections: [{ id: 'a1', targetParentId: 'p1' }] },
                duts: { selections: [{ id: 'd1', targetParentId: 'p2' }] },
              },
            },
          ],
          continuationToken: '',
          totalCount: 1,
        });

        const query = {
          refId: 'A',
          outputType: OutputType.Properties,
          types: [WorkItemTypeOptions.WorkOrders],
          properties: [WorkItemPropertiesOptions.TARGET_PARENT],
          take: 1000,
        };

        const result = await datasource.runQuery(query, {} as DataQueryRequest);

        expect(result.fields).toEqual([
          { name: 'Target Parent (Asset)', values: ['Parent Asset 1'], type: 'string' },
          { name: 'Target Parent (DUT)', values: ['p2'], type: 'string' },
        ]);
      });

      it('should fall back to the ID for TARGET_PARENT when the parent asset is found but unnamed', async () => {
        jest.spyOn(datasource.assetUtils, 'queryAssetsInBatches').mockResolvedValue([{ id: 'p1' }]);
        jest.spyOn(datasource, 'post').mockResolvedValue({
          workItems: [
            {
              id: '1',
              resources: {
                assets: { selections: [{ id: 'a1', targetParentId: 'p1' }] },
              },
            },
          ],
          continuationToken: '',
          totalCount: 1,
        });

        const query = {
          refId: 'A',
          outputType: OutputType.Properties,
          types: [WorkItemTypeOptions.WorkOrders],
          properties: [WorkItemPropertiesOptions.TARGET_PARENT],
          take: 1000,
        };

        const result = await datasource.runQuery(query, {} as DataQueryRequest);

        expect(result.fields).toEqual([
          { name: 'Target Parent (Asset)', values: ['p1'], type: 'string' },
          { name: 'Target Parent (DUT)', values: [''], type: 'string' },
        ]);
      });

      it('should group target location and target parent columns per resource when both properties are selected', async () => {
        jest
          .spyOn(datasource.systemUtils, 'getSystemAliases')
          .mockResolvedValue(new Map([['sys1', { id: 'sys1', alias: 'System Alias 1' }]]));
        jest.spyOn(datasource.assetUtils, 'queryAssetsInBatches').mockResolvedValue([
          { id: 'p1', name: 'Parent Asset 1' },
        ]);
        jest.spyOn(datasource, 'post').mockResolvedValue({
          workItems: [
            {
              id: '1',
              resources: {
                assets: {
                  selections: [{ id: 'a1', targetSystemId: 'sys1', targetParentId: 'p1' }],
                },
                duts: {
                  selections: [{ id: 'd1', targetSystemId: 'sys2', targetParentId: 'p2' }],
                },
                fixtures: { selections: [{ id: 'f1' }] },
              },
            },
          ],
          continuationToken: '',
          totalCount: 1,
        });

        const query = {
          refId: 'A',
          outputType: OutputType.Properties,
          types: [WorkItemTypeOptions.WorkOrders],
          properties: [
            WorkItemPropertiesOptions.TARGET_LOCATION,
            WorkItemPropertiesOptions.TARGET_PARENT,
          ],
          take: 1000,
        };

        const result = await datasource.runQuery(query, {} as DataQueryRequest);

        expect(result.fields).toEqual([
          { name: 'Target Location (Asset)', values: ['System Alias 1'], type: 'string' },
          { name: 'Target Parent (Asset)', values: ['Parent Asset 1'], type: 'string' },
          { name: 'Target Location (DUT)', values: ['sys2'], type: 'string' },
          { name: 'Target Parent (DUT)', values: ['p2'], type: 'string' },
        ]);
      });

      it('should build the grouped target fields only once when both TARGET_LOCATION and TARGET_PARENT are selected', async () => {
        const buildTargetResourceFieldsSpy = jest.spyOn(datasource as any, 'buildTargetResourceFields');
        jest.spyOn(datasource, 'post').mockResolvedValue({
          workItems: [{ id: '1', resources: { assets: { selections: [{ id: 'a1' }] } } }],
          continuationToken: '',
          totalCount: 1,
        });

        const query = {
          refId: 'A',
          outputType: OutputType.Properties,
          types: [WorkItemTypeOptions.WorkOrders],
          properties: [
            WorkItemPropertiesOptions.TARGET_LOCATION,
            WorkItemPropertiesOptions.TARGET_PARENT,
          ],
          take: 1000,
        };

        await datasource.runQuery(query, {} as DataQueryRequest);

        expect(buildTargetResourceFieldsSpy).toHaveBeenCalledTimes(1);
      });

      it('should keep the same grouped column order regardless of which target property is selected first', async () => {
        jest.spyOn(datasource, 'post').mockResolvedValue({
          workItems: [{ id: '1', resources: { assets: { selections: [{ id: 'a1' }] } } }],
          continuationToken: '',
          totalCount: 1,
        });

        const query = {
          refId: 'A',
          outputType: OutputType.Properties,
          types: [WorkItemTypeOptions.WorkOrders],
          properties: [WorkItemPropertiesOptions.TARGET_PARENT, WorkItemPropertiesOptions.TARGET_LOCATION],
          take: 1000,
        };

        const result = await datasource.runQuery(query, {} as DataQueryRequest);

        expect(result.fields.map(field => field.name)).toEqual([
          'Target Location (Asset)',
          'Target Parent (Asset)',
          'Target Location (DUT)',
          'Target Parent (DUT)',
        ]);
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

  describe('metricFindQuery', () => {
    it('should return work items formatted as "name (id)" for the list work items query type', async () => {
      jest.spyOn(datasource, 'post').mockResolvedValue({
        workItems: [ 
          { id: '1', name: 'Battery Cycle Test' },
          { id: '2', name: 'Thermal Test' },
        ],
        continuationToken: '',
        totalCount: 2,
      });

      const result = await datasource.metricFindQuery(
        { refId: 'A', queryType: WorkItemsVariableQueryType.ListWorkItems },
        {} as any
      );

      expect(result).toEqual([
        { text: 'Battery Cycle Test (1)', value: '1' },
        { text: 'Thermal Test (2)', value: '2' },
      ]);
    });

    it('should fall back to just the id when the work item name is missing', async () => {
      jest.spyOn(datasource, 'post').mockResolvedValue({
        workItems: [
          { id: '1', name: '' },
          { id: '2' },
        ],
        continuationToken: '',
        totalCount: 2,
      });

      const result = await datasource.metricFindQuery(
        { refId: 'A', queryType: WorkItemsVariableQueryType.ListWorkItems },
        {} as any
      );

      expect(result).toEqual([
        { text: '(1)', value: '1' },
        { text: '(2)', value: '2' },
      ]);
    });

    it('should build the filter by combining the selected types and the query filter', async () => {
      const postSpy = jest.spyOn(datasource, 'post').mockResolvedValue({
        workItems: [],
        continuationToken: '',
        totalCount: 0,
      });

      await datasource.metricFindQuery(
        {
          refId: 'A',
          queryType: WorkItemsVariableQueryType.ListWorkItems,
          types: [WorkItemTypeOptions.WorkOrders, WorkItemTypeOptions.TestPlans],
          filter: 'state = "NEW"',
        },
        { scopedVars: {} } as any
      );

      expect(postSpy).toHaveBeenCalledWith(
        '/niworkitem/v1/query-workitems',
        expect.objectContaining({
          filter: '(type = "workorder" || type = "testplan") && (state = "NEW")',
        }),
        { showErrorAlert: false }
      );
    });

    it('should resolve a template variable to the now macro in a time field', async () => {
      jest
        .spyOn(datasource.templateSrv, 'replace')
        .mockReturnValue('createdAt > "${__now:date}"');
      const postSpy = jest.spyOn(datasource, 'post').mockResolvedValue({
        workItems: [],
        continuationToken: '',
        totalCount: 0,
      });

      await datasource.metricFindQuery(
        {
          refId: 'A',
          queryType: WorkItemsVariableQueryType.ListWorkItems,
          types: [WorkItemTypeOptions.WorkOrders],
          filter: 'createdAt > "$time"',
        },
        { scopedVars: {} } as any
      );

      const requestBody = postSpy.mock.calls[0][1] as { filter: string };
      expect(requestBody.filter).toMatch(
        /^\(type = "workorder"\) && \(createdAt > "\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z"\)$/
      );
    });

    describe('type control variable replacement', () => {
      it('should replace a single-value template variable in the selected types', async () => {
        const [datasource, , templateSrv] = setupDataSource(WorkItemsDataSource);
        const postSpy = jest.spyOn(datasource, 'post').mockResolvedValue({
          workItems: [],
          continuationToken: '',
          totalCount: 0,
        });
        templateSrv.containsTemplate.mockImplementation((value?: string) => value === '$type_var');
        templateSrv.replace.mockImplementation((value?: string) =>
          value === '$type_var' ? WorkItemTypeOptions.WorkOrders : value ?? ''
        );

        await datasource.metricFindQuery(
          {
            refId: 'A',
            queryType: WorkItemsVariableQueryType.ListWorkItems,
            types: ['$type_var'] as unknown as WorkItemTypeOptions[],
          },
          { scopedVars: {} } as any
        );

        expect(postSpy).toHaveBeenCalledWith(
          '/niworkitem/v1/query-workitems',
          expect.objectContaining({ filter: '(type = "workorder")' }),
          { showErrorAlert: false }
        );
      });

      it('should expand a multi-value template variable in the selected types', async () => {
        const [datasource, , templateSrv] = setupDataSource(WorkItemsDataSource);
        const postSpy = jest.spyOn(datasource, 'post').mockResolvedValue({
          workItems: [],
          continuationToken: '',
          totalCount: 0,
        });
        templateSrv.containsTemplate.mockImplementation((value?: string) => value === '$type_var');
        templateSrv.replace.mockImplementation((value?: string) =>
          value === '$type_var'
            ? `{${WorkItemTypeOptions.WorkOrders},${WorkItemTypeOptions.TestPlans}}`
            : value ?? ''
        );

        await datasource.metricFindQuery(
          {
            refId: 'A',
            queryType: WorkItemsVariableQueryType.ListWorkItems,
            types: ['$type_var'] as unknown as WorkItemTypeOptions[],
          },
          { scopedVars: {} } as any
        );

        expect(postSpy).toHaveBeenCalledWith(
          '/niworkitem/v1/query-workitems',
          expect.objectContaining({ filter: '(type = "workorder" || type = "testplan")' }),
          { showErrorAlert: false }
        );
      });

      it('should return an empty list without querying when a type variable resolves to no values', async () => {
        const [datasource, , templateSrv] = setupDataSource(WorkItemsDataSource);
        const postSpy = jest.spyOn(datasource, 'post');
        templateSrv.containsTemplate.mockImplementation((value?: string) => value === '$type_var');
        templateSrv.replace.mockImplementation((value?: string) => (value === '$type_var' ? '' : value ?? ''));

        const result = await datasource.metricFindQuery(
          {
            refId: 'A',
            queryType: WorkItemsVariableQueryType.ListWorkItems,
            types: ['$type_var'] as unknown as WorkItemTypeOptions[],
          },
          { scopedVars: {} } as any
        );

        expect(result).toEqual([]);
        expect(postSpy).not.toHaveBeenCalled();
      });

      it('should drop unrecognized values when a multi-value type variable resolves to a mix of valid and invalid types', async () => {
        const [datasource, , templateSrv] = setupDataSource(WorkItemsDataSource);
        const postSpy = jest.spyOn(datasource, 'post').mockResolvedValue({
          workItems: [],
          continuationToken: '',
          totalCount: 0,
        });
        templateSrv.containsTemplate.mockImplementation((value?: string) => value === '$type_var');
        templateSrv.replace.mockImplementation((value?: string) =>
          value === '$type_var' ? `{${WorkItemTypeOptions.WorkOrders},UNKNOWN_TYPE}` : value ?? ''
        );

        await datasource.metricFindQuery(
          {
            refId: 'A',
            queryType: WorkItemsVariableQueryType.ListWorkItems,
            types: ['$type_var'] as unknown as WorkItemTypeOptions[],
          },
          { scopedVars: {} } as any
        );

        expect(postSpy).toHaveBeenCalledWith(
          '/niworkitem/v1/query-workitems',
          expect.objectContaining({ filter: '(type = "workorder")' }),
          { showErrorAlert: false }
        );
      });

      it('should deduplicate a type that is selected both statically and through a variable', async () => {
        const [datasource, , templateSrv] = setupDataSource(WorkItemsDataSource);
        const postSpy = jest.spyOn(datasource, 'post').mockResolvedValue({
          workItems: [],
          continuationToken: '',
          totalCount: 0,
        });
        templateSrv.containsTemplate.mockImplementation((value?: string) => value === '$type_var');
        templateSrv.replace.mockImplementation((value?: string) =>
          value === '$type_var' ? WorkItemTypeOptions.WorkOrders : value ?? ''
        );

        await datasource.metricFindQuery(
          {
            refId: 'A',
            queryType: WorkItemsVariableQueryType.ListWorkItems,
            types: [WorkItemTypeOptions.WorkOrders, '$type_var'] as unknown as WorkItemTypeOptions[],
          },
          { scopedVars: {} } as any
        );

        expect(postSpy).toHaveBeenCalledWith(
          '/niworkitem/v1/query-workitems',
          expect.objectContaining({ filter: '(type = "workorder")' }),
          { showErrorAlert: false }
        );
      });

      it('should omit the type filter when a type variable expands to cover all work item types', async () => {
        const [datasource, , templateSrv] = setupDataSource(WorkItemsDataSource);
        const postSpy = jest.spyOn(datasource, 'post').mockResolvedValue({
          workItems: [],
          continuationToken: '',
          totalCount: 0,
        });
        templateSrv.containsTemplate.mockImplementation((value?: string) => value === '$type_var');
        templateSrv.replace.mockImplementation((value?: string) =>
          value === '$type_var' ? `{${Object.values(WorkItemTypeOptions).join(',')}}` : value ?? ''
        );

        await datasource.metricFindQuery(
          {
            refId: 'A',
            queryType: WorkItemsVariableQueryType.ListWorkItems,
            types: ['$type_var'] as unknown as WorkItemTypeOptions[],
          },
          { scopedVars: {} } as any
        );

        expect(postSpy).toHaveBeenCalledWith(
          '/niworkitem/v1/query-workitems',
          expect.objectContaining({ filter: undefined }),
          { showErrorAlert: false }
        );
      });
    });

    it('should request only the id and name properties with the configured ordering and take', async () => {
      const postSpy = jest.spyOn(datasource, 'post').mockResolvedValue({
        workItems: [],
        continuationToken: '',
        totalCount: 0,
      });

      await datasource.metricFindQuery(
        {
          refId: 'A',
          queryType: WorkItemsVariableQueryType.ListWorkItems,
          types: [WorkItemTypeOptions.WorkOrders],
          filter: 'state = "NEW"',
          orderBy: OrderByOptions.ID,
          descending: false,
          take: 50,
        },
        { scopedVars: {} } as any
      );

      expect(postSpy).toHaveBeenCalledWith(
        '/niworkitem/v1/query-workitems',
        {
          filter: '(type = "workorder") && (state = "NEW")',
          projection: ['ID', 'NAME'],
          orderBy: OrderByOptions.ID,
          descending: false,
          take: 50,
          continuationToken: undefined,
        },
        { showErrorAlert: false }
      );
    });

    it('should apply template variable replacement to the filter', async () => {
      const replaceSpy = jest
        .spyOn(datasource.templateSrv, 'replace')
        .mockReturnValue('state = "NEW"');
      const postSpy = jest.spyOn(datasource, 'post').mockResolvedValue({
        workItems: [],
        continuationToken: '',
        totalCount: 0,
      });

      await datasource.metricFindQuery(
        {
          refId: 'A',
          queryType: WorkItemsVariableQueryType.ListWorkItems,
          types: [WorkItemTypeOptions.WorkOrders],
          filter: 'state = "$state"',
        },
        { scopedVars: {} } as any
      );

      expect(replaceSpy).toHaveBeenCalledWith('state = "$state"', {});
      expect(postSpy).toHaveBeenCalledWith(
        '/niworkitem/v1/query-workitems',
        expect.objectContaining({ filter: '(type = "workorder") && (state = "NEW")' }),
        { showErrorAlert: false }
      );
    });

    it('should query without a filter and skip template replacement when no filter is set', async () => {
      const replaceSpy = jest.spyOn(datasource.templateSrv, 'replace');
      const postSpy = jest.spyOn(datasource, 'post').mockResolvedValue({
        workItems: [],
        continuationToken: '',
        totalCount: 0,
      });

      const result = await datasource.metricFindQuery(
        {
          refId: 'A',
          queryType: WorkItemsVariableQueryType.ListWorkItems,
          types: Object.values(WorkItemTypeOptions),
        },
        { scopedVars: {} } as any
      );

      expect(result).toEqual([]);
      expect(replaceSpy).not.toHaveBeenCalled();
      expect(postSpy).toHaveBeenCalledWith(
        '/niworkitem/v1/query-workitems',
        expect.objectContaining({ filter: undefined, projection: ['ID', 'NAME'] }),
        { showErrorAlert: false }
      );
    });

    it('should not throw when invoked without options and a filter is set', async () => {
      const replaceSpy = jest
        .spyOn(datasource.templateSrv, 'replace')
        .mockReturnValue('state = "NEW"');
      const postSpy = jest.spyOn(datasource, 'post').mockResolvedValue({
        workItems: [],
        continuationToken: '',
        totalCount: 0,
      });

      const result = await datasource.metricFindQuery({
        refId: 'A',
        queryType: WorkItemsVariableQueryType.ListWorkItems,
        types: [WorkItemTypeOptions.WorkOrders],
        filter: 'state = "$state"',
      });

      expect(result).toEqual([]);
      expect(replaceSpy).toHaveBeenCalledWith('state = "$state"', undefined);
      expect(postSpy).toHaveBeenCalledWith(
        '/niworkitem/v1/query-workitems',
        expect.objectContaining({ filter: '(type = "workorder") && (state = "NEW")' }),
        { showErrorAlert: false }
      );
    });

    it('should replace and expand a multi-value template variable in the filter', async () => {
      const replaceSpy = jest
        .spyOn(datasource.templateSrv, 'replace')
        .mockReturnValue('state = "{NEW,DEFINED}"');
      const postSpy = jest.spyOn(datasource, 'post').mockResolvedValue({
        workItems: [],
        continuationToken: '',
        totalCount: 0,
      });
      const scopedVars = { state: { text: 'NEW', value: 'NEW' } };

      const result = await datasource.metricFindQuery(
        {
          refId: 'A',
          queryType: WorkItemsVariableQueryType.ListWorkItems,
          types: Object.values(WorkItemTypeOptions),
          filter: 'state = "$state"',
        },
        { scopedVars } as any
      );

      expect(result).toEqual([]);
      expect(replaceSpy).toHaveBeenCalledWith('state = "$state"', scopedVars);
      expect(postSpy).toHaveBeenCalledWith(
        '/niworkitem/v1/query-workitems',
        expect.objectContaining({ filter: '(state = "NEW" || state = "DEFINED")' }),
        { showErrorAlert: false }
      );
    });

    it('should return an empty list when no types are selected', async () => {
      const postSpy = jest.spyOn(datasource, 'post');

      const result = await datasource.metricFindQuery(
        { refId: 'A', queryType: WorkItemsVariableQueryType.ListWorkItems, types: [] },
        {} as any
      );

      expect(result).toEqual([]);
      expect(postSpy).not.toHaveBeenCalled();
    });

    it('should return an empty list when the take is invalid', async () => {
      const postSpy = jest.spyOn(datasource, 'post');

      const result = await datasource.metricFindQuery(
        { refId: 'A', queryType: WorkItemsVariableQueryType.ListWorkItems, take: 0 },
        {} as any
      );

      expect(result).toEqual([]);
      expect(postSpy).not.toHaveBeenCalled();
    });

    it('should return an empty list without querying when a type variable resolves to no recognized types', async () => {
      const [datasource, , templateSrv] = setupDataSource(WorkItemsDataSource);
      const postSpy = jest.spyOn(datasource, 'post');
      templateSrv.containsTemplate.mockImplementation((value?: string) => value === '$type_var');
      templateSrv.replace.mockImplementation((value?: string) =>
        value === '$type_var' ? 'UNKNOWN_TYPE' : value ?? ''
      );

      const result = await datasource.metricFindQuery(
        {
          refId: 'A',
          queryType: WorkItemsVariableQueryType.ListWorkItems,
          types: ['$type_var'] as unknown as WorkItemTypeOptions[],
        },
        { scopedVars: {} } as any
      );

      expect(result).toEqual([]);
      expect(postSpy).not.toHaveBeenCalled();
    });

    it('should pass the request scoped variables when resolving the selected types for a variable query', async () => {
      const [datasource, , templateSrv] = setupDataSource(WorkItemsDataSource);
      jest.spyOn(datasource, 'post').mockResolvedValue({
        workItems: [],
        continuationToken: '',
        totalCount: 0,
      });
      templateSrv.containsTemplate.mockImplementation((value?: string) => value === '$type_var');
      templateSrv.replace.mockImplementation((value?: string) =>
        value === '$type_var' ? WorkItemTypeOptions.WorkOrders : value ?? ''
      );
      const scopedVars = { type_var: { text: 'Work order', value: WorkItemTypeOptions.WorkOrders } };

      await datasource.metricFindQuery(
        {
          refId: 'A',
          queryType: WorkItemsVariableQueryType.ListWorkItems,
          types: ['$type_var'] as unknown as WorkItemTypeOptions[],
        },
        { scopedVars } as any
      );

      expect(templateSrv.replace).toHaveBeenCalledWith('$type_var', scopedVars);
    });

    it('should return the list of work item types when the query type is list work item types', async () => {
      const result = await datasource.metricFindQuery(
        { refId: 'A', queryType: WorkItemsVariableQueryType.ListWorkItemTypes },
        {} as any
      );

      expect(result).toEqual([
        { text: 'Work order', value: WorkItemTypeOptions.WorkOrders },
        { text: 'Test plan', value: WorkItemTypeOptions.TestPlans },
        { text: 'Job', value: WorkItemTypeOptions.Job },
        { text: 'Maintenance', value: WorkItemTypeOptions.Maintenance },
        { text: 'Calibration', value: WorkItemTypeOptions.Calibration },
        { text: 'Reservation', value: WorkItemTypeOptions.Reservation },
        { text: 'Transport order', value: WorkItemTypeOptions.TransportOrder },
      ]);
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

  describe('buildFilterFromQuery', () => {
    it('should return undefined when all types are selected and there is no filter', () => {
      const query = { refId: 'A', types: Object.values(WorkItemTypeOptions) };

      expect(datasource.buildFilterFromQuery(query)).toBeUndefined();
    });

    it('should build only the type filter when a subset of types is selected', () => {
      const query = { refId: 'A', types: [WorkItemTypeOptions.WorkOrders] };

      expect(datasource.buildFilterFromQuery(query)).toBe('(type = "workorder")');
    });

    it('should build only the trimmed query filter when all types are selected', () => {
      const query = { refId: 'A', types: Object.values(WorkItemTypeOptions), filter: '  name = "test"  ' };

      expect(datasource.buildFilterFromQuery(query)).toBe('(name = "test")');
    });

    it('should combine the type filter and the query filter', () => {
      const query = {
        refId: 'A',
        types: [WorkItemTypeOptions.WorkOrders],
        filter: 'name = "test"',
      };

      expect(datasource.buildFilterFromQuery(query)).toBe('(type = "workorder") && (name = "test")');
    });

    it('should transform duration filters within the query filter', () => {
      const query = {
        refId: 'A',
        types: Object.values(WorkItemTypeOptions),
        filter: 'estimatedDurationInDays > "2"',
      };

      expect(datasource.buildFilterFromQuery(query)).toBe('(timeline.estimatedDurationInSeconds > "172800")');
    });

    it('should return undefined when there are no types and no filter', () => {
      const query = { refId: 'A', types: [] };

      expect(datasource.buildFilterFromQuery(query)).toBeUndefined();
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

describe('loadLocations', () => {
  it('should return the list of locations when the API call succeeds', async () => {
    const [datasource] = setupDataSource(WorkItemsDataSource);
    jest.spyOn(datasource.locationUtils, 'getLocations').mockResolvedValue(
      new Map([['1', { id: '1', name: 'Building 1', pathWithNames: 'Site > Building 1' }]])
    );

    const result = await datasource.loadLocations();

    expect(result.get('1')?.name).toBe('Building 1');
  });

  it('should return an empty map when the lookup fails', async () => {
    const [datasource] = setupDataSource(WorkItemsDataSource);
    jest.spyOn(datasource.locationUtils, 'getLocations').mockRejectedValue(new Error('Error'));

    const result = await datasource.loadLocations();

    expect(result.size).toBe(0);
  });
});

describe('query builder lookup error handling', () => {
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
  const locationLookup = {
    name: 'location',
    fail: (datasource: WorkItemsDataSource, error: Error) =>
      jest.spyOn(datasource.locationUtils, 'getLocations').mockRejectedValue(error),
    load: (datasource: WorkItemsDataSource) => datasource.loadLocations(),
  };

  it.each([productLookup, userLookup, workspaceLookup, systemAliasLookup, locationLookup])(
    'should set errorTitle and errorDescription when the $name lookup fails',
    async ({ fail, load }) => {
      const [datasource] = setupDataSource(WorkItemsDataSource);
      fail(datasource, new Error('Request failed with status code: 404'));

      await load(datasource);

      expect(datasource.errorTitle).toBe('Warning during work items query');
      expect(datasource.errorDescription).toBe(
        'The query builder lookups failed because the requested resource was not found. Please check the query parameters and try again.'
      );
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

describe('getCustomPropertyOptions', () => {
  let datasource: WorkItemsDataSource;
  let postSpy: jest.SpyInstance;

  beforeEach(() => {
    [datasource] = setupDataSource(WorkItemsDataSource);
    postSpy = jest.spyOn(datasource, 'post');
  });

  it('should query work items with the PROPERTIES projection and the given take', async () => {
    postSpy.mockResolvedValue({ workItems: [] });

    await datasource.getCustomPropertyOptions(undefined, DEFAULT_TAKE);

    expect(postSpy).toHaveBeenCalledWith(
      '/niworkitem/v1/query-workitems',
      { filter: undefined, projection: ['PROPERTIES'], take: DEFAULT_TAKE },
      { showErrorAlert: false }
    );
  });

  it('should pass the given filter and take to the query', async () => {
    postSpy.mockResolvedValue({ workItems: [] });

    await datasource.getCustomPropertyOptions('type = "workorder"', 500);

    expect(postSpy).toHaveBeenCalledWith(
      '/niworkitem/v1/query-workitems',
      { filter: 'type = "workorder"', projection: ['PROPERTIES'], take: 500 },
      { showErrorAlert: false }
    );
  });

  it.each([
    ['the response has an empty workItems list', { workItems: [] }],
    ['the response has no workItems', {}],
    ['no work item has custom properties', { workItems: [{ id: '1' }, { id: '2', properties: {} }] }],
  ])('should return an empty list when %s', async (_description, response) => {
    postSpy.mockResolvedValue(response);

    expect(await datasource.getCustomPropertyOptions(undefined, DEFAULT_TAKE)).toEqual([]);
  });

  it('should return one option per custom property key grouped under custom properties', async () => {
    postSpy.mockResolvedValue({
      workItems: [{ properties: { propA: 'valueA', propB: 'valueB' } }],
    });

    expect(await datasource.getCustomPropertyOptions(undefined, DEFAULT_TAKE)).toEqual([
      { label: 'propA', value: `propA${CUSTOM_PROPERTY_SUFFIX}`, group: WorkItemPropertiesGroup.CUSTOM_PROPERTIES },
      { label: 'propB', value: `propB${CUSTOM_PROPERTY_SUFFIX}`, group: WorkItemPropertiesGroup.CUSTOM_PROPERTIES },
    ]);
  });

  it('should return one option when the same key is present on multiple work items', async () => {
    postSpy.mockResolvedValue({
      workItems: [
        { properties: { propA: 'valueA', propB: 'valueB' } },
        { properties: { propB: 'valueB2', propC: 'valueC' } },
      ],
    });

    const options = await datasource.getCustomPropertyOptions(undefined, DEFAULT_TAKE);

    expect(options.map(option => option.label)).toEqual(['propA', 'propB', 'propC']);
  });

  it('should return custom properties sorted alphabetically', async () => {
    postSpy.mockResolvedValue({
      workItems: [{ properties: { zprop: 'v1', aprop: 'v2', bprop: 'v3' } }],
    });

    const options = await datasource.getCustomPropertyOptions(undefined, DEFAULT_TAKE);

    expect(options.map(option => option.label)).toEqual(['aprop', 'bprop', 'zprop']);
  });

  it('should skip work items without custom properties while collecting keys', async () => {
    postSpy.mockResolvedValue({
      workItems: [{ id: '1' }, { properties: { propA: 'valueA' } }, { id: '3' }],
    });

    const options = await datasource.getCustomPropertyOptions(undefined, DEFAULT_TAKE);

    expect(options.map(option => option.label)).toEqual(['propA']);
  });

  it('should not return more options than the custom property options limit', async () => {
    const properties: Record<string, string> = {};
    for (let index = 0; index < CUSTOM_PROPERTY_OPTIONS_LIMIT + 10; index++) {
      properties[`prop${index}`] = `value${index}`;
    }
    postSpy.mockResolvedValue({ workItems: [{ properties }] });

    const options = await datasource.getCustomPropertyOptions(undefined, DEFAULT_TAKE);

    expect(options).toHaveLength(CUSTOM_PROPERTY_OPTIONS_LIMIT);
  });

  it('should propagate the query error when the request fails', async () => {
    postSpy.mockRejectedValue(new Error('Request failed with status code: 404'));

    await expect(datasource.getCustomPropertyOptions(undefined, DEFAULT_TAKE)).rejects.toThrow(
      'The query to fetch work items failed because the requested resource was not found. Please check the query parameters and try again.'
    );
  });
});
