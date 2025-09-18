import { AlarmsDataSourceCore } from './AlarmsDataSourceCore';
import { DataFrameDTO, DataQueryRequest, ScopedVars } from '@grafana/data';
import { AlarmsQuery, QueryAlarmsRequest, QueryType } from './types/types';
import { MockProxy } from 'jest-mock-extended';
import { BackendSrv } from '@grafana/runtime';
import { createFetchError, createFetchResponse, requestMatching, setupDataSource } from 'test/fixtures';
import { QUERY_ALARMS_RELATIVE_PATH } from './constants/QueryAlarms.constants';

class TestAlarmsDataSource extends AlarmsDataSourceCore {
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

  readonly defaultQuery = {
    queryType: QueryType.AlarmsCount,
  };
}

describe('AlarmsDataSourceCore', () => {
  let datastore: TestAlarmsDataSource, backendServer: MockProxy<BackendSrv>;

  beforeEach(() => {
    [datastore, backendServer] = setupDataSource(TestAlarmsDataSource);
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
      test('should transform fields when queryBy contains a date time filter', () => {
        jest.useFakeTimers().setSystemTime(new Date('2025-01-01'));

        const mockQueryBy = 'acknowledgedAt > "${__now:date}"';
        const transformedQuery = datastore.transformAlarmsQueryWrapper({}, mockQueryBy);

        expect(transformedQuery).toBe('acknowledgedAt > "2025-01-01T00:00:00.000Z"');
        jest.useRealTimers();
      });

      test('replace time variables', () => {
        const mockQueryBy = 'occurredAt < "${__from:date}"';
        jest.spyOn(datastore.templateSrv, 'replace').mockReturnValue('occurredAt < "2025-01-01T00:00:00.000Z"');
        
        const transformQuery = datastore.transformAlarmsQueryWrapper({}, mockQueryBy);

        expect(datastore.templateSrv.replace).toHaveBeenCalledWith('occurredAt < "${__from:date}"', {});
        expect(transformQuery).toBe('occurredAt < "2025-01-01T00:00:00.000Z"');
      })
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
});
