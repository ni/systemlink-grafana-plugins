import { AlarmsTrendQueryHandler } from './AlarmsTrendQueryHandler';
import { setupDataSource } from 'test/fixtures';
import { DataQueryRequest } from '@grafana/data';

let datastore: AlarmsTrendQueryHandler;

describe('AlarmsTrendQueryHandler', () => {
  beforeEach(() => {
    [datastore] = setupDataSource(AlarmsTrendQueryHandler);
  });

  it('should set defaultAlarmsTrendQuery to defaultQuery', () => {
    const defaultQuery = datastore.defaultQuery;
    
    expect(defaultQuery).toEqual({ filter: '' });
  });

  describe('runQuery', () => {
    const query = { refId: 'A' };
    const dataQueryRequest = {} as DataQueryRequest;

    it('should return empty response with runQuery', async () => {
      const result = await datastore.runQuery(query, dataQueryRequest);

      expect(result).toEqual({ refId: 'A', name: 'A', fields: [{ name: 'A', type: 'number', values: [] }] });
    });
  });
});
