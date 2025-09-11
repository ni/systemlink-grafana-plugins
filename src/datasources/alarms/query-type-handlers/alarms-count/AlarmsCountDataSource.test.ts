import { AlarmsCountDataSource } from './AlarmsCountDataSource';
import { setupDataSource } from 'test/fixtures';
import { DataQueryRequest } from '@grafana/data';
import { QueryType } from 'datasources/alarms/types/types';

let datastore: AlarmsCountDataSource;

describe('AlarmsCountDataSource', () => {
  beforeEach(() => {
    [datastore] = setupDataSource(AlarmsCountDataSource);
  });

  it('should set defaultAlarmsCountQuery to defaultQuery', () => {
    const defaultQuery = datastore.defaultQuery;
    
    expect(defaultQuery).toEqual({ queryType: QueryType.AlarmsCount });
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
      const query = { refId: 'A' };

      expect(datastore.shouldRunQuery(query)).toBe(true);
    });
  });
});
