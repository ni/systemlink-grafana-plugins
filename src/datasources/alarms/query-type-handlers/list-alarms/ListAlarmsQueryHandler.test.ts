import { createFetchError, createFetchResponse, requestMatching, setupDataSource } from 'test/fixtures';
import { ListAlarmsQueryHandler } from './ListAlarmsQueryHandler';
import { Alarm, AlarmsVariableQuery, AlarmTransitionType, QueryAlarmsResponse, QueryType } from '../../types/types';
import { DataQueryRequest, LegacyMetricFindQueryOptions } from '@grafana/data';
import { QUERY_ALARMS_RELATIVE_PATH } from 'datasources/alarms/constants/QueryAlarms.constants';
import { BackendSrv } from '@grafana/runtime';
import { MockProxy } from 'jest-mock-extended';

let datastore: ListAlarmsQueryHandler, backendServer: MockProxy<BackendSrv>;

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

describe('ListAlarmsQueryHandler', () => {
  beforeEach(() => {
    [datastore, backendServer] = setupDataSource(ListAlarmsQueryHandler);

    backendServer.fetch
      .calledWith(requestMatching({ url: QUERY_ALARMS_RELATIVE_PATH }))
      .mockReturnValue(createFetchResponse(mockAlarmResponse));
  });

  it('should set defaultListAlarmsQuery to defaultQuery', () => {
    const defaultQuery = datastore.defaultQuery;

    expect(defaultQuery).toEqual({ queryType: QueryType.ListAlarms });
  });

  describe('runQuery', () => {
    const query = { refId: 'A', queryType: QueryType.ListAlarms };
    const dataQueryRequest = {} as DataQueryRequest;

    it('should return empty value with refId and name from query', async () => {
      const result = await datastore.runQuery(query, dataQueryRequest);

      expect(result).toEqual({ refId: 'A', name: 'A', fields: [{ name: 'A', values: [] }] });
    });
  });


  describe('metricFindQuery', () => {
    let options: LegacyMetricFindQueryOptions;

    const mockMetricResponse: QueryAlarmsResponse = {
      alarms: [
        {
          ...sampleAlarm,
          alarmId: 'ALARM-001',
          displayName: 'High Temperature Alarm',
        },
        {
          ...sampleAlarm,
          alarmId: 'ALARM-002',
          displayName: 'Low Pressure Alarm',
        },
        {
          ...sampleAlarm,
          alarmId: 'ALARM-003',
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

    it('should return alarms in "displayName (alarmId)" format when no filter is provided', async () => {
      const query: AlarmsVariableQuery = {
        refId: 'A',
        filter: undefined
      };

      const result = await datastore.metricFindQuery(query, options);

      expect(result).toEqual([
        { text: 'High Temperature Alarm (ALARM-001)', value: 'ALARM-001' },
        { text: 'Low Pressure Alarm (ALARM-002)', value: 'ALARM-002' },
        { text: 'System Error Alarm (ALARM-003)', value: 'ALARM-003' }
      ]);

      expect(backendServer.fetch).toHaveBeenCalledWith(
        expect.objectContaining({
          url: expect.stringContaining(QUERY_ALARMS_RELATIVE_PATH),
          method: 'POST',
          data: {
            filter: '',
            orderByDescending: true,
            returnMostRecentlyOccurredOnly: true,
            take: 1000
          },
          showErrorAlert: false
        })
      );
    });

    it('should return filtered alarms when filter is provided', async () => {
      const query: AlarmsVariableQuery = {
        refId: 'A',
        filter: 'workspace = "Lab-1"'
      };

      const result = await datastore.metricFindQuery(query, options);

      expect(result).toEqual([
        { text: 'High Temperature Alarm (ALARM-001)', value: 'ALARM-001' },
        { text: 'Low Pressure Alarm (ALARM-002)', value: 'ALARM-002' },
        { text: 'System Error Alarm (ALARM-003)', value: 'ALARM-003' }
      ]);

      expect(backendServer.fetch).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            filter: 'workspace = "Lab-1"'
          })
        })
      );
    });

    it('should replace template variables in filter', async () => {
      const query: AlarmsVariableQuery = {
        refId: 'A',
        filter: 'workspace = "$workspace"'
      };

      jest.spyOn(datastore.templateSrv, 'replace').mockReturnValue('workspace = "Lab-1"');

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
        filter: 'nonexistent = "filter"'
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
        filter: 'workspace = "Lab-1"'
      };

      const result = await datastore.metricFindQuery(query, options);

      expect(result).toEqual([]);
    });

    it('should sort results alphabetically by text', async () => {
      const unsortedResponse: QueryAlarmsResponse = {
        alarms: [
          { ...sampleAlarm, alarmId: 'ALARM-003', displayName: 'Z Last Alarm' },
          { ...sampleAlarm, alarmId: 'ALARM-001', displayName: 'A First Alarm' },
          { ...sampleAlarm, alarmId: 'ALARM-002', displayName: 'M Middle Alarm' }
        ],
        totalCount: 3
      };

      backendServer.fetch
        .calledWith(requestMatching({ url: QUERY_ALARMS_RELATIVE_PATH }))
        .mockReturnValue(createFetchResponse(unsortedResponse));

      const query: AlarmsVariableQuery = {
        refId: 'A',
        filter: undefined
      };

      const result = await datastore.metricFindQuery(query, options);

      expect(result).toEqual([
        { text: 'A First Alarm (ALARM-001)', value: 'ALARM-001' },
        { text: 'M Middle Alarm (ALARM-002)', value: 'ALARM-002' },
        { text: 'Z Last Alarm (ALARM-003)', value: 'ALARM-003' }
      ]);
    });

    it('should handle undefined options gracefully', async () => {
      const query: AlarmsVariableQuery = {
        refId: 'A',
        filter: 'workspace = "Lab-1"'
      };
      const options = undefined;

      const result = await datastore.metricFindQuery(query, options);

      expect(result).toEqual([
        { text: 'High Temperature Alarm (ALARM-001)', value: 'ALARM-001' },
        { text: 'Low Pressure Alarm (ALARM-002)', value: 'ALARM-002' },
        { text: 'System Error Alarm (ALARM-003)', value: 'ALARM-003' }
      ]);
    });
  });
});
