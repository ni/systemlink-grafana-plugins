import { BackendSrv } from '@grafana/runtime';
import { MockProxy } from 'jest-mock-extended';
import { setupDataSource, requestMatching, createFetchResponse, createFetchError } from 'test/fixtures';
import { AlarmsDataSource } from './AlarmsDataSource';
import { DataQueryRequest } from '@grafana/data';
import { QueryType, AlarmsVariableQuery } from './types/types';
import { AlarmsCountDataSource } from './query-type-handlers/alarms-count/AlarmsCountDataSource';
import { QUERY_ALARMS_RELATIVE_PATH } from './constants/QueryAlarms.constants';

let datastore: AlarmsDataSource, backendServer: MockProxy<BackendSrv>;

describe('AlarmsDataSource', () => {
  const dataQueryRequest = {} as DataQueryRequest;

  beforeEach(() => {
    [datastore, backendServer] = setupDataSource(AlarmsDataSource);
  });

  it('should initialize with ListAlarms as the default query', () => {
    expect(datastore.defaultQuery).toEqual({ queryType: QueryType.ListAlarms });
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

  describe('Variable Query Support', () => {
    describe('metricFindQuery', () => {
      it('should delegate to ListAlarmsDataSource', async () => {
        const mockQuery: AlarmsVariableQuery = { refId: 'A', queryBy: 'workspace = "Lab-1"' };
        const mockOptions = { scopedVars: {} };
        const mockResult = [
          { text: 'High Temperature Alarm (INST-001)', value: 'INST-001' }
        ];

        jest.spyOn(datastore.listAlarmsDataSource, 'metricFindQuery').mockResolvedValue(mockResult);

        const result = await datastore.metricFindQuery(mockQuery, mockOptions);

        expect(datastore.listAlarmsDataSource.metricFindQuery).toHaveBeenCalledWith(mockQuery, mockOptions);
        expect(result).toBe(mockResult);
      });

      it('should work without options', async () => {
        const mockQuery: AlarmsVariableQuery = { refId: 'A', queryBy: undefined };
        const mockResult = [
          { text: 'System Error Alarm (INST-002)', value: 'INST-002' }
        ];

        jest.spyOn(datastore.listAlarmsDataSource, 'metricFindQuery').mockResolvedValue(mockResult);

        const result = await datastore.metricFindQuery(mockQuery);

        expect(datastore.listAlarmsDataSource.metricFindQuery).toHaveBeenCalledWith(mockQuery, undefined);
        expect(result).toBe(mockResult);
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
