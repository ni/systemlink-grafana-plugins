import { BackendSrv } from '@grafana/runtime';
import { MockProxy } from 'jest-mock-extended';
import { setupDataSource, requestMatching, createFetchResponse, createFetchError } from 'test/fixtures';
import { AlarmsDataSource } from './AlarmsDataSource';
import { DataQueryRequest } from '@grafana/data';
import { QueryType } from './types/types';
import { AlarmsCountDataSource } from './data-sources/alarms-count/AlarmsCountDataSource';

let datastore: AlarmsDataSource, backendServer: MockProxy<BackendSrv>;

describe('AlarmsDataSource', () => {
  const dataQueryRequest = {} as DataQueryRequest;

  beforeEach(() => {
    [datastore, backendServer] = setupDataSource(AlarmsDataSource);
  });

  it('should initialize baseUrl and queryAlarms url properties', () => {
    expect(datastore.baseUrl).toBe(`${datastore.instanceSettings.url}/nialarm/v1`);
    expect(datastore.queryAlarmsUrl).toEqual(`${datastore.instanceSettings.url}/nialarm/v1/query-instances-with-filter`);
  });

  it('should initialize with AlarmsCount as the default query', () => {
    expect(datastore.defaultQuery).toEqual({ queryType: QueryType.AlarmsCount });
  });

  describe('AlarmsCountDataSource', () => {
    const query = { refId: 'A', queryType: QueryType.AlarmsCount };

    let alarmsCountDataSource: AlarmsCountDataSource;
    
    beforeEach(() => {
      alarmsCountDataSource = datastore.alarmsCountDataSource;
    });

    describe('runQuery', () => {
      it('should call AlarmsCountDataSource runQuery when queryType is AlarmsCount', async () => {
        alarmsCountDataSource.runQuery = jest.fn().mockResolvedValue({ refId: "A", fields: [] });

        const result = await datastore.runQuery(query, dataQueryRequest);

        expect(alarmsCountDataSource.runQuery).toHaveBeenCalledWith(query, dataQueryRequest);
        expect(result).toEqual({ refId: "A", fields: [] });
      });
    });

    describe('shouldRunQuery', () => {
      it('should call AlarmsCountDataSource shouldRunQuery when queryType is AlarmsCount', () => {
        alarmsCountDataSource.shouldRunQuery = jest.fn().mockReturnValue(true);

        const result = datastore.shouldRunQuery(query);

        expect(alarmsCountDataSource.shouldRunQuery).toHaveBeenCalled();
        expect(result).toBe(true);
      });
    });
  });

  describe('Invalid queryType', () => {
    const query = { refId: 'A', queryType: undefined };

    describe('runQuery', () => {
      it('should throw error for an invalid queryType', async () => {  
        const runQueryPromise = datastore.runQuery(query, dataQueryRequest);
  
        await expect(runQueryPromise).rejects.toThrow('Invalid query type');
      });
    });
  
    describe('shouldRunQuery', () => {
      it('should return false for an invalid queryType', () => {
        const result = datastore.shouldRunQuery(query);

        expect(result).toBe(false);
      });
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
