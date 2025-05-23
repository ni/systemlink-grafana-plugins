import { BackendSrv } from '@grafana/runtime';
import { MockProxy } from 'jest-mock-extended';
import { setupDataSource, requestMatching, createFetchResponse, createFetchError } from 'test/fixtures';
import { WorkOrdersDataSource } from './WorkOrdersDataSource';
import { OrderByOptions, OutputType, WorkOrderPropertiesOptions } from './types';

let datastore: WorkOrdersDataSource, backendServer: MockProxy<BackendSrv>;

describe('WorkOrdersDataSource', () => {
  beforeEach(() => {
    [datastore, backendServer] = setupDataSource(WorkOrdersDataSource);
  });

  describe('default query', () => {
    test('default query output type should be properties', async () => {
      const defaultQuery = datastore.defaultQuery;
      expect(defaultQuery.outputType).toEqual(OutputType.Properties);
    });

    test('default query should have default order by value and order by direction', async () => {
      const defaultQuery = datastore.defaultQuery;
      expect(defaultQuery.orderBy).toEqual(OrderByOptions.UPDATED_AT);
      expect(defaultQuery.descending).toEqual(true);
    });

    test('default query should have default properties', async () => {
      const defaultQuery = datastore.defaultQuery;
      expect(defaultQuery.properties).toEqual([
        WorkOrderPropertiesOptions.NAME,
        WorkOrderPropertiesOptions.STATE,
        WorkOrderPropertiesOptions.REQUESTED_BY,
        WorkOrderPropertiesOptions.ASSIGNED_TO,
        WorkOrderPropertiesOptions.EARLIEST_START_DATE,
        WorkOrderPropertiesOptions.DUE_DATE,
        WorkOrderPropertiesOptions.UPDATED_AT,
      ]);
    });
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
