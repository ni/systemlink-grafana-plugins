import { setupDataSource } from 'test/fixtures';
import { ListAlarmsQueryHandler } from './ListAlarmsQueryHandler';
import { QueryType } from 'datasources/alarms/types/types';
import { DataQueryRequest } from '@grafana/data';

let datastore: ListAlarmsQueryHandler;

describe('ListAlarmsQueryHandler', () => {
  beforeEach(() => {
    [datastore] = setupDataSource(ListAlarmsQueryHandler);
  });

  it('should set defaultListAlarmsQuery to defaultQuery', () => {
    const defaultQuery = datastore.defaultQuery;

    expect(defaultQuery).toEqual({ queryType: QueryType.ListAlarms, filter: '' });
  });

  describe('runQuery', () => {
    const query = { refId: 'A', queryType: QueryType.ListAlarms };
    const dataQueryRequest = {} as DataQueryRequest;

    it('should return empty value with refId and name from query', async () => {
      const result = await datastore.runQuery(query, dataQueryRequest);

      expect(result).toEqual({ refId: 'A', name: 'A', fields: [{ name: 'A', values: [] }] });
    });
  });
});
