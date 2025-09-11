import { AlarmsDataSourceCore } from './AlarmsDataSourceCore';
import { DataFrameDTO, DataQueryRequest } from '@grafana/data';
import { AlarmsQuery, QueryAlarmsRequestBody, QueryType } from './types/types';
import { MockProxy } from 'jest-mock-extended';
import { BackendSrv } from '@grafana/runtime';
import { createFetchError, createFetchResponse, requestMatching, setupDataSource } from 'test/fixtures';

class TestAlarmsDataSource extends AlarmsDataSourceCore {
  async runQuery(query: AlarmsQuery, _: DataQueryRequest): Promise<DataFrameDTO> {

    return {
      refId: query.refId,
      fields: [],
    };
  }

  async queryAlarmsWrapper(query: QueryAlarmsRequestBody) {
    return this.queryAlarms(query);
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
    it('should call the query alarms API', async () => {
      backendServer.fetch
        .calledWith(requestMatching({ url: '/nialarm/v1/query-instances-with-filter' }))
        .mockReturnValue(await Promise.resolve(createFetchResponse({ totalCount: 10 })));

      const response = await datastore.queryAlarmsWrapper({ take: 1, returnCount: true });

      expect(backendServer.fetch).toHaveBeenCalledWith(
        expect.objectContaining({
          url: expect.stringContaining('/nialarm/v1/query-instances-with-filter'),
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
            .calledWith(requestMatching({ url: '/nialarm/v1/query-instances-with-filter' }))
            .mockReturnValueOnce(createFetchError(status));

          await expect(datastore.queryAlarmsWrapper({})).rejects.toThrow(expectedErrorMessage);

          expect(publishMock).toHaveBeenCalledWith({
            type: 'alert-error',
            payload: ['Error during alarms query', expectedErrorMessage],
          });
        });
      });

      it('should handle 429 error', async () => {
        const expectedErrorMessage = 'The query to fetch alarms failed due to too many requests. Please try again later.';
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
        backendServer.fetch
          .calledWith(requestMatching({ url: '/nialarm/v1/query-instances-with-filter' }))
          .mockImplementation(() => {
            throw new Error('Error');
          });

        await expect(datastore.queryAlarmsWrapper({})).rejects.toThrow(expectedErrorMessage);

        expect(publishMock).toHaveBeenCalledWith({
          type: 'alert-error',
          payload: ['Error during alarms query', expectedErrorMessage],
        });
      });
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
