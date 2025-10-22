import { AlarmsCountDataSource } from './AlarmsCountDataSource';
import { createFetchResponse, createFetchError, requestMatching, setupDataSource } from 'test/fixtures';
import { DataQueryRequest, LegacyMetricFindQueryOptions } from '@grafana/data';
import { QueryAlarmsResponse, QueryType, Alarm, AlarmTransitionType, AlarmsVariableQuery } from 'datasources/alarms/types/types';
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

    it('should pass the filter to the API', async () => {
      const filterQuery = { refId: 'A', filter: 'alarmId = "test-alarm-123"' };

      await datastore.runQuery(filterQuery, dataQueryRequest);

      expect(backendServer.fetch).toHaveBeenCalledWith(
        expect.objectContaining({
          url: expect.stringContaining(QUERY_ALARMS_RELATIVE_PATH),
          method: 'POST',
          data: { filter: 'alarmId = "test-alarm-123"', take: 1, returnCount: true },
          showErrorAlert: false
        })
      );
    });

    it('should pass the transformed filter to the API', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2025-01-01'));
      const filterQuery = { refId: 'A', filter: 'acknowledgedAt > "${__now:date}"'};

      await datastore.runQuery(filterQuery, dataQueryRequest);

      expect(backendServer.fetch).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            filter: `acknowledgedAt > "2025-01-01T00:00:00.000Z"`,
          }),
        })
      );

      jest.useRealTimers();
    })
  });

  describe('metricFindQuery', () => {
    let options: LegacyMetricFindQueryOptions;
    
    const mockMetricResponse: QueryAlarmsResponse = {
      alarms: [
        {
          ...sampleAlarm,
          instanceId: 'INST-001',
          displayName: 'High Temperature Alarm',
        },
        {
          ...sampleAlarm,
          instanceId: 'INST-002',
          displayName: 'Low Pressure Alarm',
        },
        {
          ...sampleAlarm,
          instanceId: 'INST-003',
          displayName: 'System Error Alarm',
        }
      ],
      totalCount: 3
    };

    beforeEach(() => {
      options = {
        scopedVars: { workspace: { value: 'Lab-1' } }
      };

      backendServer.fetch
        .calledWith(requestMatching({ url: QUERY_ALARMS_RELATIVE_PATH }))
        .mockReturnValue(createFetchResponse(mockMetricResponse));
    });

    it('should return alarms in "displayName (instanceId)" format when no filter is provided', async () => {
      const query: AlarmsVariableQuery = {
        refId: 'A',
        queryBy: undefined
      };

      const result = await datastore.metricFindQuery(query, options);

      expect(result).toEqual([
        { text: 'High Temperature Alarm (INST-001)', value: 'INST-001' },
        { text: 'Low Pressure Alarm (INST-002)', value: 'INST-002' },
        { text: 'System Error Alarm (INST-003)', value: 'INST-003' }
      ]);

      expect(backendServer.fetch).toHaveBeenCalledWith(
        expect.objectContaining({
          url: expect.stringContaining(QUERY_ALARMS_RELATIVE_PATH),
          method: 'POST',
          data: {
            filter: undefined,
            take: 1000,
            orderBy: 'occurredAt',
            orderByDescending: true
          },
          showErrorAlert: false
        })
      );
    });

    it('should return filtered alarms when queryBy is provided', async () => {
      const query: AlarmsVariableQuery = {
        refId: 'A',
        queryBy: 'workspace = "Lab-1"'
      };

      const result = await datastore.metricFindQuery(query, options);

      expect(result).toEqual([
        { text: 'High Temperature Alarm (INST-001)', value: 'INST-001' },
        { text: 'Low Pressure Alarm (INST-002)', value: 'INST-002' },
        { text: 'System Error Alarm (INST-003)', value: 'INST-003' }
      ]);

      expect(backendServer.fetch).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            filter: 'workspace = "Lab-1"',
            take: 1000,
            orderBy: 'occurredAt',
            orderByDescending: true
          })
        })
      );
    });

    it('should replace template variables in filter', async () => {
      const query: AlarmsVariableQuery = {
        refId: 'A',
        queryBy: 'workspace = "$workspace"'
      };

      await datastore.metricFindQuery(query, options);

      expect(backendServer.fetch).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            filter: 'workspace = "Lab-1"'
          })
        })
      );
    });

    it('should return empty array when no alarms are returned', async () => {
      backendServer.fetch
        .calledWith(requestMatching({ url: QUERY_ALARMS_RELATIVE_PATH }))
        .mockReturnValue(createFetchResponse({ alarms: [], totalCount: 0 }));

      const query: AlarmsVariableQuery = {
        refId: 'A',
        queryBy: 'nonexistent = "filter"'
      };

      const result = await datastore.metricFindQuery(query, options);

      expect(result).toEqual([]);
    });

    it('should handle API errors gracefully', async () => {
      backendServer.fetch
        .calledWith(requestMatching({ url: QUERY_ALARMS_RELATIVE_PATH }))
        .mockReturnValue(createFetchError(500));

      const query: AlarmsVariableQuery = {
        refId: 'A',
        queryBy: 'workspace = "Lab-1"'
      };

      const result = await datastore.metricFindQuery(query, options);

      expect(result).toEqual([]);
    });

    it('should sort results alphabetically by text', async () => {
      const unsortedResponse: QueryAlarmsResponse = {
        alarms: [
          { ...sampleAlarm, instanceId: 'INST-003', displayName: 'Z Last Alarm' },
          { ...sampleAlarm, instanceId: 'INST-001', displayName: 'A First Alarm' },
          { ...sampleAlarm, instanceId: 'INST-002', displayName: 'M Middle Alarm' }
        ],
        totalCount: 3
      };

      backendServer.fetch
        .calledWith(requestMatching({ url: QUERY_ALARMS_RELATIVE_PATH }))
        .mockReturnValue(createFetchResponse(unsortedResponse));

      const query: AlarmsVariableQuery = {
        refId: 'A',
        queryBy: undefined
      };

      const result = await datastore.metricFindQuery(query, options);

      expect(result).toEqual([
        { text: 'A First Alarm (INST-001)', value: 'INST-001' },
        { text: 'M Middle Alarm (INST-002)', value: 'INST-002' },
        { text: 'Z Last Alarm (INST-003)', value: 'INST-003' }
      ]);
    });

    it('should handle undefined options gracefully', async () => {
      const query: AlarmsVariableQuery = {
        refId: 'A',
        queryBy: 'workspace = "Lab-1"'
      };

      const result = await datastore.metricFindQuery(query);

      expect(result).toEqual([
        { text: 'High Temperature Alarm (INST-001)', value: 'INST-001' },
        { text: 'Low Pressure Alarm (INST-002)', value: 'INST-002' },
        { text: 'System Error Alarm (INST-003)', value: 'INST-003' }
      ]);
    });
  });
});
