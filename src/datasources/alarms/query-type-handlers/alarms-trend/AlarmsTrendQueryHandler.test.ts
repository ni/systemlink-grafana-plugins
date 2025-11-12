import { AlarmsTrendQueryHandler } from './AlarmsTrendQueryHandler';
import { createFetchResponse, requestMatching, setupDataSource } from 'test/fixtures';
import { DataQueryRequest, FieldType } from '@grafana/data';
import { QueryAlarmsResponse, Alarm, AlarmTransitionType, TransitionInclusionOption, AlarmTransitionSeverityLevel } from 'datasources/alarms/types/types';
import { MockProxy } from 'jest-mock-extended';
import { BackendSrv } from '@grafana/runtime';
import { QUERY_ALARMS_RELATIVE_PATH } from 'datasources/alarms/constants/QueryAlarms.constants';
import { AlarmsTrendQuery, AlarmTrendSeverityLevelLabel } from 'datasources/alarms/types/AlarmsTrend.types';

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
      severityLevel: AlarmTransitionSeverityLevel.High,
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

      const expectedFilterPattern = /^\(\(active = "true" && mostRecentSetOccurredAt < "2025-01-01T10:00:00\.000Z"\) \|\| \(occurredAt >= "2025-01-01T10:00:00\.000Z" && occurredAt <= "2025-01-01T11:00:00\.000Z"\) \|\| \(mostRecentTransitionOccurredAt >= "2025-01-01T10:00:00\.000Z" && mostRecentTransitionOccurredAt <= "2025-01-01T11:00:00\.000Z"\) \|\| \(occurredAt < "2025-01-01T10:00:00\.000Z" && mostRecentTransitionOccurredAt > "2025-01-01T11:00:00\.000Z"\)\)$/;
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

      const expectedFilterPattern = /^\(\(active = "true" && mostRecentSetOccurredAt < "2025-01-01T10:00:00\.000Z"\) \|\| \(occurredAt >= "2025-01-01T10:00:00\.000Z" && occurredAt <= "2025-01-01T11:00:00\.000Z"\) \|\| \(mostRecentTransitionOccurredAt >= "2025-01-01T10:00:00\.000Z" && mostRecentTransitionOccurredAt <= "2025-01-01T11:00:00\.000Z"\) \|\| \(occurredAt < "2025-01-01T10:00:00\.000Z" && mostRecentTransitionOccurredAt > "2025-01-01T11:00:00\.000Z"\)\) && \(severity = "HIGH"\)$/;
      expect(backendServer.fetch).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            filter: expect.stringMatching(expectedFilterPattern)
          })
        })
      );
    });

    describe('groupBySeverity is false', () => {
      beforeEach(() => {
        query.groupBySeverity = false;
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
                severityLevel: AlarmTransitionSeverityLevel.High,
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
                severityLevel: AlarmTransitionSeverityLevel.Moderate,
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
                severityLevel: AlarmTransitionSeverityLevel.Clear,
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
                severityLevel: AlarmTransitionSeverityLevel.High,
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
                severityLevel: AlarmTransitionSeverityLevel.Clear,
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
                severityLevel: AlarmTransitionSeverityLevel.Moderate,
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
                severityLevel: AlarmTransitionSeverityLevel.Critical,
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
                severityLevel: AlarmTransitionSeverityLevel.Clear,
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
                severityLevel: AlarmTransitionSeverityLevel.Low,
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
                severityLevel: AlarmTransitionSeverityLevel.Clear,
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
                severityLevel: AlarmTransitionSeverityLevel.High,
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
                severityLevel: AlarmTransitionSeverityLevel.Moderate,
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
                severityLevel: AlarmTransitionSeverityLevel.Clear,
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
                severityLevel: AlarmTransitionSeverityLevel.Low,
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
                severityLevel: AlarmTransitionSeverityLevel.Clear,
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
                severityLevel: AlarmTransitionSeverityLevel.Moderate,
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

    describe('groupBySeverity is true', () => {
      beforeEach(() => {
        query.groupBySeverity = true;
      });

      it('should return correct data frame structure for severity grouped trend query', async () => {
        const result = await datastore.runQuery(query, options);

        expect(result).toEqual({
          refId: 'A',
          name: 'Alarms Trend by Severity',
          fields: [
            {
              name: 'Time',
              type: FieldType.time,
              values: expect.any(Array)
            },
            {
              name: AlarmTrendSeverityLevelLabel.Low,
              type: FieldType.number,
              values: expect.any(Array)
            },
            {
              name: AlarmTrendSeverityLevelLabel.Moderate,
              type: FieldType.number,
              values: expect.any(Array)
            },
            {
              name: AlarmTrendSeverityLevelLabel.High,
              type: FieldType.number,
              values: expect.any(Array)
            },
            {
              name: AlarmTrendSeverityLevelLabel.Critical,
              type: FieldType.number,
              values: expect.any(Array)
            }
          ]
        });
        const fieldLengths = result.fields?.map(field => field.values?.length);
        expect(new Set(fieldLengths).size).toBe(1);
      });

      it('should initialize all severity groups to zero when no alarms', async () => {
        backendServer.fetch
          .calledWith(requestMatching({ url: QUERY_ALARMS_RELATIVE_PATH }))
          .mockReturnValue(createFetchResponse({ alarms: [], totalCount: 0, continuationToken: '' }));

        const result = await datastore.runQuery(query, options);

        const severityFields = result.fields?.slice(1);
        expect(severityFields?.length).toBe(4);
        severityFields?.forEach(field => {
          expect(field.values?.every((count: number) => count === 0)).toBe(true);
        });
      });

      it('should correctly group alarms with different severity levels', async () => {
        const alarmsWithDifferentSeverities = buildAlarmsResponse([
          {
            alarmId: 'ALARM-001',
            transitions: [
              {
                transitionType: AlarmTransitionType.Set,
                occurredAt: '2025-01-01T10:10:00.000Z',
                severityLevel: AlarmTransitionSeverityLevel.Low,
                value: 'Low',
                condition: 'Temperature',
                shortText: 'Temp Low',
                detailText: 'Low temperature alert',
                keywords: ['temperature', 'low'],
                properties: {}
              }
            ]
          },
          {
            alarmId: 'ALARM-002',
            transitions: [
              {
                transitionType: AlarmTransitionType.Set,
                occurredAt: '2025-01-01T10:15:00.000Z',
                severityLevel: AlarmTransitionSeverityLevel.High,
                value: 'High',
                condition: 'Pressure',
                shortText: 'Pressure High',
                detailText: 'High pressure detected',
                keywords: ['pressure', 'high'],
                properties: {}
              }
            ]
          },
          {
            alarmId: 'ALARM-003',
            transitions: [
              {
                transitionType: AlarmTransitionType.Set,
                occurredAt: '2025-01-01T10:20:00.000Z',
                severityLevel: AlarmTransitionSeverityLevel.Critical,
                value: 'Critical',
                condition: 'System',
                shortText: 'System Critical',
                detailText: 'Critical system failure',
                keywords: ['system', 'critical'],
                properties: {}
              }
            ]
          }
        ]);
        backendServer.fetch
          .calledWith(requestMatching({ url: QUERY_ALARMS_RELATIVE_PATH }))
          .mockReturnValue(createFetchResponse({ 
            alarms: alarmsWithDifferentSeverities, 
            totalCount: 3, 
            continuationToken: '' 
          }));

        const result = await datastore.runQuery(query, options);

        const lowField = result.fields?.find(f => f.name === AlarmTrendSeverityLevelLabel.Low);
        const highField = result.fields?.find(f => f.name === AlarmTrendSeverityLevelLabel.High);
        const criticalField = result.fields?.find(f => f.name === AlarmTrendSeverityLevelLabel.Critical);
        expect(lowField?.values?.some((count: number) => count > 0)).toBe(true);
        expect(highField?.values?.some((count: number) => count > 0)).toBe(true);
        expect(criticalField?.values?.some((count: number) => count > 0)).toBe(true);
      });

      it('should handle severity level transitions correctly', async () => {
        const alarmWithSeverityTransitions = buildAlarmsResponse([
          {
            alarmId: 'ALARM-001',
            transitions: [
              {
                transitionType: AlarmTransitionType.Set,
                occurredAt: '2025-01-01T10:10:00.000Z',
                severityLevel: AlarmTransitionSeverityLevel.Low,
                value: 'Low',
                condition: 'Temperature',
                shortText: 'Temp Low',
                detailText: 'Low temperature alert',
                keywords: ['temperature', 'low'],
                properties: {}
              },
              {
                transitionType: AlarmTransitionType.Set,
                occurredAt: '2025-01-01T10:30:00.000Z',
                severityLevel: AlarmTransitionSeverityLevel.High,
                value: 'High',
                condition: 'Temperature',
                shortText: 'Temp High',
                detailText: 'Temperature escalated to high',
                keywords: ['temperature', 'high'],
                properties: {}
              },
              {
                transitionType: AlarmTransitionType.Clear,
                occurredAt: '2025-01-01T10:50:00.000Z',
                severityLevel: AlarmTransitionSeverityLevel.Clear,
                value: 'Clear',
                condition: 'Temperature',
                shortText: 'Temp Clear',
                detailText: 'Temperature returned to normal',
                keywords: ['temperature', 'clear'],
                properties: {}
              }
            ]
          }
        ]);

        backendServer.fetch
          .calledWith(requestMatching({ url: QUERY_ALARMS_RELATIVE_PATH }))
          .mockReturnValue(createFetchResponse({ 
            alarms: alarmWithSeverityTransitions, 
            totalCount: 1, 
            continuationToken: '' 
          }));

        const result = await datastore.runQuery(query, options);

        const lowField = result.fields?.find(f => f.name === AlarmTrendSeverityLevelLabel.Low);
        const highField = result.fields?.find(f => f.name === AlarmTrendSeverityLevelLabel.High);
        expect(lowField?.values?.some((count: number) => count > 0)).toBe(true);
        expect(highField?.values?.some((count: number) => count > 0)).toBe(true);
      });

      it('should handle edge severity levels correctly', async () => {
        const alarmsWithEdgeSeverities = buildAlarmsResponse([
          {
            alarmId: 'ALARM-001',
            transitions: [
              {
                transitionType: AlarmTransitionType.Set,
                occurredAt: '2025-01-01T10:10:00.000Z',
                severityLevel: -1, // Clear
                value: 'Clear',
                condition: 'Test',
                shortText: 'Test Clear',
                detailText: 'Test clear condition',
                keywords: ['test'],
                properties: {}
              }
            ]
          },
          {
            alarmId: 'ALARM-002',
            transitions: [
              {
                transitionType: AlarmTransitionType.Set,
                occurredAt: '2025-01-01T10:15:00.000Z',
                severityLevel: 5 as AlarmTransitionSeverityLevel,
                value: 'Ultra Critical',
                condition: 'System',
                shortText: 'System Ultra Critical',
                detailText: 'Ultra critical system failure',
                keywords: ['system'],
                properties: {}
              }
            ]
          }
        ]);

        backendServer.fetch
          .calledWith(requestMatching({ url: QUERY_ALARMS_RELATIVE_PATH }))
          .mockReturnValue(createFetchResponse({ 
            alarms: alarmsWithEdgeSeverities, 
            totalCount: 2, 
            continuationToken: '' 
          }));

        const result = await datastore.runQuery(query, options);

        const criticalField = result.fields?.find(f => f.name === AlarmTrendSeverityLevelLabel.Critical);
        expect(criticalField?.values?.some((count: number) => count > 0)).toBe(true);
      });

      it('should handle edge cases including boundary conditions, out-of-range transitions, and timing scenarios with severity grouping', async () => {
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
          // Case 1: Alarm set exactly at start boundary - LOW severity
          {
            alarmId: 'BOUNDARY-START-SET',
            transitions: [
              {
                transitionType: AlarmTransitionType.Set,
                occurredAt: '2025-01-01T10:00:00.000Z', // Exactly at start
                severityLevel: AlarmTransitionSeverityLevel.Low,
                value: 'Low',
                condition: 'Boundary Start Set',
                shortText: 'Set at start',
                detailText: 'Alarm set exactly at query start time',
                keywords: ['boundary', 'start'],
                properties: {}
              }
            ]
          },
          
          // Case 2: Alarm cleared exactly at end boundary - MODERATE severity initially
          {
            alarmId: 'BOUNDARY-END-CLEAR',
            transitions: [
              {
                transitionType: AlarmTransitionType.Set,
                occurredAt: '2025-01-01T09:30:00.000Z', // Before range
                severityLevel: AlarmTransitionSeverityLevel.Moderate,
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
                severityLevel: AlarmTransitionSeverityLevel.Clear,
                value: 'Clear',
                condition: 'Boundary End Clear',
                shortText: 'Clear at end',
                detailText: 'Alarm cleared exactly at query end time',
                keywords: ['boundary', 'end'],
                properties: {}
              }
            ]
          },

          // Case 3: Alarm with severity escalation - HIGH to CRITICAL to MODERATE
          {
            alarmId: 'SEVERITY-ESCALATION',
            transitions: [
              {
                transitionType: AlarmTransitionType.Set,
                occurredAt: '2025-01-01T09:00:00.000Z', // Way before range
                severityLevel: AlarmTransitionSeverityLevel.High,
                value: 'High',
                condition: 'Escalation Test',
                shortText: 'Created outside',
                detailText: 'Alarm created outside query range',
                keywords: ['outside'],
                properties: {}
              },
              {
                transitionType: AlarmTransitionType.Set,
                occurredAt: '2025-01-01T10:15:00.000Z', // Within range - escalate to Critical
                severityLevel: AlarmTransitionSeverityLevel.Critical,
                value: 'Critical',
                condition: 'Escalated',
                shortText: 'Escalated to Critical',
                detailText: 'Alarm escalated to critical within query range',
                keywords: ['escalation', 'critical'],
                properties: {}
              },
              {
                transitionType: AlarmTransitionType.Set,
                occurredAt: '2025-01-01T10:45:00.000Z', // Within range - deescalate to Moderate
                severityLevel: AlarmTransitionSeverityLevel.Moderate,
                value: 'Moderate',
                condition: 'Deescalated',
                shortText: 'Deescalated to Moderate',
                detailText: 'Alarm deescalated to moderate within query range',
                keywords: ['deescalation', 'moderate'],
                properties: {}
              }
            ]
          },

          // Case 4: Multiple CRITICAL alarms at different times
          {
            alarmId: 'CRITICAL-EARLY',
            transitions: [
              {
                transitionType: AlarmTransitionType.Set,
                occurredAt: '2025-01-01T10:05:00.000Z', // Within range
                severityLevel: AlarmTransitionSeverityLevel.Critical,
                value: 'Critical',
                condition: 'Early Critical',
                shortText: 'Critical early',
                detailText: 'Critical alarm early in range',
                keywords: ['critical', 'early'],
                properties: {}
              }
            ]
          },

          // Case 5: Multiple rapid severity transitions at same timestamp
          {
            alarmId: 'RAPID-SEVERITY-TRANSITIONS',
            transitions: [
              {
                transitionType: AlarmTransitionType.Set,
                occurredAt: '2025-01-01T10:20:00.000Z',
                severityLevel: AlarmTransitionSeverityLevel.Low,
                value: 'Low',
                condition: 'Rapid 1',
                shortText: 'Rapid set 1',
                detailText: 'First rapid transition',
                keywords: ['rapid'],
                properties: {}
              },
              {
                transitionType: AlarmTransitionType.Set,
                occurredAt: '2025-01-01T10:20:00.000Z', // Same timestamp - escalate to High
                severityLevel: AlarmTransitionSeverityLevel.High,
                value: 'High',
                condition: 'Rapid 2',
                shortText: 'Rapid escalation',
                detailText: 'Rapid escalation to high',
                keywords: ['rapid'],
                properties: {}
              },
              {
                transitionType: AlarmTransitionType.Clear,
                occurredAt: '2025-01-01T10:35:00.000Z', // Later cleared
                severityLevel: AlarmTransitionSeverityLevel.Clear,
                value: 'Clear',
                condition: 'Rapid Clear',
                shortText: 'Rapid clear',
                detailText: 'Rapid clear transition',
                keywords: ['rapid'],
                properties: {}
              }
            ]
          },

          // Case 6: LOW severity alarm spanning entire range
          {
            alarmId: 'SPANNING-LOW',
            transitions: [
              {
                transitionType: AlarmTransitionType.Set,
                occurredAt: '2025-01-01T08:00:00.000Z', // Before range
                severityLevel: AlarmTransitionSeverityLevel.Low,
                value: 'Low',
                condition: 'Spanning Low',
                shortText: 'Set outside',
                detailText: 'Low severity set before range',
                keywords: ['outside', 'low'],
                properties: {}
              },
              {
                transitionType: AlarmTransitionType.Clear,
                occurredAt: '2025-01-01T12:30:00.000Z', // After range
                severityLevel: AlarmTransitionSeverityLevel.Clear,
                value: 'Clear',
                condition: 'Spanning Clear',
                shortText: 'Clear outside',
                detailText: 'Cleared after range',
                keywords: ['outside'],
                properties: {}
              }
            ]
          },

          // Case 7: HIGH severity at exact interval boundary
          {
            alarmId: 'INTERVAL-BOUNDARY-HIGH',
            transitions: [
              {
                transitionType: AlarmTransitionType.Set,
                occurredAt: '2025-01-01T10:25:00.000Z', // Exactly at 25min interval boundary
                severityLevel: AlarmTransitionSeverityLevel.High,
                value: 'High',
                condition: 'Interval Boundary High',
                shortText: 'Set at interval',
                detailText: 'High severity set exactly at interval boundary',
                keywords: ['interval', 'high'],
                properties: {}
              }
            ]
          },

          // Case 8: Edge severity levels - including negative and high values
          {
            alarmId: 'EDGE-SEVERITIES',
            transitions: [
              {
                transitionType: AlarmTransitionType.Clear,
                occurredAt: '2025-01-01T10:30:00.000Z',
                severityLevel: AlarmTransitionSeverityLevel.Clear,
                value: 'Edge Case',
                condition: 'Edge Test',
                shortText: 'Edge severity',
                detailText: 'Edge case with unusual severity',
                keywords: ['edge'],
                properties: {}
              },
              {
                transitionType: AlarmTransitionType.Set,
                occurredAt: '2025-01-01T10:40:00.000Z',
                severityLevel: 10 as AlarmTransitionSeverityLevel, // Should map to Critical (>=4)
                value: 'Ultra High',
                condition: 'Ultra High Test',
                shortText: 'Ultra high severity',
                detailText: 'Ultra high severity level',
                keywords: ['ultra'],
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
        expect(result.fields).toHaveLength(5); // Time + 4 severity groups
        expect(result.fields[0].name).toBe('Time');
        expect(result.fields[1].name).toBe(AlarmTrendSeverityLevelLabel.Low);
        expect(result.fields[2].name).toBe(AlarmTrendSeverityLevelLabel.Moderate);
        expect(result.fields[3].name).toBe(AlarmTrendSeverityLevelLabel.High);
        expect(result.fields[4].name).toBe(AlarmTrendSeverityLevelLabel.Critical);

        const timeValues = result.fields[0].values as number[];
        const lowValues = result.fields[1].values as number[];
        const moderateValues = result.fields[2].values as number[];
        const highValues = result.fields[3].values as number[];
        const criticalValues = result.fields[4].values as number[];

        expect(timeValues).toHaveLength(13);
        expect(lowValues).toHaveLength(13);
        expect(moderateValues).toHaveLength(13);
        expect(highValues).toHaveLength(13);
        expect(criticalValues).toHaveLength(13);

        // Verify time values align with expected intervals
        expect(timeValues[0]).toBe(startTime.getTime());
        expect(timeValues[timeValues.length - 1]).toBe(endTime.getTime());

        // Test specific edge case expectations based on the test data:

        // 1. At start (10:00): 
        // - BOUNDARY-START-SET becomes active at exactly 10:00 (Low severity)
        // - BOUNDARY-END-CLEAR was set at 09:30 (before range) so already active (Moderate severity)  
        // - SEVERITY-ESCALATION was set at 09:00 (before range) so already active (High severity)
        // - SPANNING-LOW was set at 08:00 (before range) so already active (Low severity)
        expect(lowValues[0]).toBe(2); // BOUNDARY-START-SET + SPANNING-LOW
        expect(moderateValues[0]).toBe(1); // BOUNDARY-END-CLEAR
        expect(highValues[0]).toBe(1); // SEVERITY-ESCALATION
        expect(criticalValues[0]).toBe(0); // No critical alarms yet

        // 2. Around 10:05 interval: CRITICAL-EARLY should become active
        expect(lowValues[1]).toBe(lowValues[0]); // No change in low severity
        expect(moderateValues[1]).toBe(moderateValues[0]); // No change in moderate severity
        expect(highValues[1]).toBe(highValues[0]); // No change in high severity  
        expect(criticalValues[1]).toBe(1); // CRITICAL-EARLY becomes active

        // 3. Around 10:15 interval: SEVERITY-ESCALATION should escalate from High to Critical
        expect(lowValues[3]).toBe(lowValues[1]); // No change in low severity
        expect(moderateValues[3]).toBe(moderateValues[1]); // No change in moderate severity
        expect(highValues[3]).toBe(highValues[1] - 1); // SEVERITY-ESCALATION moves from High...
        expect(criticalValues[3]).toBe(criticalValues[1] + 1); // ...to Critical

        // 4. Around 10:20 interval: RAPID-SEVERITY-TRANSITIONS final state should be High (Low->High at same timestamp)
        expect(lowValues[4]).toBe(lowValues[3]); // No net change (Low alarm added and immediately moved to High)
        expect(moderateValues[4]).toBe(moderateValues[3]); // No change in moderate severity
        expect(highValues[4]).toBe(highValues[3] + 1); // RAPID-SEVERITY-TRANSITIONS ends up as High
        expect(criticalValues[4]).toBe(criticalValues[3]); // No change in critical severity

        // 5. Around 10:25 interval: INTERVAL-BOUNDARY-HIGH should become active
        expect(lowValues[5]).toBe(lowValues[4]); // No change in low severity
        expect(moderateValues[5]).toBe(moderateValues[4]); // No change in moderate severity
        expect(highValues[5]).toBe(highValues[4] + 1); // INTERVAL-BOUNDARY-HIGH becomes active
        expect(criticalValues[5]).toBe(criticalValues[4]); // No change in critical severity

        // 6. Around 10:30 interval: EDGE-SEVERITIES first transition (severity -1, but Set transition so treated as alarm)
        // Note: Severity -1 maps to Clear group, but since it's a Set transition, behavior depends on implementation
        expect(lowValues[6]).toBe(lowValues[5]); // Depends on how -1 severity is handled
        expect(moderateValues[6]).toBe(moderateValues[5]); // No change expected
        expect(highValues[6]).toBe(highValues[5]); // No change expected
        expect(criticalValues[6]).toBe(criticalValues[5]); // No change expected

        // 7. Around 10:35 interval: RAPID-SEVERITY-TRANSITIONS should be cleared
        expect(lowValues[7]).toBe(lowValues[6]); // No change in low severity
        expect(moderateValues[7]).toBe(moderateValues[6]); // No change in moderate severity
        expect(highValues[7]).toBe(highValues[6] - 1); // RAPID-SEVERITY-TRANSITIONS cleared from High
        expect(criticalValues[7]).toBe(criticalValues[6]); // No change in critical severity

        // 8. Around 10:40 interval: EDGE-SEVERITIES second transition (severity 10 -> Critical)
        expect(lowValues[8]).toBe(lowValues[7]); // No change in low severity
        expect(moderateValues[8]).toBe(moderateValues[7]); // No change in moderate severity  
        expect(highValues[8]).toBe(highValues[7]); // No change in high severity
        expect(criticalValues[8]).toBe(criticalValues[7] + 1); // EDGE-SEVERITIES becomes Critical

        // 9. Around 10:45 interval: SEVERITY-ESCALATION should deescalate from Critical to Moderate
        expect(lowValues[9]).toBe(lowValues[8]); // No change in low severity
        expect(moderateValues[9]).toBe(moderateValues[8] + 1); // SEVERITY-ESCALATION moves to Moderate
        expect(highValues[9]).toBe(highValues[8]); // No change in high severity
        expect(criticalValues[9]).toBe(criticalValues[8] - 1); // SEVERITY-ESCALATION moves from Critical

        // 10-12. No more transitions until end
        expect(lowValues[10]).toBe(lowValues[9]);
        expect(moderateValues[10]).toBe(moderateValues[9]);
        expect(highValues[10]).toBe(highValues[9]);
        expect(criticalValues[10]).toBe(criticalValues[9]);
        expect(lowValues[11]).toBe(lowValues[10]);
        expect(moderateValues[11]).toBe(moderateValues[10]);
        expect(highValues[11]).toBe(highValues[10]);
        expect(criticalValues[11]).toBe(criticalValues[10]);

        // 13. At end (11:00): BOUNDARY-END-CLEAR should be cleared from Moderate
        expect(lowValues[12]).toBe(lowValues[11]); // No change in low severity
        expect(moderateValues[12]).toBe(moderateValues[11] - 1); // BOUNDARY-END-CLEAR cleared from Moderate
        expect(highValues[12]).toBe(highValues[11]); // No change in high severity
        expect(criticalValues[12]).toBe(criticalValues[11]); // No change in critical severity
      });
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
              severityLevel: AlarmTransitionSeverityLevel.Clear,
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
              severityLevel: AlarmTransitionSeverityLevel.Critical,
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

      query.groupBySeverity = false;
      const result = await datastore.runQuery(query, options);

      const counts = result.fields[1].values as number[];
      expect(counts).toEqual(expect.arrayContaining([0, 1]));
      expect(counts.length).toBeGreaterThan(0);
      expect(new Set(counts).size).toBe(2);
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

      query.groupBySeverity = false;
      const ungroupedResult = await datastore.runQuery(query, options);

      expect(ungroupedResult.refId).toBe('A');
      expect(ungroupedResult.fields?.[0]?.values?.length).toBeGreaterThan(0);
      expect(ungroupedResult.fields?.[1]?.values?.every((count: number) => count === 0)).toBe(true);
      expect(ungroupedResult.fields?.[0]?.values?.length).toBe(ungroupedResult.fields?.[1]?.values?.length);

      query.groupBySeverity = true;
      const groupedResult = await datastore.runQuery(query, options);

      expect(groupedResult.refId).toBe('A');
      expect(groupedResult.fields?.length).toBe(5);
      groupedResult.fields?.slice(1).forEach(field => {
        expect(field.values?.every((count: number) => count === 0)).toBe(true);
      });
    });
  });
});
