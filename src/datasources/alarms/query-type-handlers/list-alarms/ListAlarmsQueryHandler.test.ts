import { createFetchError, createFetchResponse, requestMatching, setupDataSource } from 'test/fixtures';
import { ListAlarmsQueryHandler } from './ListAlarmsQueryHandler';
import { Alarm, AlarmsVariableQuery, AlarmTransitionType, QueryAlarmsResponse, QueryType, TransitionInclusionOption } from '../../types/types';
import { DataQueryRequest, LegacyMetricFindQueryOptions } from '@grafana/data';
import { QUERY_ALARMS_RELATIVE_PATH } from 'datasources/alarms/constants/QueryAlarms.constants';
import { BackendSrv } from '@grafana/runtime';
import { MockProxy } from 'jest-mock-extended';
import { User } from 'shared/types/QueryUsers.types';
import { AlarmsProperties, ListAlarmsQuery } from 'datasources/alarms/types/ListAlarms.types';
import { Workspace } from 'core/types';

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

const mockUsers: User[] = [
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
  }
];

const workspaces: Workspace[] = [
  { id: 'Workspace1', name: 'Workspace Name', default: false, enabled: true },
  { id: 'Workspace2', name: 'Another Workspace Name', default: false, enabled: true  },
];

function buildAlarmsResponse(alarms: Array<Partial<Alarm>>): Alarm[] {
  return alarms.map((partialAlarm, index) => ({
      ...sampleAlarm,
      instanceId: `INST-${String(index + 1).padStart(3, '0')}`,
      ...partialAlarm,
    }));
  }

function buildAlarmsQuery(query?: Partial<ListAlarmsQuery>): ListAlarmsQuery {
  return {
    refId: 'A',
    queryType: QueryType.ListAlarms,
    take: 1000,
    properties: [AlarmsProperties.displayName],
    ...query,
  };
}

function buildAlarmsQuery(query?: Partial<ListAlarmsQuery>): ListAlarmsQuery {
  return {
    refId: 'A',
    queryType: QueryType.ListAlarms,
    take: 1000,
    properties: [AlarmsProperties.displayName],
    ...query,
  };
}

describe('ListAlarmsQueryHandler', () => {
  let options: DataQueryRequest;

  beforeEach(() => {
    options = {} as DataQueryRequest;

    [datastore, backendServer] = setupDataSource(ListAlarmsQueryHandler);

    backendServer.fetch
      .calledWith(requestMatching({ url: QUERY_ALARMS_RELATIVE_PATH }))
      .mockReturnValue(createFetchResponse(mockAlarmResponse));
    
    jest.spyOn((datastore as any).usersUtils, 'getUsers').mockResolvedValue(
      new Map([
        ['user1@123.com', mockUsers[0]],
        ['user2@123.com', mockUsers[1]],
      ])
    );

    jest.spyOn((datastore as any).workspaceUtils, 'getWorkspaces').mockResolvedValue(
      new Map([
        ['Workspace1', workspaces[0]],
        ['Workspace2', workspaces[1]],
      ])
    );
  });

  it('should set defaultListAlarmsQuery to defaultQuery', () => {
    const defaultQuery = datastore.defaultQuery;

    expect(defaultQuery).toEqual({
      filter: '',
      properties: ['displayName', 'currentSeverityLevel', 'occurredAt', 'source', 'state', 'workspace'],
      take: 1000,
      descending: true,
      transitionInclusionOption: 'NONE',
    });
  });

  describe('runQuery', () => {
    it('should return empty value with refId and name from query when properties is undefined', async () => {
      const query = buildAlarmsQuery({ properties: undefined });

      const result = await datastore.runQuery(query, options);

      expect(result).toEqual({ refId: 'A', name: 'A', fields: [] });
    });

    it('should pass the transformed filter to the API', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2025-01-01'));
      const filterQuery = buildAlarmsQuery({
        filter: 'acknowledgedAt > "${__now:date}"'
      });

      await datastore.runQuery(filterQuery, options);

      expect(backendServer.fetch).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            filter: 'acknowledgedAt > "2025-01-01T00:00:00.000Z"',
          }),
        })
      );

      jest.useRealTimers();
    });

    describe('Properties Mapping', () => {
      it('should return empty fields when properties is invalid', async () => {
        const query = {
          refId: 'A',
          properties: [],
        };

        const result = await datastore.runQuery(query, options);

        expect(result).toEqual({ refId: 'A', name: 'A', fields: [] });
      });

      it('should return field without values when no alarms are returned from API', async () => {
        const query = buildAlarmsQuery({
          properties: [AlarmsProperties.acknowledged]
        });
        jest
          .spyOn(datastore as any, 'queryAlarmsInBatches')
          .mockResolvedValueOnce([]);
        const result = await datastore.runQuery(query, options);

        expect(result).toEqual({
          refId: 'A',
          name: 'A',
          fields: [{ name: 'Acknowledged', type: 'string', values: [] }],
        });
      });

      it('should convert workspaceIds to workspace names for workspace field', async () => {
        const query = buildAlarmsQuery({
          properties: [AlarmsProperties.workspace]
        });
        jest
          .spyOn(datastore as any, 'queryAlarmsInBatches')
          .mockResolvedValueOnce(
            buildAlarmsResponse([
              { workspace: 'Workspace1' },
              { workspace: 'Workspace2' },
              { workspace: 'Unknown Workspace' },
            ])
          );

        const result = await datastore.runQuery(query, options);

        expect(result).toEqual({
          refId: 'A',
          name: 'A',
          fields: [
            {
              name: 'Workspace',
              type: 'string',
              values: ['Workspace Name', 'Another Workspace Name', 'Unknown Workspace'],
            },
          ],
        });
      });

      it('should convert acknowledgedBy userIds to user full names for acknowledgedBy field', async () => {
        const query = buildAlarmsQuery({ 
          properties: [AlarmsProperties.acknowledgedBy]
        });
        jest
          .spyOn(datastore as any, 'queryAlarmsInBatches')
          .mockResolvedValueOnce(
            buildAlarmsResponse([
              { acknowledgedBy: 'user1@123.com' },
              { acknowledgedBy: 'unknownUserID' }
            ])
          );

        const result = await datastore.runQuery(query, options);

        expect(result).toEqual({
          refId: 'A',
          name: 'A',
          fields: [{ name: 'Acknowledged by', type: 'string', values: ['User 1', 'unknownUserID'] }],
        });
      });

      it('should map and sort the custom properties field', async () => {
        const query = buildAlarmsQuery({
          properties: [AlarmsProperties.properties],
        });
        jest
          .spyOn(datastore as any, 'queryAlarmsInBatches')
          .mockResolvedValueOnce(
            buildAlarmsResponse([
              { properties: { zProp: 'valueZ', aProp: 'valueA' } },
              { properties: { bProp: 'valueB', aProp: 'valueA2' } },
            ])
          );

        const result = await datastore.runQuery(query, options);

        expect(result).toEqual({
          refId: 'A',
          name: 'A',
          fields: [
            {
              name: 'Properties',
              type: 'string',
              values: ['{"aProp":"valueA","zProp":"valueZ"}', '{"aProp":"valueA2","bProp":"valueB"}'],
            },
          ],
        });
      });

      it('should remove any custom properties that starts with nitag', async () => {
        const query = buildAlarmsQuery({
          properties: [AlarmsProperties.properties],
        });
        jest
          .spyOn(datastore as any, 'queryAlarmsInBatches')
          .mockResolvedValueOnce(
            buildAlarmsResponse([
              { properties: { nitag_internal: 'secret', normalProp: 'value1' } },
              { properties: { anotherProp: 'value2', nitag_flag: 'true' } },
            ])
          );

        const result = await datastore.runQuery(query, options);

        expect(result).toEqual({
          refId: 'A',
          name: 'A',
          fields: [
            {
              name: 'Properties',
              type: 'string',
              values: ['{"normalProp":"value1"}', '{"anotherProp":"value2"}'],
            },
          ],
        });
      });

      it('should return empty strings for properties field when no custom properties exist on the alarms', async () => {
        const query = buildAlarmsQuery({
          refId: 'A',
          properties: [AlarmsProperties.properties],
        });
        jest
          .spyOn(datastore as any, 'queryAlarmsInBatches')
          .mockResolvedValueOnce(
            buildAlarmsResponse([
              { properties: {} },
              { properties: {} },
            ])
          );

        const result = await datastore.runQuery(query, options);

        expect(result).toEqual({
          refId: 'A',
          name: 'A',
          fields: [
            {
              name: 'Properties',
              type: 'string',
              values: ['', ''],
            },
          ],
        });
      });

      it('should map severity level properties correctly', async () => {
        const query = buildAlarmsQuery({
          properties: [AlarmsProperties.highestSeverityLevel, AlarmsProperties.currentSeverityLevel],
        });
        jest
        .spyOn(datastore as any, 'queryAlarmsInBatches')
        .mockResolvedValueOnce(
          buildAlarmsResponse([
            { highestSeverityLevel: -1, currentSeverityLevel: 100 },
            { highestSeverityLevel: 4, currentSeverityLevel: -1 },
            { highestSeverityLevel: 3, currentSeverityLevel: 0 },
            { highestSeverityLevel: 2, currentSeverityLevel: 1 },
            { highestSeverityLevel: 1, currentSeverityLevel: 2 },
            { highestSeverityLevel: 0, currentSeverityLevel: 3 },
            { highestSeverityLevel: -5, currentSeverityLevel: 4 },
            { highestSeverityLevel: 99, currentSeverityLevel: 5 },
          ])
        );

        const result = await datastore.runQuery(query, options);

        expect(result).toEqual({
          refId: 'A',
          name: 'A',
          fields: [
            {
              name: 'Highest severity',
              type: 'string',
              values: [
                'Clear',
                'Critical (4)',
                'High (3)',
                'Moderate (2)',
                'Low (1)',
                '',
                '',
                'Critical (99)',
              ],
            },
            {
              name: 'Current severity',
              type: 'string',
              values: [
                'Critical (100)',
                'Clear',
                '',
                'Low (1)',
                'Moderate (2)',
                'High (3)',
                'Critical (4)',
                'Critical (5)',
              ],
            },
          ],
        });
      });

      it('should map state property correctly', async () => {
        const query = buildAlarmsQuery({
          properties: [AlarmsProperties.state],
        });
        jest
        .spyOn(datastore as any, 'queryAlarmsInBatches')
        .mockResolvedValueOnce(
          buildAlarmsResponse([
            { clear: true, acknowledged: false },
            { clear: false, acknowledged: true },
            { clear: false, acknowledged: false },
            { clear: true, acknowledged: true },
          ])
        );

        const result = await datastore.runQuery(query, options);

        expect(result).toEqual({
          refId: 'A',
          name: 'A',
          fields: [
            {
              name: 'State',
              type: 'string',
              values: ['Cleared; NotAcknowledged', 'Acknowledged', 'Set', 'Cleared'],
            },
          ],
        });
      });

      it('should map source property correctly', async () => {
        const query = buildAlarmsQuery({
          properties: [AlarmsProperties.source],
        });
        jest
        .spyOn(datastore as any, 'queryAlarmsInBatches')
        .mockResolvedValueOnce(
          buildAlarmsResponse([
            { properties: { system: 'Sensor A' } },
            { properties: { minionId: 'Minion-42' } },
            { properties: { system: 'Sensor B', minionId: 'Minion-43' } },
            { properties: { otherProp: 'value' } },
          ])
        );

        const result = await datastore.runQuery(query, options);

        expect(result).toEqual({
          refId: 'A',
          name: 'A',
          fields: [
            {
              name: 'Source',
              type: 'string',
              values: ['Sensor A', 'Minion-42', 'Sensor B', ''],
            },
          ],
        });
      });

      it('should map time-fields properly', async () => {
        const query = buildAlarmsQuery({
          properties: [
            AlarmsProperties.occurredAt,
            AlarmsProperties.acknowledgedAt,
            AlarmsProperties.updatedAt,
            AlarmsProperties.mostRecentSetOccurredAt,
            AlarmsProperties.mostRecentTransitionOccurredAt,
          ],
        });
        jest
        .spyOn(datastore as any, 'queryAlarmsInBatches')
        .mockResolvedValueOnce(
          buildAlarmsResponse([
            {
              occurredAt: '2019-05-20T09:00:00Z',
              acknowledgedAt: '2021-11-20T10:30:00Z',
              mostRecentSetOccurredAt: '2001-09-09T09:00:00Z',
              mostRecentTransitionOccurredAt: '2001-04-22T23:59:59Z',
              updatedAt: '2025-10-31T23:59:59Z',
            },
            {
              occurredAt: undefined,
              acknowledgedAt: null, //nullable field
              mostRecentSetOccurredAt: null, //nullable field
              mostRecentTransitionOccurredAt: null, //nullable field
              updatedAt: undefined,
            },
            {
              occurredAt: undefined,
              acknowledgedAt: undefined,
              mostRecentSetOccurredAt: undefined,
              mostRecentTransitionOccurredAt: undefined,
              updatedAt: undefined,
            },
          ])
        );

        const result = await datastore.runQuery(query, options);

        expect(result).toEqual({
          refId: 'A',
          name: 'A',
          fields: [
            {
              name: 'First occurrence',
              type: 'time',
              values: ['2019-05-20T09:00:00Z', null, null],
            },
            {
              name: 'Acknowledged on',
              type: 'time',
              values: ['2021-11-20T10:30:00Z', null, null],
            },
            {
              name: 'Updated',
              type: 'time',
              values: ['2025-10-31T23:59:59Z', null, null],
            },
            {
              name: 'Last occurrence',
              type: 'time',
              values: ['2001-09-09T09:00:00Z', null, null],
            },
            {
              name: 'Last transition occurrence',
              type: 'time',
              values: ['2001-04-22T23:59:59Z', null, null],
            },
          ],
        });
      });

      it('should map keyword property correctly', async () => {
        const query = buildAlarmsQuery({
          properties: [AlarmsProperties.keywords],
        });
        jest
        .spyOn(datastore as any, 'queryAlarmsInBatches')
        .mockResolvedValueOnce(
          buildAlarmsResponse([
            { keywords: ['temperature', 'high'] },
            { keywords: ['pressure'] },
            { keywords: [] },
          ])
        );

        const result = await datastore.runQuery(query, options);

        expect(result).toEqual({
          refId: 'A',
          name: 'A',
          fields: [
            {
              name: 'Keywords',
              type: 'string',
              values: [
                ['temperature', 'high'],
                ['pressure'],
                [],
              ],
            },
          ],
        });
      });

      it('should map boolean values fields to the properties', async () => {
        const query = buildAlarmsQuery({
          properties: [AlarmsProperties.clear, AlarmsProperties.acknowledged, AlarmsProperties.active]
        });
        jest
        .spyOn(datastore as any, 'queryAlarmsInBatches')
        .mockResolvedValueOnce(
          buildAlarmsResponse([
            { clear: true, acknowledged: false, active: true },
            { clear: false, acknowledged: true, active: false },
          ])
        );

        const result = await datastore.runQuery(query, options);

        expect(result).toEqual({
          refId: 'A',
          name: 'A',
          fields: [
            {
              name: 'Clear',
              type: 'string',
              values: [true, false],
            },
            {
              name: 'Acknowledged',
              type: 'string', 
              values: [false, true],
            },
            {
              name: 'Active',
              type: 'string',
              values: [true, false],
            },
          ],
        });
      });

      it('should map string and number based properties', async () => {
        const query = buildAlarmsQuery({
          properties: [
            AlarmsProperties.channel,
            AlarmsProperties.alarmId,
            AlarmsProperties.condition,
            AlarmsProperties.createdBy,
            AlarmsProperties.description,
            AlarmsProperties.displayName,
            AlarmsProperties.instanceId,
            AlarmsProperties.resourceType,
            AlarmsProperties.transitionOverflowCount,
          ],
        });
        jest
        .spyOn(datastore as any, 'queryAlarmsInBatches')
        .mockResolvedValueOnce(
          buildAlarmsResponse([
            {
              channel: 'Main',
              alarmId: 'ALARM-001',
              condition: 'Temperature',
              createdBy: 'admin',
              description: 'High temperature detected',
              displayName: 'Temperature Alarm',
              instanceId: 'INST-001',
              resourceType: 'sensor',
              transitionOverflowCount: 5,
            },
            {
              channel: undefined,
              alarmId: undefined,
              condition: '',
              createdBy: undefined,
              description: undefined,
              displayName: '',
              instanceId: undefined,
              resourceType: undefined,
              transitionOverflowCount: 0,
            },
          ])
        );

        const result = await datastore.runQuery(query, options);

        expect(result).toEqual({
          refId: 'A',
          name: 'A',
          fields: [
            {
              name: 'Channel',
              type: 'string',
              values: ['Main', ''],
            },
            {
              name: 'Alarm ID',
              type: 'string',
              values: ['ALARM-001', ''],
            },
            {
              name: 'Condition',
              type: 'string',
              values: ['Temperature', ''],
            },
            {
              name: 'Created by',
              type: 'string',
              values: ['admin', ''],
            },
            {
              name: 'Description',
              type: 'string',
              values: ['High temperature detected',''],
            },
            {
              name: 'Alarm name',
              type: 'string',
              values: ['Temperature Alarm', ''],
            },
            {
              name: 'Instance ID',
              type: 'string',
              values: ['INST-001', ''],
            },
            {
              name: 'Resource type',
              type: 'string',
              values: ['sensor', ''],
            },
            {
              name: 'Transition overflow count',
              type: 'string',
              values: [5, 0],
            },
          ],
        });
      });
    });

    [0, -5, 9999999, undefined].forEach(invalidTake => {
      it(`should return empty result when take is invalid(${invalidTake})`, async () => {
        const invalidTakeQuery = buildAlarmsQuery({ take: invalidTake });
        const spy = jest.spyOn(datastore as any, 'queryAlarmsData');

        const result = await datastore.runQuery(invalidTakeQuery, options);

        expect(result).toEqual({ refId: 'A', name: 'A', fields: [] });
        expect(spy).not.toHaveBeenCalled();
      });
    });

    it('should not call queryAlarmsData when take is invalid', async () => {
      const invalidTakeQuery = buildAlarmsQuery({ take: 0 });
      const spy = jest.spyOn(datastore as any, 'queryAlarmsData');

      const result = await datastore.runQuery(invalidTakeQuery, options);

      expect(result).toEqual({ refId: 'A', name: 'A', fields: [] });
      expect(spy).not.toHaveBeenCalled();
    });

    it('should call queryAlarmsData when take is valid', async () => {
      const validTakeQuery = buildAlarmsQuery({ take: 500 });
      const spy = jest.spyOn(datastore as any, 'queryAlarmsData');

      await datastore.runQuery(validTakeQuery, options);

      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 500,
        })
      );
    });
  });

  describe('queryAlarmsData', () => {
    it('should default to empty filter when filter is not provided in query', async () => {
      const query = buildAlarmsQuery({ filter: undefined });

      await datastore.runQuery(query, options);

      expect(backendServer.fetch).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            filter: '',
          }),
        })
      );
    });

    it('should use the provided filter when querying alarms', async () => {
      const query = buildAlarmsQuery({ filter: 'test-filter' });

      await datastore.runQuery(query, options);

      expect(backendServer.fetch).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            filter: 'test-filter',
          }),
        })
      );
    });

    it('should use transition inclusion option and call API with correct transition parameter', async () => {
      const transitionInclusionOption = TransitionInclusionOption.MostRecentOnly;

      await datastore.runQuery({ ...query, transitionInclusionOption }, options);

      expect(backendServer.fetch).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            transitionInclusionOption
          }),
        })
      );
    });

    it('should default to NONE transition inclusion option when not provided', async () => {
      await datastore.runQuery(query, options);

      expect(backendServer.fetch).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            'transitionInclusionOption': TransitionInclusionOption.None,
          }),
        })
      );
    });

    it('should pass take from query to the API', async () => {
      const query = buildAlarmsQuery({ take: 500 });

      await datastore.runQuery(query, options);

      expect(backendServer.fetch).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            take: 500,
          }),
        })
      );
    });

    it('should pass descending from query to the API', async () => {
      const query = buildAlarmsQuery({ descending: false });

      await datastore.runQuery(query, options);

      expect(backendServer.fetch).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            orderByDescending: false,
          }),
        })
      );
    });

    it('should default to true for descending order when it is not provided in query', async () => {
      const query = buildAlarmsQuery({ descending: undefined });

      await datastore.runQuery(query, options);

      expect(backendServer.fetch).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            orderByDescending: true,
          }),
        })
      );
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
        filter: undefined,
        descending: true,
        take: 1000
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
        filter: 'workspace = "Lab-1"',
        take: 1000
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

    it('should set `orderByDescending` to true when descending set to undefined', async () => {
      const query: AlarmsVariableQuery = {
        refId: 'A',
        filter: 'workspace = "Lab-1"',
        take: 1000,
        descending: undefined
      };

       await datastore.metricFindQuery(query, options);

      expect(backendServer.fetch).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            orderByDescending: true
          })
        })
      );
    });

    it('should replace template variables in filter', async () => {
      const query: AlarmsVariableQuery = {
        refId: 'A',
        filter: 'workspace = "$workspace"',
        take: 1000
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
        filter: 'workspace = "Lab-1"',
        take: 1000
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
        filter: undefined,
        take: 1000
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
        filter: 'workspace = "Lab-1"',
        take: 1000
      };
      const options = undefined;

      const result = await datastore.metricFindQuery(query, options);

      expect(result).toEqual([
        { text: 'High Temperature Alarm (ALARM-001)', value: 'ALARM-001' },
        { text: 'Low Pressure Alarm (ALARM-002)', value: 'ALARM-002' },
        { text: 'System Error Alarm (ALARM-003)', value: 'ALARM-003' }
      ]);
    });

    describe('take', () => {
      it('should not call the API when take is undefined', async () => {
        const query: AlarmsVariableQuery = {
          refId: 'A',
          filter: 'workspace = "Lab-1"',
          take: undefined
        };
  
        const result = await datastore.metricFindQuery(query, options);
  
        expect(result).toEqual([]);
        expect(backendServer.fetch).not.toHaveBeenCalled();
      });

      it('should not call the API when take is less than 1', async () => {
        const query: AlarmsVariableQuery = {
          refId: 'A',
          filter: 'workspace = "Lab-1"',
          take: 0
        };
  
        const result = await datastore.metricFindQuery(query, options);
  
        expect(result).toEqual([]);
        expect(backendServer.fetch).not.toHaveBeenCalled();
      });

      it('should not call the API when take is greater than 10000', async () => {
        const query: AlarmsVariableQuery = {
          refId: 'A',
          filter: 'workspace = "Lab-1"',
          take: 10001
        };
  
        const result = await datastore.metricFindQuery(query, options);
  
        expect(result).toEqual([]);
        expect(backendServer.fetch).not.toHaveBeenCalled();
      });

      it('should call the API when take is valid', async () => {
        const query: AlarmsVariableQuery = {
          refId: 'A',
          filter: 'workspace = "Lab-1"',
          take: 1000
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
              take: 1000
            })
          })
        );
      });
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
