import { AlarmsTrendQueryHandler } from './AlarmsTrendQueryHandler';
import { createFetchResponse, requestMatching, setupDataSource } from 'test/fixtures';
import { DataQueryRequest, FieldType } from '@grafana/data';
import { QueryAlarmsResponse, Alarm, AlarmTransitionType, TransitionInclusionOption, AlarmTransitionSeverityLevel } from 'datasources/alarms/types/types';
import { MockProxy } from 'jest-mock-extended';
import { BackendSrv } from '@grafana/runtime';
import { QUERY_ALARMS_RELATIVE_PATH } from 'datasources/alarms/constants/QueryAlarms.constants';
import { AlarmsTrendQuery } from 'datasources/alarms/types/AlarmsTrend.types';

let datastore: AlarmsTrendQueryHandler, backendServer: MockProxy<BackendSrv>;

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
      occurredAt: '2025-01-01T10:15:00.000Z',
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
    {
      transitionType: AlarmTransitionType.Clear,
      occurredAt: '2025-01-01T10:45:00.000Z',
      severityLevel: AlarmTransitionSeverityLevel.Low,
      value: 'Normal',
      condition: 'Temperature',
      shortText: 'Temp Normal',
      detailText: 'Temperature returned to normal',
      keywords: ['temperature', 'normal'],
      properties: {
        sensorId: 'SENSOR-12',
      },
    },
  ],
  transitionOverflowCount: 0,
  currentSeverityLevel: 3,
  highestSeverityLevel: 3,
  mostRecentSetOccurredAt: '2025-01-01T10:15:00.000Z',
  mostRecentTransitionOccurredAt: '2025-01-01T10:45:00.000Z',
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

function buildAlarmsResponse(alarms: Array<Partial<Alarm>>): Alarm[] {
  return alarms.map((partialAlarm, index) => ({
    ...sampleAlarm,
    instanceId: `INST-${String(index + 1).padStart(3, '0')}`,
    alarmId: `ALARM-${String(index + 1).padStart(3, '0')}`,
    ...partialAlarm,
  }));
}

describe('AlarmsTrendQueryHandler', () => {
  let query: AlarmsTrendQuery;
  let options: DataQueryRequest;

  beforeEach(() => {
    query = { refId: 'A', filter: '' };
    options = {
      scopedVars: {},
      intervalMs: 60000,
      requestId: 'test-request',
      timezone: 'UTC',
      app: 'dashboard',
      startTime: Date.now() - 3600000,
      range: {
        from: { valueOf: () => Date.now() - 3600000 },
        to: { valueOf: () => Date.now() },
        raw: { from: 'now-1h', to: 'now' }
      }
    } as DataQueryRequest;

    [datastore, backendServer] = setupDataSource(AlarmsTrendQueryHandler);

    backendServer.fetch
      .calledWith(requestMatching({ url: QUERY_ALARMS_RELATIVE_PATH }))
      .mockReturnValue(createFetchResponse(mockAlarmResponse));

    jest.spyOn(datastore.templateSrv, 'replace')
      .mockImplementation((template?: string) => {
        if (template === '${__from:date}') {
          return '2025-01-01T10:00:00.000Z';
        }
        if (template === '${__to:date}') {
          return '2025-01-01T11:00:00.000Z';
        }
        return template || '';
      });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should set defaultAlarmsTrendQuery to defaultQuery', () => {
    const defaultQuery = datastore.defaultQuery;

    expect(defaultQuery).toEqual({ filter: '', groupBySeverity: true });
  });

  describe('runQuery', () => {
    it('should call the query alarms API with transition inclusion option', async () => {
      await datastore.runQuery(query, options);

      expect(backendServer.fetch).toHaveBeenCalledWith(
        expect.objectContaining({
          url: expect.stringContaining(QUERY_ALARMS_RELATIVE_PATH),
          method: 'POST',
          data: expect.objectContaining({
            transitionInclusionOption: TransitionInclusionOption.All
          }),
          showErrorAlert: false
        })
      );
    });

    it('should include complete default trend filter structure in API request', async () => {
      const emptyFilterQuery = { refId: 'A', filter: '' };

      await datastore.runQuery(emptyFilterQuery, options);

      const expectedFilterPattern = /^\(\(active = "true" && mostRecentSetOccurredAt < "2025-01-01T10:00:00\.000Z"\) \|\| \(occurredAt > "2025-01-01T10:00:00\.000Z" && occurredAt < "2025-01-01T11:00:00\.000Z"\) \|\|\(mostRecentTransitionOccurredAt > "2025-01-01T10:00:00\.000Z" && mostRecentTransitionOccurredAt < "2025-01-01T11:00:00\.000Z"\) \|\| \(occurredAt < "2025-01-01T10:00:00\.000Z" && mostRecentTransitionOccurredAt > "2025-01-01T11:00:00\.000Z"\)\)$/;
      expect(backendServer.fetch).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            filter: expect.stringMatching(expectedFilterPattern)
          })
        })
      );
    });

    it('should combine custom filter with default trend filter using AND operator', async () => {
      const customFilterQuery = { refId: 'A', filter: 'severity = "HIGH"' };

      await datastore.runQuery(customFilterQuery, options);

      const expectedFilterPattern = /^\(\(active = "true" && mostRecentSetOccurredAt < "2025-01-01T10:00:00\.000Z"\) \|\| \(occurredAt > "2025-01-01T10:00:00\.000Z" && occurredAt < "2025-01-01T11:00:00\.000Z"\) \|\|\(mostRecentTransitionOccurredAt > "2025-01-01T10:00:00\.000Z" && mostRecentTransitionOccurredAt < "2025-01-01T11:00:00\.000Z"\) \|\| \(occurredAt < "2025-01-01T10:00:00\.000Z" && mostRecentTransitionOccurredAt > "2025-01-01T11:00:00\.000Z"\)\) && \(severity = "HIGH"\)$/;
      expect(backendServer.fetch).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            filter: expect.stringMatching(expectedFilterPattern)
          })
        })
      );
    });

    it('should return correct data frame structure for trend query', async () => {
      const result = await datastore.runQuery(query, options);

      expect(result).toEqual({
        refId: 'A',
        name: 'Alarms Trend',
        fields: [
          {
            name: 'Time',
            type: FieldType.time,
            values: expect.any(Array)
          },
          {
            name: 'Alarms Count',
            type: FieldType.number,
            values: expect.any(Array)
          }
        ]
      });
      expect(result.fields?.[0]?.values?.length).toBe(result.fields?.[1]?.values?.length);
    });

    it('should handle empty alarms response', async () => {
      backendServer.fetch
        .calledWith(requestMatching({ url: QUERY_ALARMS_RELATIVE_PATH }))
        .mockReturnValue(createFetchResponse({ alarms: [], totalCount: 0, continuationToken: '' }));

      const result = await datastore.runQuery(query, options);

      expect(result.fields?.[0]?.values?.length).toBeGreaterThan(0);
      expect(result.fields?.[1]?.values?.every((count: number) => count === 0)).toBe(true);
      expect(result.fields?.[0]?.values?.length).toBe(result.fields?.[1]?.values?.length);
    });

    it('should process multiple alarms with different transitions', async () => {
      const multipleAlarms = buildAlarmsResponse([
        {
          alarmId: 'ALARM-001',
          transitions: [
            {
              transitionType: AlarmTransitionType.Set,
              occurredAt: '2025-01-01T10:10:00.000Z',
              severityLevel: AlarmTransitionSeverityLevel.High,
              value: '',
              condition: '',
              shortText: '',
              detailText: '',
              keywords: [],
              properties: {}
            }
          ]
        },
        {
          alarmId: 'ALARM-002',
          transitions: [
            {
              transitionType: AlarmTransitionType.Set,
              occurredAt: '2025-01-01T10:20:00.000Z',
              severityLevel: AlarmTransitionSeverityLevel.High,
              value: '',
              condition: '',
              shortText: '',
              detailText: '',
              keywords: [],
              properties: {}
            },
            {
              transitionType: AlarmTransitionType.Clear,
              occurredAt: '2025-01-01T10:40:00.000Z',
              severityLevel: AlarmTransitionSeverityLevel.Low,
              value: '',
              condition: '',
              shortText: '',
              detailText: '',
              keywords: [],
              properties: {}
            }
          ]
        }
      ]);

      backendServer.fetch
        .calledWith(requestMatching({ url: QUERY_ALARMS_RELATIVE_PATH }))
        .mockReturnValue(createFetchResponse({ alarms: multipleAlarms, totalCount: 2, continuationToken: '' }));

      const result = await datastore.runQuery(query, options);

      const actualCounts = result.fields[1].values as number[];
      const maxCount = Math.max(...actualCounts);
      expect(actualCounts.some(count => count > 0)).toBe(true);
      expect(maxCount).toBeLessThanOrEqual(2);
    });

    it('should handle alarms without transitions', async () => {
      const alarmsWithoutTransitions = buildAlarmsResponse([
        { alarmId: 'ALARM-001', transitions: [] },
        { alarmId: 'ALARM-002', transitions: undefined }
      ]);
      backendServer.fetch
        .calledWith(requestMatching({ url: QUERY_ALARMS_RELATIVE_PATH }))
        .mockReturnValue(createFetchResponse({ 
          alarms: alarmsWithoutTransitions, 
          totalCount: 2, 
          continuationToken: '' 
        }));

      const result = await datastore.runQuery(query, options);

      expect(result.refId).toBe('A');
      expect(result.fields?.[0]?.values?.length).toBeGreaterThan(0);
      expect(result.fields?.[1]?.values?.every((count: number) => count === 0)).toBe(true);
      expect(result.fields?.[0]?.values?.length).toBe(result.fields?.[1]?.values?.length);
    });

    it('should use template service for time range replacement', async () => {
      await datastore.runQuery(query, options);

      expect(datastore.templateSrv.replace).toHaveBeenCalledWith('${__from:date}', options.scopedVars);
      expect(datastore.templateSrv.replace).toHaveBeenCalledWith('${__to:date}', options.scopedVars);
    });

    it('should handle different interval sizes', async () => {
      const shortIntervalOptions = { ...options, intervalMs: 30000 };

      const result = await datastore.runQuery(query, shortIntervalOptions);

      expect(result.fields?.[0]?.values?.length).toEqual(120); // 1 hour / 30 seconds = 120 intervals
    });

    it('should maintain alarm state transitions over time intervals', async () => {
      const alarmWithMultipleTransitions = buildAlarmsResponse([
        {
          alarmId: 'ALARM-001',
          transitions: [
            {
              transitionType: AlarmTransitionType.Set,
              occurredAt: '2025-01-01T10:10:00.000Z',
              severityLevel: AlarmTransitionSeverityLevel.High,
              value: 'High',
              condition: 'Temperature',
              shortText: 'Temp High',
              detailText: 'Temperature exceeded threshold',
              keywords: ['temperature', 'high'],
              properties: { sensorId: 'SENSOR-12' }
            },
            {
              transitionType: AlarmTransitionType.Clear,
              occurredAt: '2025-01-01T10:30:00.000Z',
              severityLevel: AlarmTransitionSeverityLevel.High,
              value: 'Normal',
              condition: 'Temperature',
              shortText: 'Temp Normal',
              detailText: 'Temperature returned to normal',
              keywords: ['temperature', 'normal'],
              properties: { sensorId: 'SENSOR-12' }
            },
            {
              transitionType: AlarmTransitionType.Set,
              occurredAt: '2025-01-01T10:50:00.000Z',
              severityLevel: 2,
              value: 'Medium',
              condition: 'Temperature',
              shortText: 'Temp Medium',
              detailText: 'Temperature above normal but below high threshold',
              keywords: ['temperature', 'medium'],
              properties: { sensorId: 'SENSOR-12' }
            }
          ]
        }
      ]);
      backendServer.fetch
        .calledWith(requestMatching({ url: QUERY_ALARMS_RELATIVE_PATH }))
        .mockReturnValue(createFetchResponse({ 
          alarms: alarmWithMultipleTransitions, 
          totalCount: 1, 
          continuationToken: '' 
        }));

      const result = await datastore.runQuery(query, options);

      const counts = result.fields[1].values as number[];
      expect(counts).toEqual(expect.arrayContaining([0, 1]));
      expect(counts.length).toBeGreaterThan(0);
      expect(new Set(counts).size).toBe(2);
    });
  });
});
