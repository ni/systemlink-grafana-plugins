import { createFetchError, createFetchResponse, requestMatching, setupDataSource } from 'test/fixtures';
import { ListAlarmsQueryHandler } from './ListAlarmsQueryHandler';
import { Alarm, AlarmsVariableQuery, AlarmTransitionType, QueryAlarmsResponse, QueryType } from '../../types/types';
import { DataQueryRequest, LegacyMetricFindQueryOptions } from '@grafana/data';
import { QUERY_ALARMS_RELATIVE_PATH } from 'datasources/alarms/constants/QueryAlarms.constants';
import { BackendSrv } from '@grafana/runtime';
import { MockProxy } from 'jest-mock-extended';
import { User } from 'shared/types/QueryUsers.types';

jest.mock('shared/users.utils', () => {
  return {
    UsersUtils: jest.fn().mockImplementation(() => ({
      getUsers: jest.fn().mockResolvedValue(
        new Map([
          ['user1@123.com', { 
            id: '1',
            firstName: 'User',
            lastName: '1',
            email: 'user1@123.com',
            properties: {},
            keywords: [],
            created: '',
            updated: '',
            orgId: '',
          }],
          ['user2@123.com', { 
            id: '2',
            firstName: 'User',
            lastName: '2',
            email: 'user2@123.com',
            properties: {},
            keywords: [],
            created: '',
            updated: '',
            orgId: '',
          }],
        ])
      )
    }))
  };
});

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

    expect(defaultQuery).toEqual({ queryType: 'List Alarms', filter: '' });
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
            filter: undefined
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

    it('should not display duplicate alarms based on alarm id', async () => {
      const duplicateAlarmsResponse: QueryAlarmsResponse = {
        alarms: [
          { ...sampleAlarm, instanceId: 'INST-001', displayName: 'High Temperature Alarm' },
          { ...sampleAlarm, instanceId: 'INST-002', displayName: 'High Temperature Alarm' },
          { ...sampleAlarm, instanceId: 'INST-003', displayName: 'High Temperature Alarm' }
        ],
        totalCount: 3
      };
      backendServer.fetch
        .calledWith(requestMatching({ url: QUERY_ALARMS_RELATIVE_PATH }))
        .mockReturnValue(createFetchResponse(duplicateAlarmsResponse));

      const query: AlarmsVariableQuery = {refId: 'A'};
      const result = await datastore.metricFindQuery(query, options);

      expect(result).toEqual([
        { text: 'High Temperature Alarm (ALARM-001)', value: 'ALARM-001' }
      ]);
    });
  });

  describe('loadUsers', () => {
    it('should return users', async () => {
      const users = await (datastore as any).loadUsers();

      expect(users).toEqual(
        new Map([
          [
            'user1@123.com',
            { 
              id: '1',
              firstName: 'User',
              lastName: '1',
              email: 'user1@123.com',
              properties: {},
              keywords: [],
              created: '',
              updated: '',
              orgId: '',
            },
          ],
          [
            'user2@123.com',
            { 
              id: '2',
              firstName: 'User',
              lastName: '2',
              email: 'user2@123.com',
              properties: {},
              keywords: [],
              created: '',
              updated: '',
              orgId: '',
            },
          ],
        ])
      );
    });

    it('should return empty map on error', async () => {
      (datastore as any).usersUtils.getUsers.mockRejectedValue(new Error('Error loading users'));

      const users = await (datastore as any).loadUsers();

      expect(users).toEqual(new Map<string, User>());
    });

    [
      {
        error: new Error('Request failed with status code: 404'),
        expectedErrorDescription:
          'The query builder lookups failed because the requested resource was not found. Please check the query parameters and try again.',
        case: '404 error',
      },
      {
        error: new Error('Request failed with status code: 429'),
        expectedErrorDescription:
          'The query builder lookups failed due to too many requests. Please try again later.',
        case: '429 error',
      },
      {
        error: new Error('Request failed with status code: 504'),
        expectedErrorDescription:
          'The query builder lookups experienced a timeout error. Some values might not be available. Narrow your query with a more specific filter and try again.',
        case: '504 error',
      },
      {
        error: new Error('Request failed with status code: 500, Error message: {"message": "Internal Server Error"}'),
        expectedErrorDescription:
          'Some values may not be available in the query builder lookups due to the following error: Internal Server Error.',
        case: '500 error with message',
      },
      {
        error: new Error('API failed'),
        expectedErrorDescription:
          'Some values may not be available in the query builder lookups due to an unknown error.',
        case: 'Unknown error',
      },
    ].forEach(({ error, expectedErrorDescription, case: testCase }) => {
      it(`should handle ${testCase}`, async () => {
        const expectedErrorTitle = 'Warning during alarms query';
        jest
          .spyOn((datastore as any).usersUtils, 'getUsers')
          .mockRejectedValue(error);

        await (datastore as any).loadUsers();

        expect(datastore.errorTitle).toBe(expectedErrorTitle);
        expect(datastore.errorDescription).toBe(expectedErrorDescription);
      });
    });
  });
});
