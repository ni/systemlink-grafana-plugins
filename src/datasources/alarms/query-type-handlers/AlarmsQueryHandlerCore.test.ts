import { AlarmsQueryHandlerCore } from './AlarmsQueryHandlerCore';
import { DataFrameDTO, DataQueryRequest, ScopedVars } from '@grafana/data';
import { AlarmsQuery, QueryAlarmsRequest, QueryType } from '../types/types';
import { MockProxy } from 'jest-mock-extended';
import { BackendSrv } from '@grafana/runtime';
import { createFetchError, createFetchResponse, requestMatching, setupDataSource } from 'test/fixtures';
import { QUERY_ALARMS_RELATIVE_PATH } from '../constants/QueryAlarms.constants';
import { Workspace } from 'core/types';
import { queryInBatches, queryUntilComplete } from 'core/utils';

jest.mock('core/utils', () => ({
  getVariableOptions: jest.fn(),
  queryInBatches: jest.fn(),
  queryUntilComplete: jest.fn(),
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

class TestAlarmsQueryHandler extends AlarmsQueryHandlerCore {
  async runQuery(query: AlarmsQuery, _: DataQueryRequest): Promise<DataFrameDTO> {

    return {
      refId: query.refId,
      fields: [],
    };
  }

  async queryAlarmsWrapper(query: QueryAlarmsRequest) {
    return this.queryAlarms(query);
  }

  transformAlarmsQueryWrapper(scopedVars: ScopedVars, query?: string): string | undefined {
    return this.transformAlarmsQuery(scopedVars, query);
  }

  async queryAlarmsInBatchesWrapper(alarmsRequest: QueryAlarmsRequest){
    return this.queryAlarmsInBatches(alarmsRequest);
  }

  async queryAlarmsUntilCompleteWrapper(alarmsRequest: QueryAlarmsRequest){
    return this.queryAlarmsUntilComplete(alarmsRequest);
  }

  readonly defaultQuery = {
    queryType: QueryType.AlarmsCount,
  };
}

describe('AlarmsQueryHandlerCore', () => {
  let datastore: TestAlarmsQueryHandler, backendServer: MockProxy<BackendSrv>;

  beforeEach(() => {
    [datastore, backendServer] = setupDataSource(TestAlarmsQueryHandler);
  });

  describe('globalVariableOptions', () => {
    it('should get variable options', () => {
      expect(datastore.globalVariableOptions()).toEqual([
        { label: '$test_var', value: '$test_var' },
      ]);
    });
  });

  describe('queryAlarms', () => {
    it('should call the query alarms API with the given parameters', async () => {
      backendServer.fetch
        .calledWith(requestMatching({ url: QUERY_ALARMS_RELATIVE_PATH }))
        .mockReturnValue(await Promise.resolve(createFetchResponse({ totalCount: 10 })));

      const response = await datastore.queryAlarmsWrapper({ take: 1, returnCount: true });

      expect(backendServer.fetch).toHaveBeenCalledWith(
        expect.objectContaining({
          url: expect.stringContaining(QUERY_ALARMS_RELATIVE_PATH),
          method: 'POST',
          data: { take: 1, returnCount: true },
          showErrorAlert: false
        })
      );
      expect(response).toEqual({ totalCount: 10 });
    });

    describe('error handling', () => {
      const publishMock = jest.fn();

      beforeEach(() => {
        (datastore as any).appEvents = { publish: publishMock };
      });

      const testCases = [
        {
          status: 404,
          expectedErrorMessage:
            'The query to fetch alarms failed because the requested resource was not found. Please check the query parameters and try again.',
        },
        {
          status: 504,
          expectedErrorMessage:
            'The query to fetch alarms experienced a timeout error. Narrow your query with a more specific filter and try again.',
        },
        {
          status: 500,
          expectedErrorMessage: 'The query failed due to the following error: (status 500) "Error".',
        },
      ];

      testCases.forEach(({ status, expectedErrorMessage }) => {
      it('should handle ' + status + ' error', async () => {
          backendServer.fetch
            .calledWith(requestMatching({ url: QUERY_ALARMS_RELATIVE_PATH }))
            .mockReturnValueOnce(createFetchError(status));

          await expect(datastore.queryAlarmsWrapper({})).rejects.toThrow(expectedErrorMessage);

          expect(publishMock).toHaveBeenCalledWith({
            type: 'alert-error',
            payload: ['Error during alarms query', expectedErrorMessage],
          });
        });
      });

      it('should handle 429 error', async () => {
        const expectedErrorMessage =
          'The query to fetch alarms failed due to too many requests. Please try again later.';
        jest.spyOn(datastore, 'post').mockImplementation(() => {
          throw new Error('Request failed with status code: 429');
        });

        await expect(datastore.queryAlarmsWrapper({})).rejects.toThrow(expectedErrorMessage);

        expect(publishMock).toHaveBeenCalledWith({
          type: 'alert-error',
          payload: ['Error during alarms query', expectedErrorMessage],
        });
      });

      it('should handle unknown errors', async () => {
        const expectedErrorMessage = 'The query failed due to an unknown error.';
        backendServer.fetch.calledWith(requestMatching({ url: QUERY_ALARMS_RELATIVE_PATH })).mockImplementation(() => {
          throw new Error('Error');
        });

        await expect(datastore.queryAlarmsWrapper({})).rejects.toThrow(expectedErrorMessage);

        expect(publishMock).toHaveBeenCalledWith({
          type: 'alert-error',
          payload: ['Error during alarms query', expectedErrorMessage],
        });
      });
    });

    describe('transformAlarmsQuery', () => {
      it('should replace ${__now:date} with the current datetime in the filter', () => {
        jest.useFakeTimers().setSystemTime(new Date('2025-01-01'));

        const mockQueryBy = 'acknowledgedAt > "${__now:date}"';
        const transformedQuery = datastore.transformAlarmsQueryWrapper({}, mockQueryBy);

        expect(transformedQuery).toBe('acknowledgedAt > "2025-01-01T00:00:00.000Z"');
        jest.useRealTimers();
      });

      it('should replace time variables in the filter', () => {
        const mockQueryBy = 'occurredAt < "${__from:date}"';
        jest.spyOn(datastore.templateSrv, 'replace').mockReturnValue('occurredAt < "2025-01-01T00:00:00.000Z"');
        
        const transformQuery = datastore.transformAlarmsQueryWrapper({}, mockQueryBy);

        expect(datastore.templateSrv.replace).toHaveBeenCalledWith('occurredAt < "${__from:date}"', {});
        expect(transformQuery).toBe('occurredAt < "2025-01-01T00:00:00.000Z"');
      });

      it('should replace single value variable in the filter', () => {
        const mockQueryBy = 'alarmId < "${query0}"';
        jest.spyOn(datastore.templateSrv, 'replace').mockReturnValue('alarmId < "test-alarmID-1"');

        const transformQuery = datastore.transformAlarmsQueryWrapper({}, mockQueryBy);

        expect(datastore.templateSrv.replace).toHaveBeenCalledWith('alarmId < "${query0}"', {});
        expect(transformQuery).toBe('alarmId < "test-alarmID-1"');
      });

      it('should replace multiple value variable in the filter', () => {
        const mockFilter = 'channel = "${query0}"';
        jest.spyOn(datastore.templateSrv, 'replace').mockReturnValue('channel = "{channel1,channel2}"');

        const transformQuery = datastore.transformAlarmsQueryWrapper({}, mockFilter);

        expect(datastore.templateSrv.replace).toHaveBeenCalledWith('channel = "${query0}"', {});
        expect(transformQuery).toBe('(channel = "channel1" || channel = "channel2")');
      });

      it('should transform query with multiple filters and variable combinations', () => {
        const mockFilter = '(alarmId = "$query0" && description = "test") || channel = "Channel3"';
        jest.spyOn(datastore.templateSrv, 'replace').mockReturnValue('(alarmId = "{alarmId1,alarmId2}" && description = "test") || channel = "Channel3"');

        const transformQuery = datastore.transformAlarmsQueryWrapper({}, mockFilter);

        expect(datastore.templateSrv.replace).toHaveBeenCalledWith('(alarmId = \"$query0\" && description = \"test\") || channel = \"Channel3\"', {});
        expect(transformQuery).toBe('((alarmId = \"alarmId1\" || alarmId = \"alarmId2\") && description = \"test\") || channel = \"Channel3\"');
      });

      it('should apply the && operator for multi-value variables with the not-equals condition', () => {
        const mockFilter = 'channel != "${query0}"';
        jest.spyOn(datastore.templateSrv, 'replace').mockReturnValue('channel != "{channel1,channel2}"');

        const transformQuery = datastore.transformAlarmsQueryWrapper({}, mockFilter);

        expect(datastore.templateSrv.replace).toHaveBeenCalledWith('channel != "${query0}"', {});
        expect(transformQuery).toBe('(channel != "channel1" && channel != "channel2")');
      });

      describe('transformSourceFilter', () => {
        [
          {
            name: 'source equals',
            input: 'source = "test-source"',
            expected: '(properties.system = "test-source" || properties.minionId = "test-source")',
          },
          {
            name: 'source does not equal',
            input: 'source != "test-source"',
            expected: '(properties.system != "test-source" && properties.minionId != "test-source")',
          },
          {
            name: 'source is blank',
            input: 'string.IsNullOrEmpty(source)',
            expected: '(string.IsNullOrEmpty(properties.system) && string.IsNullOrEmpty(properties.minionId))',
          },
          {
            name: 'source is not blank',
            input: '!string.IsNullOrEmpty(source)',
            expected: '(!string.IsNullOrEmpty(properties.system) || !string.IsNullOrEmpty(properties.minionId))',
          },
          {
            name: 'source contains',
            input: 'source.Contains("test-source")',
            expected: '(properties.system.Contains("test-source") || properties.minionId.Contains("test-source"))',
          },
          {
            name: 'source does not contain',
            input: '!(source.Contains("test-source"))',
            expected: '(!(properties.system.Contains("test-source")) && !(properties.minionId.Contains("test-source")))',
          },
        ].forEach(({ name, input, expected }) => {
          it(`should transform ${name} filter`, () => {
            const result = datastore.transformAlarmsQueryWrapper({}, input);

            expect(result).toBe(expected);
          });
        });

        [
          {
            name: 'source equals',
            input: 'source = "${query0}"',
            replacedInput: 'source = "{source1,source2}"',
            expected:
              '((properties.system = "source1" || properties.system = "source2") || (properties.minionId = "source1" || properties.minionId = "source2"))',
          },
          {
            name: 'source does not equal',
            input: 'source != "${query0}"',
            replacedInput: 'source != "{source1,source2}"',
            expected:
              '((properties.system != "source1" && properties.system != "source2") && (properties.minionId != "source1" && properties.minionId != "source2"))',
          },
        ].forEach(({ name, input, replacedInput, expected }) => {
          it(`should transform ${name} for mutiple value variable filter`, () => {
            jest.spyOn(datastore.templateSrv, 'replace').mockReturnValue(replacedInput);

            const transformQuery = datastore.transformAlarmsQueryWrapper({}, input);

            expect(datastore.templateSrv.replace).toHaveBeenCalledWith(input, {});
            expect(transformQuery).toBe(expected);
          });
        });

        it('should replace single value variable in the source filter', () => {
          const mockQueryBy = 'source != "${query0}"';
          jest.spyOn(datastore.templateSrv, 'replace').mockReturnValue('source != "test-source"');

          const transformQuery = datastore.transformAlarmsQueryWrapper({}, mockQueryBy);

          expect(datastore.templateSrv.replace).toHaveBeenCalledWith('source != "${query0}"', {});
          expect(transformQuery).toBe('(properties.system != "test-source" && properties.minionId != "test-source")');
        });

        it('should handle transformation for multiple source filters in a query', () => {
          const mockFilter = 'source = "source1" || string.IsNullOrEmpty(source)';

          const result = datastore.transformAlarmsQueryWrapper({}, mockFilter);

          expect(result).toBe(
            '(properties.system = "source1" || properties.minionId = "source1") || (string.IsNullOrEmpty(properties.system) && string.IsNullOrEmpty(properties.minionId))'
          );
        });
      });
    });
  });

  describe('queryAlarmsInBatches', () => {
    it('queryRecord callback should call queryAlarms with correct parameters', async () => {
      const requestBody = { filter: 'active = "true"', take: 100 };
      const mockAlarmsResponse = {
        alarms: [{ id: '1' }, { id: '2' }],
        continuationToken: null,
        totalCount: null,
      };
      jest.spyOn(datastore as any, 'queryAlarms').mockResolvedValue(mockAlarmsResponse);
      (queryInBatches as jest.Mock).mockImplementation(async (queryRecord, _config, _take) => {
        const result = await queryRecord(requestBody.take, undefined);
        
        return { 
          data: result.data,
          totalCount: result.totalCount
        };
      });

      const result = await datastore.queryAlarmsInBatchesWrapper(requestBody);

      expect((datastore as any).queryAlarms).toHaveBeenCalledWith({
        filter: 'active = "true"',
        take: 100,
        continuationToken: undefined,
      });
      expect(result).toEqual(mockAlarmsResponse.alarms);
    });

    it('should pass correct batch configuration and take to queryInBatches', async () => {
      (queryInBatches as jest.Mock).mockResolvedValueOnce([]);

      await datastore.queryAlarmsInBatchesWrapper({ take: 500 });

      expect(queryInBatches).toHaveBeenCalledWith(
        expect.any(Function),
        {
          maxTakePerRequest: 1000,
          requestsPerSecond: 5,
        },
        500
      );
    });
  });

  describe('queryAlarmsUntilComplete', () => {
    it('queryRecord callback should call queryAlarms with correct parameters when take is provided', async () => {
      const requestBody = { filter: 'active = "true"', take: 100 };
      const mockAlarmsResponse = {
        alarms: [{ id: '1' }, { id: '2' }],
        continuationToken: null,
        totalCount: null,
      };
      jest.spyOn(datastore as any, 'queryAlarms').mockResolvedValue(mockAlarmsResponse);
      (queryUntilComplete as jest.Mock).mockImplementation(async (queryRecord, _config, _take) => {
        const result = await queryRecord(requestBody.take, undefined);
        
        return { 
          data: result.data,
          totalCount: result.totalCount
        };
      });

      const result = await datastore.queryAlarmsUntilCompleteWrapper(requestBody);

      expect((datastore as any).queryAlarms).toHaveBeenCalledWith({
        filter: 'active = "true"',
        take: 100,
        continuationToken: undefined,
      });
      expect(result).toEqual(mockAlarmsResponse.alarms);
    });

    it('queryRecord callback should call queryAlarms with correct parameters when take is not provided', async () => {
      const requestBody = { filter: 'severity = "HIGH"' };
      const mockAlarmsResponse = {
        alarms: [{ id: '1' }, { id: '2' }, { id: '3' }],
        continuationToken: null,
        totalCount: 3,
      };
      jest.spyOn(datastore as any, 'queryAlarms').mockResolvedValue(mockAlarmsResponse);
      (queryUntilComplete as jest.Mock).mockImplementation(async (queryRecord) => {
        const result = await queryRecord(undefined, undefined);
        return { data: result.data, totalCount: result.totalCount };
      });

      const result = await datastore.queryAlarmsUntilCompleteWrapper(requestBody);

      expect((datastore as any).queryAlarms).toHaveBeenCalledWith({
        filter: 'severity = "HIGH"',
        take: undefined,
        continuationToken: undefined,
      });
      expect(result).toEqual(mockAlarmsResponse.alarms);
    });

    it('should pass correct batch configuration and take to queryUntilComplete', async () => {
      (queryUntilComplete as jest.Mock).mockResolvedValueOnce([]);

      await datastore.queryAlarmsUntilCompleteWrapper({});

      expect(queryUntilComplete).toHaveBeenCalledWith(
        expect.any(Function),
        {
          maxTakePerRequest: 1000,
          requestsPerSecond: 5,
        }
      );
    });

    it('should handle queryRecord function with continuation token', async () => {
      const requestBody = { filter: 'channel = "test"', take: 100 };

      const firstPageResponse = {
        alarms: [{ id: '1' }, { id: '2' }],
        continuationToken: 'next-page-token',
        totalCount: 150,
      };
      
      const secondPageResponse = {
        alarms: [{ id: '3' }, { id: '4' }],
        continuationToken: null,
        totalCount: 150,
      };

      // Spy on the query endpoint and mock return values
      backendServer.fetch
        .calledWith(requestMatching({ url: QUERY_ALARMS_RELATIVE_PATH }))
        .mockReturnValueOnce(createFetchResponse(firstPageResponse))
        .mockReturnValueOnce(createFetchResponse(secondPageResponse));

      // Mock queryUntilComplete to simulate pagination behavior
      (queryUntilComplete as jest.Mock).mockImplementation(async (queryRecord) => {
        // First call without continuation token
        const firstResult = await queryRecord(100, undefined);
        // Second call with continuation token
        const secondResult = await queryRecord(100, 'next-page-token');
        
        return { 
          data: [...firstResult.data, ...secondResult.data], 
          totalCount: secondResult.totalCount 
        };
      });

      const result = await datastore.queryAlarmsUntilCompleteWrapper(requestBody);

      expect(backendServer.fetch).toHaveBeenCalledTimes(2);
      
      expect(backendServer.fetch).toHaveBeenNthCalledWith(1,
        expect.objectContaining({
          url: expect.stringContaining(QUERY_ALARMS_RELATIVE_PATH),
          method: 'POST',
          data: {
            filter: 'channel = "test"',
            take: 100,
            continuationToken: undefined,
          },
          showErrorAlert: false
        })
      );

      expect(backendServer.fetch).toHaveBeenNthCalledWith(2,
        expect.objectContaining({
          url: expect.stringContaining(QUERY_ALARMS_RELATIVE_PATH),
          method: 'POST',
          data: {
            filter: 'channel = "test"',
            take: 100,
            continuationToken: 'next-page-token',
          },
          showErrorAlert: false
        })
      );

      expect(result).toEqual([
        { id: '1' }, 
        { id: '2' }, 
        { id: '3' }, 
        { id: '4' }
      ]);
    });
  });

  describe('shouldRunQuery', () => {
    it('should return false when query is hidden', () => {
      const query = { refId: 'A', hide: true };

      const result = datastore.shouldRunQuery(query);

      expect(result).toBe(false);
    });

    it('should return true when query is not hidden', () => {
      const query = { refId: 'A', hide: false };

      const result = datastore.shouldRunQuery(query);

      expect(result).toBe(true);
    });
  });

  describe('loadWorkspaces', () => {
    it('should return workspaces', async () => {
      const workspaces = await datastore.loadWorkspaces();

      expect(workspaces).toEqual(
        new Map([
          ['Workspace1', { id: 'Workspace1', name: 'Workspace Name' }],
          ['Workspace2', { id: 'Workspace2', name: 'Another Workspace Name' }],
        ])
      );
    });

    it('should return empty map on error', async () => {
      (datastore as any).workspaceUtils.getWorkspaces.mockRejectedValue(new Error('Error loading workspaces'));

      const workspaces = await datastore.loadWorkspaces();

      expect(workspaces).toEqual(new Map<string, Workspace>());
    });

    [
      {
        error: new Error('Request failed with status code: 404'),
        expectedErrorDescription:
          'The query builder lookups failed because the requested resource was not found. Please check the query parameters and try again.',
        case: '404 error',
      },
      {
        error: new Error('Request failed with status code: 429'),
        expectedErrorDescription:
          'The query builder lookups failed due to too many requests. Please try again later.',
        case: '429 error',
      },
      {
        error: new Error('Request failed with status code: 504'),
        expectedErrorDescription:
          'The query builder lookups experienced a timeout error. Some values might not be available. Narrow your query with a more specific filter and try again.',
        case: '504 error',
      },
      {
        error: new Error('Request failed with status code: 500, Error message: {"message": "Internal Server Error"}'),
        expectedErrorDescription:
          'Some values may not be available in the query builder lookups due to the following error: Internal Server Error.',
        case: '500 error with message',
      },
      {
        error: new Error('API failed'),
        expectedErrorDescription:
          'Some values may not be available in the query builder lookups due to an unknown error.',
        case: 'Unknown error',
      },
    ].forEach(({ error, expectedErrorDescription, case: testCase }) => {
      it(`should handle ${testCase}`, async () => {
        const expectedErrorTitle = 'Warning during alarms query';
        jest
          .spyOn((datastore as any).workspaceUtils, 'getWorkspaces')
          .mockRejectedValue(error);

        await datastore.loadWorkspaces();

        expect(datastore.errorTitle).toBe(expectedErrorTitle);
        expect(datastore.errorDescription).toBe(expectedErrorDescription);
      });
    });
  });
});
