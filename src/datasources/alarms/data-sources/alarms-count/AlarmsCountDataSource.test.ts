import { AlarmsCountDataSource } from './AlarmsCountDataSource';
import { setupDataSource } from 'test/fixtures';
import { DataQueryRequest } from '@grafana/data';
import { defaultAlarmsCountQuery } from 'datasources/alarms/constants/defaultQueries';

let datastore: AlarmsCountDataSource;

describe('AlarmsCountDataSource', () => {
  beforeEach(() => {
    [datastore] = setupDataSource(AlarmsCountDataSource);
  });

  it('should set defaultQuery to defaultAlarmsCountQuery', () => {
    const defaultQuery = datastore.defaultQuery;
    
    expect(defaultQuery).toEqual(defaultAlarmsCountQuery);
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
