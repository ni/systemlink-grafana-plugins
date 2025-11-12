import { AlarmsTrendQueryHandler } from './AlarmsTrendQueryHandler';
import { createFetchResponse, requestMatching, setupDataSource } from 'test/fixtures';
import { DataQueryRequest, FieldType } from '@grafana/data';
import { QueryAlarmsResponse, Alarm, AlarmTransitionType, TransitionInclusionOption } from 'datasources/alarms/types/types';
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
      severityLevel: 0,
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
    
    expect(defaultQuery).toEqual({ filter: '' });
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

      const expectedFilterPattern = /^\(\(active = "true" && mostRecentSetOccurredAt < "2025-01-01T10:00:00\.000Z"\) \|\| \(occurredAt < "2025-01-01T10:00:00\.000Z" && mostRecentTransitionOccurredAt > "2025-01-01T11:00:00\.000Z"\) \|\| \(occurredAt >= "2025-01-01T10:00:00\.000Z" && occurredAt <= "2025-01-01T11:00:00\.000Z"\) \|\| \(mostRecentTransitionOccurredAt >= "2025-01-01T10:00:00\.000Z" && mostRecentTransitionOccurredAt <= "2025-01-01T11:00:00\.000Z"\)\)$/;
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

      const expectedFilterPattern = /^\(\(active = "true" && mostRecentSetOccurredAt < "2025-01-01T10:00:00\.000Z"\) \|\| \(occurredAt < "2025-01-01T10:00:00\.000Z" && mostRecentTransitionOccurredAt > "2025-01-01T11:00:00\.000Z"\) \|\| \(occurredAt >= "2025-01-01T10:00:00\.000Z" && occurredAt <= "2025-01-01T11:00:00\.000Z"\) \|\| \(mostRecentTransitionOccurredAt >= "2025-01-01T10:00:00\.000Z" && mostRecentTransitionOccurredAt <= "2025-01-01T11:00:00\.000Z"\)\) && \(severity = "HIGH"\)$/;
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
        name: 'A',
        fields: [
          {
            name: 'Time',
            type: FieldType.time,
            values: expect.any(Array)
          },
          {
            name: 'Count',
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
              severityLevel: 0,
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
              severityLevel: 0,
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
              severityLevel: 0,
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

      expect(result.fields?.[0]?.values?.length).toEqual(121); // 1 hour / 30 seconds = 120 intervals + 1(last edge point);
    });

    it('should maintain alarm state transitions over time intervals', async () => {
      const alarmWithMultipleTransitions = buildAlarmsResponse([
        {
          alarmId: 'ALARM-001',
          transitions: [
            {
              transitionType: AlarmTransitionType.Set,
              occurredAt: '2025-01-01T10:10:00.000Z',
              severityLevel: 3,
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
              severityLevel: 0,
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

    it('should handle edge cases including boundary conditions, out-of-range transitions, and timing scenarios', async () => {
      const startTime = new Date('2025-01-01T10:00:00.000Z');
      const endTime = new Date('2025-01-01T11:00:00.000Z');
      const intervalMs = 300000; // 5 minutes
      
      jest.spyOn(datastore.templateSrv, 'replace')
        .mockImplementation((template?: string) => {
          if (template === '${__from:date}') {
            return startTime.toISOString();
          }
          if (template === '${__to:date}') {
            return endTime.toISOString();
          }
          return template || '';
        });

      const edgeCaseAlarms = buildAlarmsResponse([
        // Case 1: Alarm set exactly at start boundary
        {
          alarmId: 'BOUNDARY-START-SET',
          transitions: [
            {
              transitionType: AlarmTransitionType.Set,
              occurredAt: '2025-01-01T10:00:00.000Z', // Exactly at start
              severityLevel: 1,
              value: 'Low',
              condition: 'Boundary Start Set',
              shortText: 'Set at start',
              detailText: 'Alarm set exactly at query start time',
              keywords: ['boundary', 'start'],
              properties: {}
            }
          ]
        },
        
        // Case 2: Alarm cleared exactly at end boundary
        {
          alarmId: 'BOUNDARY-END-CLEAR',
          transitions: [
            {
              transitionType: AlarmTransitionType.Set,
              occurredAt: '2025-01-01T09:30:00.000Z', // Before range
              severityLevel: 2,
              value: 'Moderate',
              condition: 'Pre-range Set',
              shortText: 'Set before range',
              detailText: 'Alarm set before query range',
              keywords: ['pre-range'],
              properties: {}
            },
            {
              transitionType: AlarmTransitionType.Clear,
              occurredAt: '2025-01-01T11:00:00.000Z', // Exactly at end
              severityLevel: 0,
              value: 'Clear',
              condition: 'Boundary End Clear',
              shortText: 'Clear at end',
              detailText: 'Alarm cleared exactly at query end time',
              keywords: ['boundary', 'end'],
              properties: {}
            }
          ]
        },

        // Case 3: Alarm created outside range, transitioned within range
        {
          alarmId: 'OUTSIDE-TO-INSIDE',
          transitions: [
            {
              transitionType: AlarmTransitionType.Set,
              occurredAt: '2025-01-01T09:00:00.000Z', // Way before range
              severityLevel: 3,
              value: 'High',
              condition: 'Outside Creation',
              shortText: 'Created outside',
              detailText: 'Alarm created outside query range',
              keywords: ['outside'],
              properties: {}
            },
            {
              transitionType: AlarmTransitionType.Clear,
              occurredAt: '2025-01-01T10:30:00.000Z', // Within range
              severityLevel: 0,
              value: 'Clear',
              condition: 'Inside Clear',
              shortText: 'Cleared inside',
              detailText: 'Alarm cleared within query range',
              keywords: ['inside'],
              properties: {}
            },
            {
              transitionType: AlarmTransitionType.Set,
              occurredAt: '2025-01-01T10:45:00.000Z', // Within range
              severityLevel: 2,
              value: 'Moderate',
              condition: 'Inside Set',
              shortText: 'Set inside',
              detailText: 'Alarm set again within query range',
              keywords: ['inside'],
              properties: {}
            }
          ]
        },

        // Case 4: Alarm created within range, transitioned after range
        {
          alarmId: 'INSIDE-TO-OUTSIDE',
          transitions: [
            {
              transitionType: AlarmTransitionType.Set,
              occurredAt: '2025-01-01T10:15:00.000Z', // Within range
              severityLevel: 4,
              value: 'Critical',
              condition: 'Inside Creation',
              shortText: 'Created inside',
              detailText: 'Alarm created within query range',
              keywords: ['inside'],
              properties: {}
            },
            {
              transitionType: AlarmTransitionType.Clear,
              occurredAt: '2025-01-01T12:00:00.000Z', // After range
              severityLevel: 0,
              value: 'Clear',
              condition: 'Outside Clear',
              shortText: 'Cleared outside',
              detailText: 'Alarm cleared after query range',
              keywords: ['outside'],
              properties: {}
            }
          ]
        },

        // Case 5: Multiple rapid transitions at same timestamp
        {
          alarmId: 'RAPID-TRANSITIONS',
          transitions: [
            {
              transitionType: AlarmTransitionType.Set,
              occurredAt: '2025-01-01T10:20:00.000Z',
              severityLevel: 1,
              value: 'Low',
              condition: 'Rapid 1',
              shortText: 'Rapid set 1',
              detailText: 'First rapid transition',
              keywords: ['rapid'],
              properties: {}
            },
            {
              transitionType: AlarmTransitionType.Clear,
              occurredAt: '2025-01-01T10:20:00.000Z', // Same timestamp
              severityLevel: 0,
              value: 'Clear',
              condition: 'Rapid Clear',
              shortText: 'Rapid clear',
              detailText: 'Rapid clear transition',
              keywords: ['rapid'],
              properties: {}
            },
            {
              transitionType: AlarmTransitionType.Set,
              occurredAt: '2025-01-01T10:20:00.000Z', // Same timestamp
              severityLevel: 3,
              value: 'High',
              condition: 'Rapid 2',
              shortText: 'Rapid set 2',
              detailText: 'Second rapid transition',
              keywords: ['rapid'],
              properties: {}
            }
          ]
        },

        // Case 6: Alarm with transitions only outside the range
        {
          alarmId: 'COMPLETELY-OUTSIDE',
          transitions: [
            {
              transitionType: AlarmTransitionType.Set,
              occurredAt: '2025-01-01T08:00:00.000Z', // Before range
              severityLevel: 2,
              value: 'Moderate',
              condition: 'Outside Set',
              shortText: 'Set outside',
              detailText: 'Set before range',
              keywords: ['outside'],
              properties: {}
            },
            {
              transitionType: AlarmTransitionType.Clear,
              occurredAt: '2025-01-01T12:30:00.000Z', // After range
              severityLevel: 0,
              value: 'Clear',
              condition: 'Outside Clear',
              shortText: 'Clear outside',
              detailText: 'Cleared after range',
              keywords: ['outside'],
              properties: {}
            }
          ]
        },

        // Case 7: Alarm at exact interval boundaries
        {
          alarmId: 'INTERVAL-BOUNDARY',
          transitions: [
            {
              transitionType: AlarmTransitionType.Set,
              occurredAt: '2025-01-01T10:05:00.000Z', // Exactly at interval boundary (5min)
              severityLevel: 1,
              value: 'Low',
              condition: 'Interval Boundary',
              shortText: 'Set at interval',
              detailText: 'Set exactly at interval boundary',
              keywords: ['interval'],
              properties: {}
            },
            {
              transitionType: AlarmTransitionType.Clear,
              occurredAt: '2025-01-01T10:35:00.000Z', // Exactly at another interval boundary
              severityLevel: 0,
              value: 'Clear',
              condition: 'Interval Boundary Clear',
              shortText: 'Clear at interval',
              detailText: 'Cleared exactly at interval boundary',
              keywords: ['interval'],
              properties: {}
            }
          ]
        },

        // Case 8: Alarm with no transitions (edge case)
        {
          alarmId: 'NO-TRANSITIONS',
          transitions: []
        },

        // Case 9: Alarm with single transition exactly at query end
        {
          alarmId: 'END-BOUNDARY-SET',
          transitions: [
            {
              transitionType: AlarmTransitionType.Set,
              occurredAt: '2025-01-01T11:00:00.000Z', // Exactly at end
              severityLevel: 2,
              value: 'Moderate',
              condition: 'End Boundary',
              shortText: 'Set at end',
              detailText: 'Set exactly at query end',
              keywords: ['boundary'],
              properties: {}
            }
          ]
        }
      ]);

      backendServer.fetch
        .calledWith(requestMatching({ url: QUERY_ALARMS_RELATIVE_PATH }))
        .mockReturnValue(createFetchResponse({ 
          alarms: edgeCaseAlarms, 
          totalCount: edgeCaseAlarms.length, 
          continuationToken: '' 
        }));

      const testOptions = {
        ...options,
        intervalMs: intervalMs
      };

      const result = await datastore.runQuery(query, testOptions);

      expect(result.refId).toBe('A');
      expect(result.fields).toHaveLength(2);
      expect(result.fields[0].name).toBe('Time');
      expect(result.fields[1].name).toBe('Count');

      const timeValues = result.fields[0].values as number[];
      const countValues = result.fields[1].values as number[];
      expect(timeValues).toHaveLength(13);
      expect(countValues).toHaveLength(13);

      // Verify time values align with expected intervals
      expect(timeValues[0]).toBe(startTime.getTime());
      expect(timeValues[timeValues.length - 1]).toBe(endTime.getTime());

      // Test specific edge case expectations based on the test data:

      // 1. At start (10:00): 
      // - BOUNDARY-START-SET becomes active at exactly 10:00
      // - BOUNDARY-END-CLEAR was set at 09:30 (before range) so already active
      // - OUTSIDE-TO-INSIDE was set at 09:00 (before range) so already active  
      // - COMPLETELY-OUTSIDE was set at 08:00 (before range) so already active
      expect(countValues[0]).toBe(4);

      // 2. Around 10:05 interval: INTERVAL-BOUNDARY should become active
      expect(countValues[1]).toBe(countValues[0] + 1);

      // 3. Around 10:10 interval: State should remain same as 10:05, no new transitions
      expect(countValues[2]).toBe(countValues[1]);

      // 4. Around 10:15 interval: INSIDE-TO-OUTSIDE should become active
      expect(countValues[3]).toBe(countValues[2] + 1);

      // 5. Around 10:20 interval: RAPID-TRANSITIONS final state should be Set (after Set->Clear->Set at same time)
      expect(countValues[4]).toBe(countValues[3] + 1);

      // 6. Around 10:25 interval: All alarms from previous intervals should still be active
      expect(countValues[5]).toBe(countValues[4]);

      // 7. Around 10:30 interval: OUTSIDE-TO-INSIDE should be cleared
      expect(countValues[6]).toBe(countValues[4] - 1);

      // 8. Around 10:35 interval: INTERVAL-BOUNDARY should be cleared  
      expect(countValues[7]).toBe(countValues[6] - 1);

      // 9. Around 10:40 interval: State should remain same as 10:35, no new transitions
      expect(countValues[8]).toBe(countValues[7]);

      // 10. Around 10:45 interval: OUTSIDE-TO-INSIDE should be set again
      expect(countValues[9]).toBe(countValues[7] + 1);

      // 11. Around 10:50 interval: State should remain same as 10:45, no new transitions
      expect(countValues[10]).toBe(countValues[9]);

      // 12. Around 10:55 interval: State should remain same as 10:50, no new transitions
      expect(countValues[11]).toBe(countValues[10]);

      // 13. At end (11:00): 
      // - BOUNDARY-END-CLEAR should be cleared at exactly 11:00
      // - END-BOUNDARY-SET occurs at exactly 11:00
      expect(countValues[12]).toBe(countValues[11]);
    });
  });
});
