import { BackendSrv } from '@grafana/runtime';
import { MockProxy } from 'jest-mock-extended';
import { setupDataSource, requestMatching, createFetchResponse, createFetchError } from 'test/fixtures';
import { AlarmsDataSource } from './AlarmsDataSource';
import { DataQueryRequest } from '@grafana/data';

let datastore: AlarmsDataSource, backendServer: MockProxy<BackendSrv>;

describe('AlarmsDataSource', () => {
  beforeEach(() => {
    [datastore, backendServer] = setupDataSource(AlarmsDataSource);
  });

  it('should initializes baseUrl and queryAlarms properties', () => {
    expect(datastore.baseUrl).toBe(datastore.instanceSettings.url + '/nialarm/v1');
    expect(datastore.queryAlarms).toEqual(datastore.instanceSettings.url + '/nialarm/v1/query-instances-with-filter');
  });

  describe('runQuery', () => {
    it('should return empty fields', async () => {
      const query = { refId: 'A' };
      const dataQueryRequest = {} as DataQueryRequest;
      const result = await datastore.runQuery(query, dataQueryRequest);
      expect(result).toEqual({ refId: "A", fields: [] });
    });
  });

  describe('shouldRunQuery', () => {
    test('should return true', () => {
      const query = { refId: 'A' };
      expect(datastore.shouldRunQuery(query)).toBe(true);
    });
  });

  describe('testDataSource', () => {
    test('returns success', async () => {
      backendServer.fetch
        .calledWith(requestMatching({ url: '/nialarm/v1/query-instances-with-filter' }))
        .mockReturnValue(createFetchResponse('testData'));

      const response = await datastore.testDatasource();

      expect(response.status).toEqual('success');
    });

    test('bubbles up exception', async () => {
      backendServer.fetch
        .calledWith(requestMatching({ url: '/nialarm/v1/query-instances-with-filter' }))
        .mockReturnValue(createFetchError(400));

      await expect(datastore.testDatasource()).rejects.toThrow(
        'Request to url "/nialarm/v1/query-instances-with-filter" failed with status code: 400. Error message: "Error"'
      );
    });
  });
});
