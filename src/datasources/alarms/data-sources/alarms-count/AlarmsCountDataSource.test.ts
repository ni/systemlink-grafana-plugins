import { AlarmsCountDataSource } from './AlarmsCountDataSource';
import { setupDataSource } from 'test/fixtures';
import { DataQueryRequest } from '@grafana/data';

let datastore: AlarmsCountDataSource;

describe('AlarmsCountDataSource', () => {
  beforeEach(() => {
    [datastore] = setupDataSource(AlarmsCountDataSource);
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
    it('should return true', () => {
      expect(datastore.shouldRunQuery()).toBe(true);
    });
  });
});
