import { BackendSrv } from '@grafana/runtime';
import { MockProxy } from 'jest-mock-extended';
import { setupDataSource, requestMatching, createFetchResponse, createFetchError } from 'test/fixtures';
import { AlarmsDataSource } from './AlarmsDataSource';
import { DataQueryRequest } from '@grafana/data';
import { QueryType } from './types/types';
import { defaultAlarmsCountQuery } from './constants/defaultQueries';

let datastore: AlarmsDataSource, backendServer: MockProxy<BackendSrv>;

describe('AlarmsDataSource', () => {
  beforeEach(() => {
    [datastore, backendServer] = setupDataSource(AlarmsDataSource);
  });

  it('should initialize baseUrl and queryAlarms url properties', () => {
    expect(datastore.baseUrl).toBe(`${datastore.instanceSettings.url}/nialarm/v1`);
    expect(datastore.queryAlarmsUrl).toEqual(`${datastore.instanceSettings.url}/nialarm/v1/query-instances-with-filter`);
  });

  it('should initialize with AlarmsCount as the default query', () => {
    expect(datastore.defaultQuery).toEqual(defaultAlarmsCountQuery);
  });

  describe('runQuery', () => {
    it('should throw error for an invalid queryType', async () => {
      const query = { refId: 'A', queryType: undefined };
      const dataQueryRequest = {} as DataQueryRequest;

      const runQueryPromise = datastore.runQuery(query, dataQueryRequest);

      await expect(runQueryPromise).rejects.toThrow('Invalid query type');
    });

    it('should call AlarmsCountDataSource runQuery when queryType is AlarmsCount', async () => {
      const query = { refId: 'A', queryType: QueryType.AlarmsCount };
      const dataQueryRequest = {} as DataQueryRequest;
      const alarmsCountDataSource = datastore.alarmsCountDataSource;
      alarmsCountDataSource.runQuery = jest.fn().mockResolvedValue({ refId: "A", fields: [] });

      const result = await datastore.runQuery(query, dataQueryRequest);

      expect(alarmsCountDataSource.runQuery).toHaveBeenCalledWith(query, dataQueryRequest);
      expect(result).toEqual({ refId: "A", fields: [] });
    });
  });

  describe('shouldRunQuery', () => {
    it('should return false for an invalid queryType', () => {
      const query = { refId: 'A', queryType: undefined };

      const result = datastore.shouldRunQuery(query);

      expect(result).toBe(false);
    });

    it('should call AlarmsCountDataSource shouldRunQuery when queryType is AlarmsCount', () => {
      const query = { refId: 'A', queryType: QueryType.AlarmsCount };
      const alarmsCountDataSource = datastore.alarmsCountDataSource;
      alarmsCountDataSource.shouldRunQuery = jest.fn().mockReturnValue(true);

      const result = datastore.shouldRunQuery(query);

      expect(alarmsCountDataSource.shouldRunQuery).toHaveBeenCalled();
      expect(result).toBe(true);
    });
  });

  describe('testDataSource', () => {
    it('returns success', async () => {
      backendServer.fetch
        .calledWith(requestMatching({ url: '/nialarm/v1/query-instances-with-filter' }))
        .mockReturnValue(createFetchResponse('testData'));

      const response = await datastore.testDatasource();

      expect(response.status).toEqual('success');
    });

    it('bubbles up exception', async () => {
      backendServer.fetch
        .calledWith(requestMatching({ url: '/nialarm/v1/query-instances-with-filter' }))
        .mockReturnValue(createFetchError(400));

      await expect(datastore.testDatasource()).rejects.toThrow(
        'Request to url "/nialarm/v1/query-instances-with-filter" failed with status code: 400. Error message: "Error"'
      );
    });
  });
});
