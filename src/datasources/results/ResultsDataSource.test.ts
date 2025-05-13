import { MockProxy } from 'jest-mock-extended';
import { ResultsDataSource } from './ResultsDataSource';
import { BackendSrv } from '@grafana/runtime';
import { createFetchError, createFetchResponse, requestMatching, setupDataSource } from 'test/fixtures';
import { ResultsQuery } from './types/types';
import { DataFrameDTO, DataQueryRequest, LegacyMetricFindQueryOptions } from '@grafana/data';

let datastore: ResultsDataSource, backendServer: MockProxy<BackendSrv>

describe('ResultsDataSource', () => {
  beforeEach(() => {
    [datastore, backendServer] = setupDataSource(ResultsDataSource);
  })

  describe('testDataSource', () => {
    test('returns success', async () => {
      backendServer.fetch
      .calledWith(requestMatching({ url: '/nitestmonitor/v2/results?take=1', method: 'GET' }))
      .mockReturnValue(createFetchResponse('testData'));

      const response = await datastore.testDatasource();

      expect(response.status).toEqual('success');
    });

    test('bubbles up exception', async () => {
      backendServer.fetch
      .calledWith(requestMatching({ url: '/nitestmonitor/v2/results?take=1', method: 'GET' }))
      .mockReturnValue(createFetchError(400));

      await expect(datastore.testDatasource())
      .rejects
      .toThrow('Request to url "/nitestmonitor/v2/results?take=1" failed with status code: 400. Error message: "Error"');
    });
  });

  describe('runQuery', () => {
    test('should call QueryResultsDataSource runQuery when query type is results', async () => {
      const mockQuery: ResultsQuery = { refId: 'A', queryType: 'Results' } as ResultsQuery;
      const mockOptions: DataQueryRequest = {} as DataQueryRequest;
      const mockResponse: DataFrameDTO = { fields: [] };

      const queryResultsDataSource = datastore.queryResultsDataSource;
      queryResultsDataSource.runQuery = jest.fn().mockResolvedValue(mockResponse);

      const result = await datastore.runQuery(mockQuery, mockOptions);

      expect(queryResultsDataSource.runQuery).toHaveBeenCalledWith(mockQuery, mockOptions);
      expect(result).toBe(mockResponse);
    });

    test('should call QueryStepsDataSource runQuery when query type is steps', async () => {
      const mockQuery: ResultsQuery = { refId: 'A', queryType: 'Steps' } as ResultsQuery;
      const mockOptions: DataQueryRequest = {} as DataQueryRequest;
      const mockResponse: DataFrameDTO = { fields: [] };

      const queryStepsDataSource = (datastore as any).queryStepsDataSource;
      queryStepsDataSource.runQuery = jest.fn().mockResolvedValue(mockResponse);

      const result = await datastore.runQuery(mockQuery, mockOptions);

      expect(queryStepsDataSource.runQuery).toHaveBeenCalledWith(mockQuery, mockOptions);
      expect(result).toBe(mockResponse);
    });

    test('should throw error for invalid query type', async () => {
      const mockQuery: ResultsQuery = { refId: 'A', queryType: 'InvalidType' } as unknown as ResultsQuery;
      const mockOptions: DataQueryRequest = {} as DataQueryRequest;

      await expect(datastore.runQuery(mockQuery, mockOptions)).rejects.toThrow('Invalid query type');
    });
  });

  describe('shouldRunQuery', () => {
    test('should call QueryResultsDataSource shouldRunQuery when query type is results', () => {
      const mockQuery: ResultsQuery = { refId: 'A', queryType: 'Results' } as ResultsQuery;

      const queryResultsDataSource = datastore.queryResultsDataSource;
      queryResultsDataSource.shouldRunQuery = jest.fn().mockReturnValue(true);

      const result = datastore.shouldRunQuery(mockQuery);

      expect(queryResultsDataSource.shouldRunQuery).toHaveBeenCalledWith(mockQuery);
      expect(result).toBe(true);
    });

    test('should call QueryStepsDataSource shouldRunQuery when querytype is Steps', () => {
      const mockQuery: ResultsQuery = { refId: 'A', queryType: 'Steps' } as ResultsQuery;

      const queryStepsDataSource = (datastore as any).queryStepsDataSource;
      queryStepsDataSource.shouldRunQuery = jest.fn().mockReturnValue(true);

      const result = datastore.shouldRunQuery(mockQuery);

      expect(queryStepsDataSource.shouldRunQuery).toHaveBeenCalledWith(mockQuery);
      expect(result).toBe(true);
    });

    test('should return false for invalid query type', () => {
      const mockQuery: ResultsQuery = { refId: 'A', queryType: 'InvalidType' } as unknown as ResultsQuery;

      const result = datastore.shouldRunQuery(mockQuery);

      expect(result).toBe(false);
    });
    describe('metricFindQuery', () => {
      test('should call QueryResultsDataSource metricFindQuery with correct arguments', async () => {
        const mockQuery = { properties: 'TestProgramName', queryBy: 'TestProgramName'};
        const mockOptions = { range: {} };
        const mockResponse = [{ text: 'value1', value: '1' }];

        const queryResultsDataSource = datastore.queryResultsDataSource;
        queryResultsDataSource.metricFindQuery = jest.fn().mockResolvedValue(mockResponse);

        const result = await datastore.metricFindQuery(mockQuery, mockOptions as LegacyMetricFindQueryOptions);

        expect(queryResultsDataSource.metricFindQuery).toHaveBeenCalledWith(mockQuery, mockOptions);
        expect(result).toBe(mockResponse);
      });

      test('should call QueryResultsDataSource metricFindQuery with undefined options', async () => {
        const mockQuery = {queryType:'', properties: 'TestProgramName', queryBy: 'TestProgramName'};
        const mockResponse = [{ text: 'value2', value: '2' }];

        const queryResultsDataSource = datastore.queryResultsDataSource;
        queryResultsDataSource.metricFindQuery = jest.fn().mockResolvedValue(mockResponse);

        const result = await datastore.metricFindQuery(mockQuery);

        expect(queryResultsDataSource.metricFindQuery).toHaveBeenCalledWith(mockQuery, undefined);
        expect(result).toBe(mockResponse);
      });
    });
  });

});
