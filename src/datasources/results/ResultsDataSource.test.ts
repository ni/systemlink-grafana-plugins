import { MockProxy } from 'jest-mock-extended';
import { ResultsDataSource } from './ResultsDataSource';
import { BackendSrv } from '@grafana/runtime';
import { createFetchError, createFetchResponse, requestMatching, setupDataSource } from 'test/fixtures';
import { ResultsQuery } from './types/types';
import { DataFrameDTO, DataQueryRequest } from '@grafana/data';

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
    test('calls QueryResultsDataSource runQuery when queryType is Results', async () => {
      const mockQuery: ResultsQuery = { refId: 'A', queryType: 'Results' } as ResultsQuery;
      const mockOptions: DataQueryRequest = {} as DataQueryRequest;
      const mockResponse: DataFrameDTO = { fields: [] };

      const queryResultsDataSource = (datastore as any).queryResultsDataSource;
      queryResultsDataSource.runQuery = jest.fn().mockResolvedValue(mockResponse);

      const result = await datastore.runQuery(mockQuery, mockOptions);

      expect(queryResultsDataSource.runQuery).toHaveBeenCalledWith(mockQuery, mockOptions);
      expect(result).toBe(mockResponse);
    });

    test('calls QueryStepsDataSource runQuery when queryType is Steps', async () => {
      const mockQuery: ResultsQuery = { refId: 'A', queryType: 'Steps' } as ResultsQuery;
      const mockOptions: DataQueryRequest = {} as DataQueryRequest;
      const mockResponse: DataFrameDTO = { fields: [] };

      const queryStepsDataSource = (datastore as any).queryStepsDataSource;
      queryStepsDataSource.runQuery = jest.fn().mockResolvedValue(mockResponse);

      const result = await datastore.runQuery(mockQuery, mockOptions);

      expect(queryStepsDataSource.runQuery).toHaveBeenCalledWith(mockQuery, mockOptions);
      expect(result).toBe(mockResponse);
    });
  });

  describe('shouldRunQuery', () => {
    test('calls QueryResultsDataSource shouldRunQuery when querytype is Results', () => {
      const mockQuery: ResultsQuery = { refId: 'A', queryType: 'Results' } as ResultsQuery;

      const queryResultsDataSource = (datastore as any).queryResultsDataSource;
      queryResultsDataSource.shouldRunQuery = jest.fn().mockReturnValue(true);

      const result = datastore.shouldRunQuery(mockQuery);

      expect(queryResultsDataSource.shouldRunQuery).toHaveBeenCalledWith(mockQuery);
      expect(result).toBe(true);
    });

    test('calls QueryStepsDataSource shouldRunQuery when querytype is Steps', () => {
      const mockQuery: ResultsQuery = { refId: 'A', queryType: 'Steps' } as ResultsQuery;

      const queryStepsDataSource = (datastore as any).queryStepsDataSource;
      queryStepsDataSource.shouldRunQuery = jest.fn().mockReturnValue(true);

      const result = datastore.shouldRunQuery(mockQuery);

      expect(queryStepsDataSource.shouldRunQuery).toHaveBeenCalledWith(mockQuery);
      expect(result).toBe(true);
    });
  });
});
