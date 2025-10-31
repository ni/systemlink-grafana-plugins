import { BackendSrv } from '@grafana/runtime';
import { MockProxy } from 'jest-mock-extended';
import { setupDataSource, requestMatching, createFetchResponse, createFetchError } from 'test/fixtures';
import { AlarmsDataSource } from './AlarmsDataSource';
import { DataQueryRequest } from '@grafana/data';
import { QueryType, AlarmsVariableQuery } from './types/types';
import { AlarmsCountQueryHandler } from './query-type-handlers/alarms-count/AlarmsCountQueryHandler';
import { QUERY_ALARMS_RELATIVE_PATH } from './constants/QueryAlarms.constants';
import { ListAlarmsQueryHandler } from './query-type-handlers/list-alarms/ListAlarmsQueryHandler';
import { defaultListAlarmsVariableQuery } from './constants/DefaultQueries.constants';

let datastore: AlarmsDataSource, backendServer: MockProxy<BackendSrv>;

describe('AlarmsDataSource', () => {
  const dataQueryRequest = {} as DataQueryRequest;

  beforeEach(() => {
    [datastore, backendServer] = setupDataSource(AlarmsDataSource);
  });

  it('should initialize with ListAlarms as the default query', () => {
    expect(datastore.defaultQuery).toEqual({
      filter: '',
      properties: ['displayName', 'currentSeverityLevel', 'occurredAt', 'source', 'state', 'workspace'],
    });
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

  describe('ListAlarmsQueryHandler', () => {
    const query = { refId: 'A', queryType: QueryType.ListAlarms };

    let listAlarmsQueryHandler: ListAlarmsQueryHandler;

    beforeEach(() => {
      listAlarmsQueryHandler = datastore.listAlarmsQueryHandler;
    });

    describe('runQuery', () => {
      it('should call ListAlarmsQueryHandler runQuery when queryType is ListAlarms', async () => {
        listAlarmsQueryHandler.runQuery = jest.fn().mockResolvedValue({ refId: 'A', fields: [] });

        const result = await datastore.runQuery(query, dataQueryRequest);

        expect(listAlarmsQueryHandler.runQuery).toHaveBeenCalledWith(query, dataQueryRequest);
        expect(result).toEqual({ refId: 'A', fields: [] });
      });
    });

    describe('shouldRunQuery', () => {
      it('should call ListAlarmsQueryHandler shouldRunQuery when queryType is ListAlarms', () => {
        listAlarmsQueryHandler.shouldRunQuery = jest.fn().mockReturnValue(true);

        const result = datastore.shouldRunQuery(query);

        expect(listAlarmsQueryHandler.shouldRunQuery).toHaveBeenCalled();
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

  describe('metricFindQuery', () => {
    it('should delegate to listAlarmsQueryHandler', async () => {
      const mockQuery: AlarmsVariableQuery = {
        refId: 'A',
        filter: 'workspace = "Lab-1"',
        take: 1000,
        descending: true
      };
      const mockOptions = { scopedVars: {} };
      const mockResult = [
        { text: 'High Temperature Alarm (INST-001)', value: 'INST-001' }
      ];

      jest.spyOn(datastore.listAlarmsQueryHandler, 'metricFindQuery').mockResolvedValue(mockResult);

      const result = await datastore.metricFindQuery(mockQuery, mockOptions);

      expect(datastore.listAlarmsQueryHandler.metricFindQuery).toHaveBeenCalledWith(mockQuery, mockOptions);
      expect(result).toBe(mockResult);
    });

    it('should work without options', async () => {
      const mockQuery: AlarmsVariableQuery = {
        refId: 'A',
        filter: undefined,
        take: 1000,
        descending: true
      };
      const mockResult = [
        { text: 'System Error Alarm (INST-002)', value: 'INST-002' }
      ];

      jest.spyOn(datastore.listAlarmsQueryHandler, 'metricFindQuery').mockResolvedValue(mockResult);

      const result = await datastore.metricFindQuery(mockQuery);

      expect(datastore.listAlarmsQueryHandler.metricFindQuery).toHaveBeenCalledWith(mockQuery, undefined);
      expect(result).toBe(mockResult);
    });

    it('should call listAlarmsQueryHandler.metricFindQuery with default query with invalid query param', async () => {
      jest.spyOn(datastore.listAlarmsQueryHandler, 'metricFindQuery');

      await datastore.metricFindQuery('' as any as AlarmsVariableQuery);

      expect(datastore.listAlarmsQueryHandler.metricFindQuery).toHaveBeenCalledWith(defaultListAlarmsVariableQuery, undefined);
    });
  });

  describe('prepareVariableQuery', () => {
    it('should return default variable query when input query is empty', () => {
      const inputQuery: AlarmsVariableQuery = { refId: 'A' };

      const result = datastore.prepareVariableQuery(inputQuery);

      expect(result).toEqual({
        ...defaultListAlarmsVariableQuery,
        refId: 'A'
      });
    });

    it('should preserve refId from input query', () => {
      const inputQuery: AlarmsVariableQuery = { refId: 'B' };
  
      const result = datastore.prepareVariableQuery(inputQuery);
  
      expect(result.refId).toBe('B');
      expect(result).toEqual({
        ...defaultListAlarmsVariableQuery,
        refId: 'B'
      });
    });
  
    it('should merge input query properties with defaults', () => {
      const inputQuery: AlarmsVariableQuery = {
        refId: 'A',
        filter: 'custom filter',
        take: 500
      };
  
      const result = datastore.prepareVariableQuery(inputQuery);
  
      expect(result).toEqual({
        ...defaultListAlarmsVariableQuery,
        refId: 'A',
        filter: 'custom filter',
        take: 500
      });
    });
  
    it('should override default properties with input query properties', () => {
      const inputQuery: AlarmsVariableQuery = {
        refId: 'A',
        descending: !defaultListAlarmsVariableQuery.descending, // Opposite of default
        take: 999,
        filter: 'override filter'
      };
  
      const result = datastore.prepareVariableQuery(inputQuery);
  
      expect(result.descending).toBe(inputQuery.descending);
      expect(result.take).toBe(inputQuery.take);
      expect(result.filter).toBe(inputQuery.filter);
      expect(result.refId).toBe(inputQuery.refId);
    });
  
    it('should handle partial input query', () => {
      const inputQuery: AlarmsVariableQuery = {
        refId: 'C',
        filter: 'partial query'
      };
  
      const result = datastore.prepareVariableQuery(inputQuery);
  
      expect(result).toEqual({
        ...defaultListAlarmsVariableQuery,
        refId: 'C',
        filter: 'partial query'
      });
      expect(result.take).toBe(defaultListAlarmsVariableQuery.take);
      expect(result.descending).toBe(defaultListAlarmsVariableQuery.descending);
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
