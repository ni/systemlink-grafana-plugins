import { AlarmsCountDataSource } from './AlarmsCountDataSource';
import { createFetchError, createFetchResponse, requestMatching, setupDataSource } from 'test/fixtures';
import { DataQueryRequest } from '@grafana/data';
import { QueryAlarmsResponse, QueryType } from 'datasources/alarms/types/types';
import { MockProxy } from 'jest-mock-extended';
import { BackendSrv } from '@grafana/runtime';

let datastore: AlarmsCountDataSource, backendServer: MockProxy<BackendSrv>;

const mockAlarmResponse: QueryAlarmsResponse = {
  totalCount: 10,
  continuationToken: '',
};

describe('AlarmsCountDataSource', () => {
  beforeEach(() => {
    [datastore, backendServer] = setupDataSource(AlarmsCountDataSource);

    backendServer.fetch
    .calledWith(requestMatching({ url: '/nialarm/v1/query-instances-with-filter' }))
    .mockReturnValue(createFetchResponse(mockAlarmResponse));
  });

  it('should set defaultAlarmsCountQuery to defaultQuery', () => {
    const defaultQuery = datastore.defaultQuery;
    
    expect(defaultQuery).toEqual({ queryType: QueryType.AlarmsCount });
  });

  describe('runQuery', () => {
    it('should call query alarms API with take as 1 and returnCount as true', async () => {
      const query = { refId: 'A' };
      const dataQueryRequest = {} as DataQueryRequest;
      await datastore.runQuery(query, dataQueryRequest);

      expect(backendServer.fetch).toHaveBeenCalledWith(
        expect.objectContaining({
          url: expect.stringContaining('/nialarm/v1/query-instances-with-filter'),
          method: 'POST',
          data: { take: 1, returnCount: true },
          showErrorAlert: false
        })
      );
    });
    
    it('should return totalCount response from API', async () => {
      const query = { refId: 'A' };
      const dataQueryRequest = {} as DataQueryRequest;

      const result = await datastore.runQuery(query, dataQueryRequest);

      expect(result).toEqual({ refId: 'A', name: 'A', fields: [{ name: 'A', type: 'number', values: [10] }] });
    });

    it('should return 0 when totalCount is undefined', async () => {
      backendServer.fetch
      .calledWith(requestMatching({ url: '/nialarm/v1/query-instances-with-filter' }))
      .mockReturnValue(createFetchResponse({ totalCount: undefined }));
      const query = { refId: 'A' };
      const dataQueryRequest = {} as DataQueryRequest;

      const result = await datastore.runQuery(query, dataQueryRequest);

      expect(result).toEqual({ refId: 'A', name: 'A', fields: [{ name: 'A', type: 'number', values: [0] }] });
    });

    describe('error handling', () => {
      const query = { refId: 'A' };
      const dataQueryRequest = {} as DataQueryRequest;
      const publishMock = jest.fn();

      beforeEach(() => {
        (datastore as any).appEvents = { publish: publishMock };
      });

      const testCases = [
        {
          status: 404,
          expectedErrorMessage: 'The query to fetch alarms failed because the requested resource was not found. Please check the query parameters and try again.'
        },
        {
          status: 504,
          expectedErrorMessage: 'The query to fetch alarms experienced a timeout error. Narrow your query with a more specific filter and try again.'
        },
        {
          status: 500,
          expectedErrorMessage: 'The query failed due to the following error: (status 500) \"Error\".'
        },
      ];

      testCases.forEach(({ status, expectedErrorMessage }) => {
        it('should handle ' + status + ' error', async () => {
          backendServer.fetch
            .calledWith(requestMatching({ url: '/nialarm/v1/query-instances-with-filter' }))
            .mockReturnValueOnce(createFetchError(status));

          await expect(datastore.runQuery(query, dataQueryRequest))
            .rejects
            .toThrow(expectedErrorMessage);

          expect(publishMock).toHaveBeenCalledWith({
            type: 'alert-error',
            payload: ['Error during alarms query', expectedErrorMessage]
          });
        });
      });

      it('should handle 429 error', async () => {
        const expectedErrorMessage = 'The query to fetch alarms failed due to too many requests. Please try again later.';
        jest.spyOn(datastore, 'post').mockImplementation(() => {
          throw new Error('Request failed with status code: 429');
        });

        await expect(datastore.queryAlarms({})).rejects.toThrow(expectedErrorMessage);

        expect(publishMock).toHaveBeenCalledWith({
          type: 'alert-error',
          payload: ['Error during alarms query', expectedErrorMessage]
        });
      });

      it('should handle unknown errors', async () => {
        const expectedErrorMessage = 'The query failed due to an unknown error.';
        backendServer.fetch
          .calledWith(requestMatching({ url: '/nialarm/v1/query-instances-with-filter' }))
          .mockImplementation(() => { throw new Error('Error'); });

        await expect(datastore.runQuery(query, dataQueryRequest))
          .rejects
          .toThrow(expectedErrorMessage);

        expect(publishMock).toHaveBeenCalledWith({
          type: 'alert-error',
          payload: ['Error during alarms query', expectedErrorMessage]
        });
      });
    });
  });

  describe('shouldRunQuery', () => {
    it('should return true', () => {
      const query = { refId: 'A' };

      expect(datastore.shouldRunQuery(query)).toBe(true);
    });
  });
});
