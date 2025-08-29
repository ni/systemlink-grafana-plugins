import { MockProxy } from 'jest-mock-extended';
import { AlarmsCountDataSource } from './AlarmsCountDataSource';
import { BackendSrv } from '@grafana/runtime';
import { setupDataSource } from 'test/fixtures';
import { DataQueryRequest } from '@grafana/data';

let datastore: AlarmsCountDataSource, backendServer: MockProxy<BackendSrv>;

describe('AlarmsCountDataSource', () => {
  beforeEach(() => {
    [datastore, backendServer] = setupDataSource(AlarmsCountDataSource);
  });

  it('should set defaultQuery to an empty object', () => {
    const defaultQuery = datastore.defaultQuery;
    
    expect(defaultQuery).toEqual({});
  });

  describe('runQuery', () => {
    it('should return empty fields', async () => {
      const query = { refId: 'A' };
      const dataQueryRequest = {} as DataQueryRequest;

      const result = await datastore.runQuery(query, dataQueryRequest);

      expect(result).toEqual({ refId: 'A', fields: [] });
    });
  });

  describe('shouldRunQuery', () => {
    test('should return true', () => {
      expect(datastore.shouldRunQuery()).toBe(true);
    });
  });
});
