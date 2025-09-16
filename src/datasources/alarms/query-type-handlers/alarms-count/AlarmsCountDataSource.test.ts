import { AlarmsCountDataSource } from './AlarmsCountDataSource';
import { createFetchResponse, requestMatching, setupDataSource } from 'test/fixtures';
import { DataQueryRequest } from '@grafana/data';
import { QueryAlarmsResponse, QueryType } from 'datasources/alarms/types/types';
import { MockProxy } from 'jest-mock-extended';
import { BackendSrv } from '@grafana/runtime';
import { QUERY_ALARMS_RELATIVE_PATH } from 'datasources/alarms/constants/QueryAlarms.constants';

let datastore: AlarmsCountDataSource, backendServer: MockProxy<BackendSrv>;

const mockAlarmResponse: QueryAlarmsResponse = {
  totalCount: 10,
  continuationToken: '',
};

describe('AlarmsCountDataSource', () => {
  beforeEach(() => {
    [datastore, backendServer] = setupDataSource(AlarmsCountDataSource);

    backendServer.fetch
    .calledWith(requestMatching({ url: QUERY_ALARMS_RELATIVE_PATH }))
    .mockReturnValue(createFetchResponse(mockAlarmResponse));
  });

  it('should set defaultAlarmsCountQuery to defaultQuery', () => {
    const defaultQuery = datastore.defaultQuery;
    
    expect(defaultQuery).toEqual({ queryType: QueryType.AlarmsCount });
  });

  describe('runQuery', () => {
    const query = { refId: 'A' };
    const dataQueryRequest = {} as DataQueryRequest;

    it('should call query alarms API with take as 1 and returnCount as true', async () => {
      await datastore.runQuery(query, dataQueryRequest);

      expect(backendServer.fetch).toHaveBeenCalledWith(
        expect.objectContaining({
          url: expect.stringContaining(QUERY_ALARMS_RELATIVE_PATH),
          method: 'POST',
          data: { take: 1, returnCount: true },
          showErrorAlert: false
        })
      );
    });
    
    it('should return totalCount response from API', async () => {
      const result = await datastore.runQuery(query, dataQueryRequest);

      expect(result).toEqual({ refId: 'A', name: 'A', fields: [{ name: 'A', type: 'number', values: [10] }] });
    });

    it('should return 0 when totalCount is undefined', async () => {
      backendServer.fetch
      .calledWith(requestMatching({ url: QUERY_ALARMS_RELATIVE_PATH }))
      .mockReturnValue(createFetchResponse({ totalCount: undefined }));

      const result = await datastore.runQuery(query, dataQueryRequest);

      expect(result).toEqual({ refId: 'A', name: 'A', fields: [{ name: 'A', type: 'number', values: [0] }] });
    });
  });
});
