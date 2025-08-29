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

  it('should initialize baseUrl and queryAlarms url properties', () => {
    expect(datastore.baseUrl).toBe(`${datastore.instanceSettings.url}/nialarm/v1`);
    expect(datastore.queryAlarmsUrl).toEqual(`${datastore.instanceSettings.url}/nialarm/v1/query-instances-with-filter`);
  });

  describe('runQuery', () => {
    it('should call alarmsCountDataSource runQuery', async () => {
      const query = { refId: 'A' };
      const dataQueryRequest = {} as DataQueryRequest;
      const alarmsCountDataSource = datastore.alarmsCountDataSource;
      alarmsCountDataSource.runQuery = jest.fn().mockResolvedValue({ refId: "A", fields: [] });

      const result = await datastore.runQuery(query, dataQueryRequest);

      expect(alarmsCountDataSource.runQuery).toHaveBeenCalledWith(query, dataQueryRequest);
      expect(result).toEqual({ refId: "A", fields: [] });
    });
  });

  describe('shouldRunQuery', () => {
    test('should call alarmsCountDataSource shouldRunQuery', () => {
      const alarmsCountDataSource = datastore.alarmsCountDataSource;
      alarmsCountDataSource.shouldRunQuery = jest.fn().mockReturnValue(true);

      const result = datastore.shouldRunQuery();

      expect(alarmsCountDataSource.shouldRunQuery).toHaveBeenCalled();
      expect(result).toBe(true);
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
