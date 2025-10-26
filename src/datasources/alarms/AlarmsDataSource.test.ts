import { BackendSrv } from '@grafana/runtime';
import { MockProxy } from 'jest-mock-extended';
import { setupDataSource, requestMatching, createFetchResponse, createFetchError } from 'test/fixtures';
import { AlarmsDataSource } from './AlarmsDataSource';
import { DataQueryRequest } from '@grafana/data';
import { QueryType } from './types/types';
import { AlarmsCountQueryHandler } from './query-type-handlers/alarms-count/AlarmsCountQueryHandler';
import { QUERY_ALARMS_RELATIVE_PATH } from './constants/QueryAlarms.constants';

let datastore: AlarmsDataSource, backendServer: MockProxy<BackendSrv>;

describe('AlarmsDataSource', () => {
  const dataQueryRequest = {} as DataQueryRequest;

  beforeEach(() => {
    [datastore, backendServer] = setupDataSource(AlarmsDataSource);
  });

  it('should initialize with AlarmsCount as the default query', () => {
    expect(datastore.defaultQuery).toEqual({ queryType: QueryType.AlarmsCount });
  });

  describe('AlarmsCountQueryHandler', () => {
    const query = { refId: 'A', queryType: QueryType.AlarmsCount };

    let alarmsCountQueryHandler: AlarmsCountQueryHandler;
    
    beforeEach(() => {
      alarmsCountQueryHandler = datastore.alarmsCountQueryHandler;
    });

    describe('runQuery', () => {
      it('should call AlarmsCountQueryHandler runQuery when queryType is AlarmsCount', async () => {
        alarmsCountQueryHandler.runQuery = jest.fn().mockResolvedValue({ refId: 'A', fields: [] });

        const result = await datastore.runQuery(query, dataQueryRequest);

        expect(alarmsCountQueryHandler.runQuery).toHaveBeenCalledWith(query, dataQueryRequest);
        expect(result).toEqual({ refId: 'A', fields: [] });
      });
    });

    describe('shouldRunQuery', () => {
      it('should call AlarmsCountQueryHandler shouldRunQuery when queryType is AlarmsCount', () => {
        alarmsCountQueryHandler.shouldRunQuery = jest.fn().mockReturnValue(true);

        const result = datastore.shouldRunQuery(query);

        expect(alarmsCountQueryHandler.shouldRunQuery).toHaveBeenCalled();
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
        .calledWith(requestMatching({ url: QUERY_ALARMS_RELATIVE_PATH }))
        .mockReturnValue(createFetchResponse('testData'));

      const response = await datastore.testDatasource();

      expect(backendServer.fetch).toHaveBeenCalledWith(
        expect.objectContaining({
          url: `${datastore.instanceSettings.url}${QUERY_ALARMS_RELATIVE_PATH}`,
        })
      );
      expect(response.status).toEqual('success');
    });

    it('bubbles up exception', async () => {
      backendServer.fetch
        .calledWith(requestMatching({ url: QUERY_ALARMS_RELATIVE_PATH }))
        .mockReturnValue(createFetchError(400));

      await expect(datastore.testDatasource()).rejects.toThrow(
        `Request to url "${QUERY_ALARMS_RELATIVE_PATH}" failed with status code: 400. Error message: "Error"`
      );
    });
  });
});
