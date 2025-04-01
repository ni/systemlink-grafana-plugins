import { MockProxy } from 'jest-mock-extended';
import { ResultsDataSource } from './ResultsDataSource';
import { BackendSrv } from '@grafana/runtime';
import { createFetchError, createFetchResponse, requestMatching, setupDataSource } from 'test/fixtures';

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
});
