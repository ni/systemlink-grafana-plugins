import { BackendSrv } from '@grafana/runtime';
import { MockProxy } from 'jest-mock-extended';
import { setupDataSource, requestMatching, createFetchResponse, createFetchError } from 'test/fixtures';
import { WorkOrdersDataSource } from './WorkOrdersDataSource';

let datastore: WorkOrdersDataSource, backendServer: MockProxy<BackendSrv>;

describe('WorkOrdersDataSource', () => {
  beforeEach(() => {
    [datastore, backendServer] = setupDataSource(WorkOrdersDataSource);
  });

  describe('testDataSource', () => {
    test('returns success', async () => {
      backendServer.fetch
        .calledWith(requestMatching({ url: '/niworkorder/v1/query-workorders' }))
        .mockReturnValue(createFetchResponse('testData'));

      const response = await datastore.testDatasource();

      expect(response.status).toEqual('success');
    });

    test('bubbles up exception', async () => {
      backendServer.fetch
        .calledWith(requestMatching({ url: '/niworkorder/v1/query-workorders' }))
        .mockReturnValue(createFetchError(400));

      await expect(datastore.testDatasource()).rejects.toThrow(
        'Request to url "/niworkorder/v1/query-workorders" failed with status code: 400. Error message: "Error"'
      );
    });
  });
});
