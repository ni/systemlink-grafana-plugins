import { AlarmsCountDataSource } from './AlarmsCountDataSource';
import { createFetchResponse, requestMatching, setupDataSource } from 'test/fixtures';
import { DataQueryRequest } from '@grafana/data';
import { QueryAlarmsResponse, QueryType, Alarm, AlarmTransitionType } from 'datasources/alarms/types/types';
import { MockProxy } from 'jest-mock-extended';
import { BackendSrv } from '@grafana/runtime';
import { QUERY_ALARMS_RELATIVE_PATH } from 'datasources/alarms/constants/QueryAlarms.constants';

let datastore: AlarmsCountDataSource, backendServer: MockProxy<BackendSrv>;

const sampleAlarm: Alarm = {
  instanceId: 'INST-001',
  alarmId: 'ALARM-001',
  workspace: 'Lab-1',
  active: true,
  clear: false,
  acknowledged: true,
  acknowledgedAt: '2025-09-16T10:30:00Z',
  acknowledgedBy: 'user123',
  occurredAt: '2025-09-16T09:00:00Z',
  updatedAt: '2025-09-16T10:29:00Z',
  createdBy: 'admin',
  transitions: [
    {
      transitionType: AlarmTransitionType.Set,
      occurredAt: '2025-09-16T09:00:00Z',
      severityLevel: 3,
      value: 'High',
      condition: 'Temperature',
      shortText: 'Temp High',
      detailText: 'Temperature exceeded threshold',
      keywords: ['temperature', 'high'],
      properties: {
        sensorId: 'SENSOR-12',
      },
    },
  ],
  transitionOverflowCount: 0,
  currentSeverityLevel: 3,
  highestSeverityLevel: 3,
  mostRecentSetOccurredAt: '2025-09-16T09:00:00Z',
  mostRecentTransitionOccurredAt: '2025-09-16T10:00:00Z',
  channel: 'Main',
  condition: 'Temperature',
  displayName: 'High Temperature Alarm',
  description: 'Alarm triggered when temperature exceeds safe limit.',
  keywords: ['temperature'],
  properties: {
    location: 'Lab-1',
  },
  resourceType: ''
};

const mockAlarmResponse: QueryAlarmsResponse = {
  alarms: [sampleAlarm],
  totalCount: 1,
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

    it('should call the query alarms API with an empty filter, take set to 1 and returnCount set to true by default', async () => {
      await datastore.runQuery(query, dataQueryRequest);

      expect(backendServer.fetch).toHaveBeenCalledWith(
        expect.objectContaining({
          url: expect.stringContaining(QUERY_ALARMS_RELATIVE_PATH),
          method: 'POST',
          data: { filter: '', take: 1, returnCount: true },
          showErrorAlert: false
        })
      );
    });
    
    it('should return totalCount response from API', async () => {
      const result = await datastore.runQuery(query, dataQueryRequest);

      expect(result).toEqual({ refId: 'A', name: 'A', fields: [{ name: 'A', type: 'number', values: [1] }] });
    });

    it('should return 0 when totalCount is undefined', async () => {
      backendServer.fetch
      .calledWith(requestMatching({ url: QUERY_ALARMS_RELATIVE_PATH }))
      .mockReturnValue(createFetchResponse({ totalCount: undefined }));

      const result = await datastore.runQuery(query, dataQueryRequest);

      expect(result).toEqual({ refId: 'A', name: 'A', fields: [{ name: 'A', type: 'number', values: [0] }] });
    });

    it('should transform fields when queryBy ', () => {

    })

    describe('error handling', () => {
      const query = { refId: 'A' };
      const dataQueryRequest = {} as DataQueryRequest;
      const publishMock = jest.fn();

      beforeEach(() => {
        (datastore as any).appEvents = { publish: publishMock };
      });

      const testCases = [
        {
          status: 404,
          expectedErrorMessage: 'The query to fetch alarms failed because the requested resource was not found. Please check the query parameters and try again.'
        },
        {
          status: 504,
          expectedErrorMessage: 'The query to fetch alarms experienced a timeout error. Narrow your query with a more specific filter and try again.'
        },
        {
          status: 500,
          expectedErrorMessage: 'The query failed due to the following error: (status 500) \"Error\".'
        },
      ];

      testCases.forEach(({ status, expectedErrorMessage }) => {
        it('should handle ' + status + ' error', async () => {
          backendServer.fetch
            .calledWith(requestMatching({ url: '/nialarm/v1/query-instances-with-filter' }))
            .mockReturnValueOnce(createFetchError(status));

          await expect(datastore.runQuery(query, dataQueryRequest))
            .rejects
            .toThrow(expectedErrorMessage);

          expect(publishMock).toHaveBeenCalledWith({
            type: 'alert-error',
            payload: ['Error during alarms query', expectedErrorMessage]
          });
        });
      });

      it('should handle 429 error', async () => {
        const expectedErrorMessage = 'The query to fetch alarms failed due to too many requests. Please try again later.';
        jest.spyOn(datastore, 'post').mockImplementation(() => {
          throw new Error('Request failed with status code: 429');
        });

        await expect(datastore.queryAlarms({})).rejects.toThrow(expectedErrorMessage);

        expect(publishMock).toHaveBeenCalledWith({
          type: 'alert-error',
          payload: ['Error during alarms query', expectedErrorMessage]
        });
      });

      it('should handle unknown errors', async () => {
        const expectedErrorMessage = 'The query failed due to an unknown error.';
        backendServer.fetch
          .calledWith(requestMatching({ url: '/nialarm/v1/query-instances-with-filter' }))
          .mockImplementation(() => { throw new Error('Error'); });

        await expect(datastore.runQuery(query, dataQueryRequest))
          .rejects
          .toThrow(expectedErrorMessage);

        expect(publishMock).toHaveBeenCalledWith({
          type: 'alert-error',
          payload: ['Error during alarms query', expectedErrorMessage]
        });
      });
    });
  });

  describe('shouldRunQuery', () => {
    it('should return true', () => {
      const query = { refId: 'A' };

      expect(datastore.shouldRunQuery(query)).toBe(true);
    });
  });
});
