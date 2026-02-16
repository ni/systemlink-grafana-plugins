import { createFetchError, createFetchResponse, requestMatching, setupDataSource } from 'test/fixtures';
import { ListAlarmsQueryHandler } from './ListAlarmsQueryHandler';
import { Alarm, AlarmsVariableQuery, AlarmTransitionType, QueryAlarmsResponse, QueryType, TransitionInclusionOption } from '../../types/types';
import { DataQueryRequest, LegacyMetricFindQueryOptions } from '@grafana/data';
import { QUERY_ALARMS_RELATIVE_PATH } from 'datasources/alarms/constants/QueryAlarms.constants';
import { BackendSrv } from '@grafana/runtime';
import { MockProxy } from 'jest-mock-extended';
import { User } from 'shared/types/QueryUsers.types';
import { AlarmsSpecificProperties, AlarmsTransitionProperties, ListAlarmsQuery, OutputType } from 'datasources/alarms/types/ListAlarms.types';
import { Workspace } from 'core/types';
import { AlarmsPropertiesOptions, TRANSITION_SPECIFIC_PROPERTIES } from 'datasources/alarms/constants/AlarmsQueryEditor.constants';

let datastore: ListAlarmsQueryHandler, backendServer: MockProxy<BackendSrv>;

const mockTransition1 = {
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
};
const mockTransition2 = {
  transitionType: AlarmTransitionType.Clear,
  occurredAt: '2025-09-16T10:00:00Z',
  severityLevel: 0,
  value: 'Clear',
  condition: 'Humidity',
  shortText: 'Humidity Normal',
  detailText: 'Humidity back to normal',
  keywords: ['humidity', 'normal'],
  properties: {
    sensorId: 'SENSOR-90',
  },
};
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
    mockTransition1,
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
    properties: [AlarmsSpecificProperties.displayName],
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
      outputType: 'Properties',
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
          properties: [AlarmsSpecificProperties.acknowledged]
        });
        jest
          .spyOn(datastore as any, 'queryAlarmsInBatches')
          .mockResolvedValueOnce([]);
        const result = await datastore.runQuery(query, options);

        expect(result).toEqual({
          refId: 'A',
          name: 'A',
          fields: [{ name: 'Acknowledged', type: 'boolean', values: [] }],
        });
      });

      it('should correctly map alarm properties when the API returns no transitions and the transition inclusion option is set to None', async () => {
        const query = buildAlarmsQuery({
          properties: Object.values(AlarmsSpecificProperties),
          transitionInclusionOption: TransitionInclusionOption.None,
        });

        const response = await datastore.runQuery(query, options);

        expect(response).toEqual({
          refId: 'A',
          name: 'A',
          fields: [
            {
              name: 'Acknowledged',
              type: 'boolean',
              values: [true],
            },
            {
              name: 'Acknowledged on',
              type: 'time',
              values: ['2025-09-16T10:30:00Z'],
            },
            {
              name: 'Acknowledged by',
              type: 'string',
              values: ['user123'],
            },
            {
              name: 'Active',
              type: 'boolean',
              values: [true],
            },
            {
              name: 'Alarm ID',
              type: 'string',
              values: ['ALARM-001'],
            },
            {
              name: 'Channel',
              type: 'string',
              values: ['Main'],
            },
            {
              name: 'Clear',
              type: 'boolean',
              values: [false],
            },
            {
              name: 'Condition',
              type: 'string',
              values: ['Temperature'],
            },
            {
              name: 'Created by',
              type: 'string',
              values: ['admin'],
            },
            {
              name: 'Current severity',
              type: 'string',
              values: ['High (3)'],
            },
            {
              name: 'Description',
              type: 'string',
              values: ['Alarm triggered when temperature exceeds safe limit.'],
            },
            {
              name: 'Alarm name',
              type: 'string',
              values: ['High Temperature Alarm'],
            },
            {
              name: 'Highest severity',
              type: 'string',
              values: ['High (3)'],
            },
            {
              name: 'Instance ID',
              type: 'string',
              values: ['INST-001'],
            },
            {
              name: 'Keywords',
              type: 'other',
              values: [['temperature']],
            },
            {
              name: 'Last occurrence',
              type: 'time',
              values: ['2025-09-16T09:00:00Z'],
            },
            {
              name: 'Last transition occurrence',
              type: 'time',
              values: ['2025-09-16T10:00:00Z'],
            },
            {
              name: 'First occurrence',
              type: 'time',
              values: ['2025-09-16T09:00:00Z'],
            },
            {
              name: 'Properties',
              type: 'other',
              values: [{ location: 'Lab-1' }],
            },
            {
              name: 'Resource type',
              type: 'string',
              values: [''],
            },
            {
              name: 'Source',
              type: 'string',
              values: [''],
            },
            {
              name: 'State',
              type: 'string',
              values: ['Acknowledged'],
            },
            {
              name: 'Transition overflow count',
              type: 'number',
              values: [0],
            },
            {
              name: 'Updated',
              type: 'time',
              values: ['2025-09-16T10:29:00Z'],
            },
            {
              name: 'Workspace',
              type: 'string',
              values: ['Lab-1'],
            },
          ],
        });
      });

      it('should convert workspaceIds to workspace names for workspace field', async () => {
        const query = buildAlarmsQuery({
          properties: [AlarmsSpecificProperties.workspace]
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
          properties: [AlarmsSpecificProperties.acknowledgedBy]
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
          properties: [AlarmsSpecificProperties.properties],
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
              type: 'other',
              values: [{"aProp":"valueA","zProp":"valueZ"}, {"aProp":"valueA2","bProp":"valueB"}],
            },
          ],
        });
      });

      it('should remove any custom properties that starts with nitag', async () => {
        const query = buildAlarmsQuery({
          properties: [AlarmsSpecificProperties.properties],
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
              type: 'other',
              values: [{"normalProp":"value1"}, {"anotherProp":"value2"}],
            },
          ],
        });
      });

      it('should return empty object for properties field when no custom properties exist on the alarms', async () => {
        const query = buildAlarmsQuery({
          refId: 'A',
          properties: [AlarmsSpecificProperties.properties],
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
              type: 'other',
              values: [{}, {}],
            },
          ],
        });
      });

      it('should map severity level properties correctly', async () => {
        const query = buildAlarmsQuery({
          properties: [AlarmsSpecificProperties.highestSeverityLevel, AlarmsSpecificProperties.currentSeverityLevel],
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
          properties: [AlarmsSpecificProperties.state],
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
              values: ['Cleared; Not Acknowledged', 'Acknowledged', 'Set', 'Cleared'],
            },
          ],
        });
      });

      it('should map source property correctly', async () => {
        const query = buildAlarmsQuery({
          properties: [AlarmsSpecificProperties.source],
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
            AlarmsSpecificProperties.occurredAt,
            AlarmsSpecificProperties.acknowledgedAt,
            AlarmsSpecificProperties.updatedAt,
            AlarmsSpecificProperties.mostRecentSetOccurredAt,
            AlarmsSpecificProperties.mostRecentTransitionOccurredAt,
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
          properties: [AlarmsSpecificProperties.keywords],
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
              type: 'other',
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
          properties: [AlarmsSpecificProperties.clear, AlarmsSpecificProperties.acknowledged, AlarmsSpecificProperties.active]
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
              type: 'boolean',
              values: [true, false],
            },
            {
              name: 'Acknowledged',
              type: 'boolean', 
              values: [false, true],
            },
            {
              name: 'Active',
              type: 'boolean',
              values: [true, false],
            },
          ],
        });
      });

      it('should map string and number based properties', async () => {
        const query = buildAlarmsQuery({
          properties: [
            AlarmsSpecificProperties.channel,
            AlarmsSpecificProperties.alarmId,
            AlarmsSpecificProperties.condition,
            AlarmsSpecificProperties.createdBy,
            AlarmsSpecificProperties.description,
            AlarmsSpecificProperties.displayName,
            AlarmsSpecificProperties.instanceId,
            AlarmsSpecificProperties.resourceType,
            AlarmsSpecificProperties.transitionOverflowCount,
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
              type: 'number',
              values: [5, 0],
            },
          ],
        });
      });

      describe('Transition Properties', () => {
        it('should map alarm and transition properties without overlap', async () => {
          const query = buildAlarmsQuery({
            properties: Object.values(AlarmsPropertiesOptions).map(options => options.value),
            transitionInclusionOption: TransitionInclusionOption.MostRecentOnly,
            take: 10,
          });
          jest.spyOn(datastore as any, 'queryAlarmsInBatches').mockResolvedValueOnce(
            buildAlarmsResponse([
              {
                transitions: [
                  mockTransition2,
                ]
              }
            ])
          );

          const response = await datastore.runQuery(query, options);

          expect(response).toEqual({
            refId: 'A',
            name: 'A',
            fields: [
              { name: 'Acknowledged', type: 'boolean', values: [true] },
              { name: 'Acknowledged by', type: 'string', values: ['user123'] },
              { name: 'Acknowledged on', type: 'time', values: ['2025-09-16T10:30:00Z'] },
              { name: 'Active', type: 'boolean', values: [true] },
              { name: 'Alarm ID', type: 'string', values: ['ALARM-001'] },
              { name: 'Alarm name', type: 'string', values: ['High Temperature Alarm'] },
              { name: 'Channel', type: 'string', values: ['Main'] },
              { name: 'Clear', type: 'boolean', values: [false] },
              { name: 'Condition', type: 'string', values: ['Temperature'] },
              { name: 'Created by', type: 'string', values: ['admin'] },
              { name: 'Current severity', type: 'string', values: ['High (3)'] },
              { name: 'Description', type: 'string', values: ['Alarm triggered when temperature exceeds safe limit.'] },
              { name: 'First occurrence', type: 'time', values: ['2025-09-16T09:00:00Z'] },
              { name: 'Highest severity', type: 'string', values: ['High (3)'] },
              { name: 'Instance ID', type: 'string', values: ['INST-001'] },
              { name: 'Keywords', type: 'other', values: [['temperature']] },
              { name: 'Last occurrence', type: 'time', values: ['2025-09-16T09:00:00Z'] },
              { name: 'Last transition occurrence', type: 'time', values: ['2025-09-16T10:00:00Z'] },
              { name: 'Properties', type: 'other', values: [{"location":"Lab-1"}] },
              { name: 'Resource type', type: 'string', values: [''] },
              { name: 'Source', type: 'string', values: [''] },
              { name: 'State', type: 'string', values: ['Acknowledged'] },
              { name: 'Transition condition', type: 'string', values: ['Humidity'] },
              { name: 'Transition detail', type: 'string', values: ['Humidity back to normal'] },
              { name: 'Transition keywords', type: 'other', values: [['humidity', 'normal']] },
              { name: 'Transition occurred at', type: 'time', values: ['2025-09-16T10:00:00Z'] },
              { name: 'Transition overflow count', type: 'number', values: [0] },
              { name: 'Transition properties', type: 'other', values: [{"sensorId":"SENSOR-90"}] },
              { name: 'Transition severity', type: 'string', values: [''] },
              { name: 'Transition short text', type: 'string', values: ['Humidity Normal'] },
              { name: 'Transition type', type: 'string', values: ['CLEAR'] },
              { name: 'Transition value', type: 'string', values: ['Clear'] },
              { name: 'Updated', type: 'time', values: ['2025-09-16T10:29:00Z'] },
              { name: 'Workspace', type: 'string', values: ['Lab-1'] },
            ],
          });
        });

        it('should map alarm occurredAt and transitions occurredAt properties correctly when both are selected', async () => {
          const query = buildAlarmsQuery({
            properties: [AlarmsSpecificProperties.occurredAt, AlarmsTransitionProperties.transitionOccurredAt],
            transitionInclusionOption: TransitionInclusionOption.All,
            take: 500,
          });
          jest.spyOn(datastore as any, 'queryAlarmsInBatches').mockResolvedValueOnce(
            buildAlarmsResponse([
              {
                transitions: [
                  mockTransition1,
                  {
                    ...mockTransition2,
                    occurredAt: '2001-01-01T11:00:00Z',
                  }
                ]
              }
            ])
          );

          const response = await datastore.runQuery(query, options);

          expect(response).toEqual({
            refId: 'A',
            name: 'A',
            fields: [
              {
                name: 'First occurrence',
                type: 'time',
                values: ['2025-09-16T09:00:00Z', '2025-09-16T09:00:00Z'],
              },
              {
                name: 'Transition occurred at',
                type: 'time',
                values: ['2025-09-16T09:00:00Z', '2001-01-01T11:00:00Z'],
              },
            ],
          });
        });

        it('should map alarm condition and transitions condition properties correctly when both are selected', async () => {
          const query = buildAlarmsQuery({
            properties: [AlarmsSpecificProperties.condition, AlarmsTransitionProperties.transitionCondition],
            transitionInclusionOption: TransitionInclusionOption.All,
            take: 500,
          });
          jest.spyOn(datastore as any, 'queryAlarmsInBatches').mockResolvedValueOnce(
            buildAlarmsResponse([
              {
                transitions: [
                  { 
                    ...mockTransition1, 
                    condition: 'Greater than 90'
                  },
                  mockTransition2,
                ]
              }
            ])
          );

          const response = await datastore.runQuery(query, options);

          expect(response).toEqual({
            refId: 'A',
            name: 'A',
            fields: [
              {
                name: 'Condition',
                type: 'string',
                values: [
                  'Temperature',
                  'Temperature',
                ],
              },
              {
                name: 'Transition condition',
                type: 'string',
                values: [
                  'Greater than 90',
                  'Humidity',
                ],
              },
            ],
          });
        });

        it('should map alarm keywords and transitions keywords properties correctly when both are selected', async () => {
          const query = buildAlarmsQuery({
            properties: [AlarmsSpecificProperties.keywords, AlarmsTransitionProperties.transitionKeywords],
            transitionInclusionOption: TransitionInclusionOption.All,
            take: 500,
          });
          jest.spyOn(datastore as any, 'queryAlarmsInBatches').mockResolvedValueOnce(
            buildAlarmsResponse([
              {
                transitions: [
                  mockTransition1,
                  mockTransition2,
                ]
              }
            ])
          );

          const response = await datastore.runQuery(query, options);

          expect(response).toEqual({
            refId: 'A',
            name: 'A',
            fields: [
              {
                name: 'Keywords',
                type: 'other',
                values: [
                  ['temperature'],
                  ['temperature'],
                ],
              },
              {
                name: 'Transition keywords',
                type: 'other',
                values: [
                  ['temperature', 'high'],
                  ['humidity', 'normal'],
                ],
              },
            ],
          });
        });

        it('should map alarms properties and transitions properties correctly when both are selected', async () => {
          const query = buildAlarmsQuery({
            properties: [AlarmsSpecificProperties.properties, AlarmsTransitionProperties.transitionProperties],
            transitionInclusionOption: TransitionInclusionOption.All,
            take: 500,
          });
          jest.spyOn(datastore as any, 'queryAlarmsInBatches').mockResolvedValueOnce(
            buildAlarmsResponse([
              {
                transitions: [
                  mockTransition1,
                  mockTransition2,
                ]
              }
            ])
          );

          const response = await datastore.runQuery(query, options);

          expect(response).toEqual({
            refId: 'A',
            name: 'A',
            fields: [
              {
                name: 'Properties',
                type: 'other',
                values: [
                  {"location":"Lab-1"},
                  {"location":"Lab-1"},
                ],
              },
              {
                name: 'Transition properties',
                type: 'other',
                values: [
                  {"sensorId":"SENSOR-12"},
                  {"sensorId":"SENSOR-90"},
                ],
              },
            ],
          });
        });

        it('should duplicate transition specific properties when transition inclusion option is ALL', async () => {
          const query = buildAlarmsQuery({
            properties: [AlarmsSpecificProperties.displayName, ...TRANSITION_SPECIFIC_PROPERTIES],
            transitionInclusionOption: TransitionInclusionOption.All,
            take: 500,
          });
          const spy = jest.spyOn(datastore as any, 'duplicateAlarmsByTransitions');
          jest.spyOn(datastore as any, 'queryAlarmsInBatches').mockResolvedValueOnce(
            buildAlarmsResponse([
              {
                displayName: 'Alarm 1',
                transitions: [
                  mockTransition1,
                  mockTransition2,
                ]
              }
            ])
          );

          const response = await datastore.runQuery(query, options);

          expect(spy).toHaveBeenCalledTimes(1);
          expect(response).toEqual({
            refId: 'A',
            name: 'A',
            fields: [
              {
                name: 'Alarm name',
                type: 'string',
                values: ['Alarm 1', 'Alarm 1'],
              },
              {
                name: 'Transition condition',
                type: 'string',
                values: ['Temperature', 'Humidity'],
              },
              {
                name: 'Transition detail',
                type: 'string',
                values: ['Temperature exceeded threshold', 'Humidity back to normal'],
              },
              {
                name: 'Transition keywords',
                type: 'other',
                values: [
                  ['temperature', 'high'],
                  ['humidity', 'normal'],
                ],
              },
              {
                name: 'Transition occurred at',
                type: 'time',
                values: ['2025-09-16T09:00:00Z', '2025-09-16T10:00:00Z'],
              },
              {
                name: 'Transition properties',
                type: 'other',
                values: [
                  {"sensorId":"SENSOR-12"},
                  {"sensorId":"SENSOR-90"},
                ],
              },
              {
                name: 'Transition severity',
                type: 'string',
                values: ['High (3)', ''],
              },
              {
                name: 'Transition short text',
                type: 'string',
                values: ['Temp High', 'Humidity Normal'],
              },
              {
                name: 'Transition type',
                type: 'string',
                values: ['SET', 'CLEAR'],
              },
              {
                name: 'Transition value',
                type: 'string',
                values: ['High', 'Clear'],
              },
            ],
          });
        });

        it('should handle alarms response with one transition when transition inclusion option is ALL', async () => {
          const query = buildAlarmsQuery({
            properties: [AlarmsSpecificProperties.displayName, ...TRANSITION_SPECIFIC_PROPERTIES],
            transitionInclusionOption: TransitionInclusionOption.All,
            take: 500,
          });

          const response = await datastore.runQuery(query, options);

          expect(response).toEqual({
            refId: 'A',
            name: 'A',
            fields: [
              {
                name: 'Alarm name',
                type: 'string',
                values: ['High Temperature Alarm'],
              },
              {
                name: 'Transition condition',
                type: 'string',
                values: ['Temperature'],
              },
              {
                name: 'Transition detail',
                type: 'string',
                values: ['Temperature exceeded threshold'],
              },
              {
                name: 'Transition keywords',
                type: 'other',
                values: [['temperature', 'high']],
              },
              {
                name: 'Transition occurred at',
                type: 'time',
                values: ['2025-09-16T09:00:00Z'],
              },
              {
                name: 'Transition properties',
                type: 'other',
                values: [{"sensorId":"SENSOR-12"}],
              },
              {
                name: 'Transition severity',
                type: 'string',
                values: ['High (3)'],
              },
              {
                name: 'Transition short text',
                type: 'string',
                values: ['Temp High'],
              },
              {
                name: 'Transition type',
                type: 'string',
                values: ['SET'],
              },
              {
                name: 'Transition value',
                type: 'string',
                values: ['High'],
              },
            ],
          });
        });

        it('should not duplicate transition specific properties when transition inclusion option is MOST_RECENT_ONLY', async () => {
          const query = buildAlarmsQuery({
            properties: [AlarmsSpecificProperties.displayName, ...TRANSITION_SPECIFIC_PROPERTIES],
            transitionInclusionOption: TransitionInclusionOption.MostRecentOnly,
            take: 500,
          });
          const spy = jest.spyOn(datastore as any, 'duplicateAlarmsByTransitions');

          const response = await datastore.runQuery(query, options);

          expect(spy).not.toHaveBeenCalled();
          expect(response).toEqual({
            refId: 'A',
            name: 'A',
            fields: [
              {
                name: 'Alarm name',
                type: 'string',
                values: ['High Temperature Alarm'],
              },
              {
                name: 'Transition condition',
                type: 'string',
                values: ['Temperature'],
              },
              {
                name: 'Transition detail',
                type: 'string',
                values: ['Temperature exceeded threshold'],
              },
              {
                name: 'Transition keywords',
                type: 'other',
                values: [['temperature', 'high']],
              },
              {
                name: 'Transition occurred at',
                type: 'time',
                values: ['2025-09-16T09:00:00Z'],
              },
              {
                name: 'Transition properties',
                type: 'other',
                values: [{"sensorId":"SENSOR-12"}],
              },
              {
                name: 'Transition severity',
                type: 'string',
                values: ['High (3)'],
              },
              {
                name: 'Transition short text',
                type: 'string',
                values: ['Temp High'],
              },
              {
                name: 'Transition type',
                type: 'string',
                values: ['SET'],
              },
              {
                name: 'Transition value',
                type: 'string',
                values: ['High'],
              },
            ],
          });
        });

        it('should map string based transition properties correctly', async () => {
          const query = buildAlarmsQuery({
            properties: [
              AlarmsTransitionProperties.transitionCondition,
              AlarmsTransitionProperties.transitionDetailText,
              AlarmsTransitionProperties.transitionShortText,
              AlarmsTransitionProperties.transitionValue,
              AlarmsTransitionProperties.transitionType,
            ],
            transitionInclusionOption: TransitionInclusionOption.All,
            take: 500,
          });  
          jest.spyOn(datastore as any, 'queryAlarmsInBatches').mockResolvedValueOnce(
            buildAlarmsResponse([
              {
                transitions: [
                  mockTransition1,
                  {
                    ...mockTransition2,
                    condition: '',
                    detailText: '',
                    shortText: '',
                    value: '',
                  },
                ],
              }
            ])
          );

          const response = await datastore.runQuery(query, options);

          expect(response).toEqual({
            refId: 'A',
            name: 'A',
            fields: [
              {
                name: 'Transition condition',
                type: 'string',
                values: ['Temperature', ''],
              },
              {
                name: 'Transition detail',
                type: 'string',
                values: ['Temperature exceeded threshold', ''],
              },
              {
                name: 'Transition short text',
                type: 'string',
                values: ['Temp High', ''],
              },
              {
                name: 'Transition value',
                type: 'string',
                values: ['High', ''],
              },
              {
                name: 'Transition type',
                type: 'string',
                values: ['SET', 'CLEAR'],
              }
            ],
          });
        });

        it('should map transition severity level property correctly', async () => {
          const query = buildAlarmsQuery({
            properties: [AlarmsTransitionProperties.transitionSeverityLevel],
            transitionInclusionOption: TransitionInclusionOption.All,
            take: 500,
          });
          jest.spyOn(datastore as any, 'queryAlarmsInBatches').mockResolvedValueOnce(
            buildAlarmsResponse([
              {
                transitions: [
                  mockTransition1,
                  {
                    ...mockTransition2,
                    severityLevel: -1,
                  },
                  {
                    ...mockTransition2,
                    severityLevel: 0,
                  },
                  {
                    ...mockTransition2,
                    severityLevel: 1,
                  },
                  {
                    ...mockTransition2,
                    severityLevel: 2,
                  },
                  {
                    ...mockTransition2,
                    severityLevel: 4,
                  },
                  {
                    ...mockTransition2,
                    severityLevel: 5,
                  },
                ],
              }
            ])
          );

          const result = await datastore.runQuery(query, options);

          expect(result).toEqual({
            refId: 'A',
            name: 'A',
            fields: [
              {
                name: 'Transition severity',
                type: 'string',
                values: [
                  "High (3)",
                  "Clear",
                  "",
                  "Low (1)",
                  "Moderate (2)",
                  "Critical (4)",
                  "Critical (5)",
                ]
              },
            ],
          });
        });

        it('should map time based transition properties correctly', async () => {
          const query = buildAlarmsQuery({
            properties: [AlarmsTransitionProperties.transitionOccurredAt],
            transitionInclusionOption: TransitionInclusionOption.All,
            take: 500,
          });

          const result = await datastore.runQuery(query, options);

          expect(result).toEqual({
            refId: 'A',
            name: 'A',
            fields: [
              {
                name: 'Transition occurred at',
                type: 'time',
                values: [
                  '2025-09-16T09:00:00Z',
                ],
              },
            ],
          });
        });

        it('should map transition keywords field correctly', async () => {
          const query = buildAlarmsQuery({
            properties: [AlarmsTransitionProperties.transitionKeywords],
            transitionInclusionOption: TransitionInclusionOption.All,
            take: 500,
          });
          jest.spyOn(datastore as any, 'queryAlarmsInBatches').mockResolvedValueOnce(
            buildAlarmsResponse([
              {
                transitions: [
                  mockTransition1,
                  {
                    ...mockTransition2,
                    keywords: [],
                  },
                  {
                    ...mockTransition2,
                    keywords: ['single keyword'],
                  },
                ],
              }
            ])
          );

          const result = await datastore.runQuery(query, options);

          expect(result).toEqual({
            refId: 'A',
            name: 'A',
            fields: [
              {
                name: 'Transition keywords',
                type: 'other',
                values: [
                  ['temperature', 'high'],
                  [],
                  ['single keyword'],
                ],
              },
            ],
          });
        });

        it('should map transition properties field correctly', async () => {
          const query = buildAlarmsQuery({
            properties: [AlarmsTransitionProperties.transitionProperties],
            transitionInclusionOption: TransitionInclusionOption.All,
            take: 500,
          });
          jest.spyOn(datastore as any, 'queryAlarmsInBatches').mockResolvedValueOnce(
            buildAlarmsResponse([
              {
                transitions: [
                  mockTransition1,
                  {
                    ...mockTransition2,
                    properties: {},
                  },
                  {
                    ...mockTransition2,
                    properties: { zProp: 'value1', aProp: 'value2' },
                  },
                  {
                    ...mockTransition2,
                    properties: { nitagProp1: 'value1', aProp2: 'value2' },
                  },
                ],
              },
            ])
          );

          const result = await datastore.runQuery(query, options);

          expect(result).toEqual({
            refId: 'A',
            name: 'A',
            fields: [
              {
                name: 'Transition properties',
                type: 'other',
                values: [
                  {"sensorId":"SENSOR-12"},
                  {},
                  {"aProp":"value2","zProp":"value1"},
                  {"aProp2":"value2"},
                ],
              },
            ],
          });
        });

        it('should map string based transition properties correctly when transition inclusion option is most recent only', async () => {
          const query = buildAlarmsQuery({
            properties: [
              AlarmsTransitionProperties.transitionCondition,
              AlarmsTransitionProperties.transitionDetailText,
              AlarmsTransitionProperties.transitionShortText,
              AlarmsTransitionProperties.transitionValue,
              AlarmsTransitionProperties.transitionType,
            ],
            transitionInclusionOption: TransitionInclusionOption.MostRecentOnly,
            take: 500,
          });
          jest.spyOn(datastore as any, 'queryAlarmsInBatches').mockResolvedValueOnce(
            buildAlarmsResponse([
              {
                transitions: [mockTransition1],
              },
              {
                transitions: [
                  {
                    ...mockTransition2,
                    condition: '',
                    detailText: '',
                    shortText: '',
                    value: '',
                    transitionType: AlarmTransitionType.Clear,
                  },
                ],
              }
            ])
          );

          const response = await datastore.runQuery(query, options);

          expect(response).toEqual({
            refId: 'A',
            name: 'A',
            fields: [
              {
                name: 'Transition condition',
                type: 'string',
                values: ['Temperature', ''],
              },
              {
                name: 'Transition detail',
                type: 'string',
                values: ['Temperature exceeded threshold', ''],
              },
              {
                name: 'Transition short text',
                type: 'string',
                values: ['Temp High', ''],
              },
              {
                name: 'Transition value',
                type: 'string',
                values: ['High', ''],
              },
              {
                name: 'Transition type',
                type: 'string',
                values: ['SET', 'CLEAR'],
              }
            ],
          });
        });

        it('should map transition severity level property correctly when transition inclusion option is most recent only', async () => {
          const query = buildAlarmsQuery({
            properties: [AlarmsTransitionProperties.transitionSeverityLevel],
            transitionInclusionOption: TransitionInclusionOption.MostRecentOnly,
            take: 500,
          });
          jest.spyOn(datastore as any, 'queryAlarmsInBatches').mockResolvedValueOnce(
            buildAlarmsResponse([
              {
                transitions: [mockTransition1],
              },
              {
                transitions: [
                  {
                    ...mockTransition2,
                    severityLevel: -1,
                  },
                ],
              },
              {
                transitions: [
                  {
                    ...mockTransition2,
                    severityLevel: 0,
                  },
                ],
              },
              {
                transitions: [
                  {
                    ...mockTransition2,
                    severityLevel: 1,
                  },
                ],
              },
              {
                transitions: [
                  {
                    ...mockTransition2,
                    severityLevel: 2,
                  },
                ],
              },
              {
                transitions: [
                  {
                    ...mockTransition2,
                    severityLevel: 4,
                  },
                ],
              },
              {
                transitions: [
                  {
                    ...mockTransition2,
                    severityLevel: 5,
                  },
                ],
              },
            ])
          );

          const result = await datastore.runQuery(query, options);

          expect(result).toEqual({
            refId: 'A',
            name: 'A',
            fields: [
              {
                name: 'Transition severity',
                type: 'string',
                values: [
                  "High (3)",
                  "Clear",
                  "",
                  "Low (1)",
                  "Moderate (2)",
                  "Critical (4)",
                  "Critical (5)",
                ]
              },
            ],
          });
        });

        it('should map time based transition properties correctly when transition inclusion option is most recent only', async () => {
          const query = buildAlarmsQuery({
            properties: [AlarmsTransitionProperties.transitionOccurredAt],
            transitionInclusionOption: TransitionInclusionOption.MostRecentOnly,
            take: 500,
          });

          const result = await datastore.runQuery(query, options);

          expect(result).toEqual({
            refId: 'A',
            name: 'A',
            fields: [
              {
                name: 'Transition occurred at',
                type: 'time',
                values: [
                  '2025-09-16T09:00:00Z',
                ],
              },
            ],
          });
        });

        it('should map transition keywords field correctly when transition inclusion options is most recent only', async () => {
          const query = buildAlarmsQuery({
            properties: [AlarmsTransitionProperties.transitionKeywords],
            transitionInclusionOption: TransitionInclusionOption.MostRecentOnly,
            take: 500,
          });
          jest.spyOn(datastore as any, 'queryAlarmsInBatches').mockResolvedValueOnce(
            buildAlarmsResponse([
              {
                transitions: [mockTransition1],
              },
              {
                transitions: [
                  {
                    ...mockTransition2,
                    keywords: [],
                  },
                ],
              },
              {
                transitions: [
                  {
                    ...mockTransition2,
                    keywords: ['single keyword'],
                  },
                ],
              },
            ])
          );

          const result = await datastore.runQuery(query, options);

          expect(result).toEqual({
            refId: 'A',
            name: 'A',
            fields: [
              {
                name: 'Transition keywords',
                type: 'other',
                values: [
                  ['temperature', 'high'],
                  [],
                  ['single keyword'],
                ],
              },
            ],
          });
        });

        it('should map transition properties field correctly when transition inclusion option is most recent only', async () => {
          const query = buildAlarmsQuery({
            properties: [AlarmsTransitionProperties.transitionProperties],
            transitionInclusionOption: TransitionInclusionOption.MostRecentOnly,
            take: 500,
          });
          jest.spyOn(datastore as any, 'queryAlarmsInBatches').mockResolvedValueOnce(
            buildAlarmsResponse([
              {
                transitions: [mockTransition1],
              },
              {
                transitions: [
                  {
                    ...mockTransition2,
                    properties: {},
                  },
                ],
              },
              {
                transitions: [
                  {
                    ...mockTransition2,
                    properties: { zProp: 'value1', aProp: 'value2' },
                  },
                ],
              },
              {
                transitions: [
                  {
                    ...mockTransition2,
                    properties: { nitagProp1: 'value1', aProp2: 'value2' },
                  },
                ],
              },
            ])
          );

          const result = await datastore.runQuery(query, options);

          expect(result).toEqual({
            refId: 'A',
            name: 'A',
            fields: [
              {
                name: 'Transition properties',
                type: 'other',
                values: [
                  {"sensorId":"SENSOR-12"},
                  {},
                  {"aProp":"value2","zProp":"value1"},
                  {"aProp2":"value2"},
                ],
              },
            ],
          });
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

    it('should not call queryAlarmsData when take is invalid for the ALL transition inclusion option', async () => {
      const invalidTakeQuery = buildAlarmsQuery({
        take: 1000,
        transitionInclusionOption: TransitionInclusionOption.All,
      });
      const spy = jest.spyOn(datastore as any, 'queryAlarmsData');

      const result = await datastore.runQuery(invalidTakeQuery, options);

      expect(result).toEqual({ refId: 'A', name: 'A', fields: [] });
      expect(spy).not.toHaveBeenCalled();
    });

    [
      {
        take: 500,
        transitionInclusionOption: TransitionInclusionOption.All,
      },
      {
        take: 250,
        transitionInclusionOption: TransitionInclusionOption.MostRecentOnly,
      },
      {
        take: 100,
        transitionInclusionOption: TransitionInclusionOption.None,
      },
    ].forEach(({ take, transitionInclusionOption }) => {
      it(`should call queryAlarmsData when take is valid for the ${transitionInclusionOption} transition inclusion option`, async () => {
        const validTakeQuery = buildAlarmsQuery({ take, transitionInclusionOption });
        const spy = jest.spyOn(datastore as any, 'queryAlarmsData');

        await datastore.runQuery(validTakeQuery, options);

        expect(spy).toHaveBeenCalledWith(
          expect.objectContaining({
            take,
            transitionInclusionOption,
          })
        );
      });
    });

    describe('Total Count output type', () => {
      let query: ListAlarmsQuery;

      beforeEach(() => {
        query = buildAlarmsQuery({ outputType: OutputType.TotalCount });
      });

      it('should return total count of alarms from the API response', async () => {
        const response = await datastore.runQuery(query, options);

        expect(response).toEqual({
          refId: 'A',
          name: 'A',
          fields: [
            {
              name: 'A',
              type: 'number',
              values: [1],
            },
          ],
        });
      });

      it('should call the query alarms API with an empty filter, take set to 1 and returnCount set to true by default', async () => {
        await datastore.runQuery(query, options);

        expect(backendServer.fetch).toHaveBeenCalledWith(
          expect.objectContaining({
            url: expect.stringContaining(QUERY_ALARMS_RELATIVE_PATH),
            method: 'POST',
            data: { filter: '', take: 1, returnCount: true },
            showErrorAlert: false
          })
        );
      });

      it('should return 0 when totalCount is undefined', async () => {
        backendServer.fetch
        .calledWith(requestMatching({ url: QUERY_ALARMS_RELATIVE_PATH }))
        .mockReturnValue(createFetchResponse({ totalCount: undefined }));

        const result = await datastore.runQuery(query, options);

        expect(result).toEqual({ refId: 'A', name: 'A', fields: [{ name: 'A', type: 'number', values: [0] }] });
      });

      it('should pass the filter to the API', async () => {
        const filterQuery = buildAlarmsQuery({ outputType: OutputType.TotalCount, filter: 'alarmId = "test-alarm-123"' });

        await datastore.runQuery(filterQuery, options);

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
        const filterQuery = buildAlarmsQuery({ outputType: OutputType.TotalCount, filter: 'acknowledgedAt > "${__now:date}"'});

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
      const query = buildAlarmsQuery({ transitionInclusionOption: TransitionInclusionOption.MostRecentOnly });

      await datastore.runQuery(query, options);

      expect(backendServer.fetch).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            transitionInclusionOption: TransitionInclusionOption.MostRecentOnly,
          }),
        })
      );
    });

    it('should default to NONE transition inclusion option when not provided', async () => {
      const query = buildAlarmsQuery({ transitionInclusionOption: undefined });

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

  describe('alarms query caching', () => {
    it('should not call the API again when only properties change', async () => {
      const query1 = buildAlarmsQuery({ filter: 'test', properties: [AlarmsSpecificProperties.displayName] });
      const query2 = buildAlarmsQuery({ filter: 'test', properties: [AlarmsSpecificProperties.displayName, AlarmsSpecificProperties.workspace] });

      await datastore.runQuery(query1, options);
      backendServer.fetch.mockClear();

      await datastore.runQuery(query2, options);

      expect(backendServer.fetch).not.toHaveBeenCalledWith(
        requestMatching({ url: QUERY_ALARMS_RELATIVE_PATH })
      );
    });

    it('should call the API again when filter changes', async () => {
      const query1 = buildAlarmsQuery({ filter: 'filter-1' });
      const query2 = buildAlarmsQuery({ filter: 'filter-2' });

      await datastore.runQuery(query1, options);
      backendServer.fetch.mockClear();

      await datastore.runQuery(query2, options);

      expect(backendServer.fetch).toHaveBeenCalledWith(
        requestMatching({ url: QUERY_ALARMS_RELATIVE_PATH })
      );
    });

    it('should call the API again when take changes', async () => {
      const query1 = buildAlarmsQuery({ take: 500 });
      const query2 = buildAlarmsQuery({ take: 100 });

      await datastore.runQuery(query1, options);
      backendServer.fetch.mockClear();

      await datastore.runQuery(query2, options);

      expect(backendServer.fetch).toHaveBeenCalledWith(
        requestMatching({ url: QUERY_ALARMS_RELATIVE_PATH })
      );
    });

    it('should call the API again when descending changes', async () => {
      const query1 = buildAlarmsQuery({ descending: true });
      const query2 = buildAlarmsQuery({ descending: false });

      await datastore.runQuery(query1, options);
      backendServer.fetch.mockClear();

      await datastore.runQuery(query2, options);

      expect(backendServer.fetch).toHaveBeenCalledWith(
        requestMatching({ url: QUERY_ALARMS_RELATIVE_PATH })
      );
    });

    it('should call the API again when transitionInclusionOption changes', async () => {
      const query1 = buildAlarmsQuery({ transitionInclusionOption: TransitionInclusionOption.None });
      const query2 = buildAlarmsQuery({ transitionInclusionOption: TransitionInclusionOption.MostRecentOnly });

      await datastore.runQuery(query1, options);
      backendServer.fetch.mockClear();

      await datastore.runQuery(query2, options);

      expect(backendServer.fetch).toHaveBeenCalledWith(
        requestMatching({ url: QUERY_ALARMS_RELATIVE_PATH })
      );
    });

    it('should not thrash cache when multiple query editors have different filters', async () => {
      const queryA = buildAlarmsQuery({ refId: 'A', filter: 'filter-A', properties: [AlarmsSpecificProperties.displayName] });
      const queryB = buildAlarmsQuery({ refId: 'B', filter: 'filter-B', properties: [AlarmsSpecificProperties.displayName] });

      await datastore.runQuery(queryA, options);
      await datastore.runQuery(queryB, options);
      backendServer.fetch.mockClear();

      const queryA2 = buildAlarmsQuery({ refId: 'A', filter: 'filter-A', properties: [AlarmsSpecificProperties.displayName, AlarmsSpecificProperties.workspace] });
      const queryB2 = buildAlarmsQuery({ refId: 'B', filter: 'filter-B', properties: [AlarmsSpecificProperties.displayName, AlarmsSpecificProperties.workspace] });

      await datastore.runQuery(queryA2, options);
      await datastore.runQuery(queryB2, options);

      expect(backendServer.fetch).not.toHaveBeenCalledWith(
        requestMatching({ url: QUERY_ALARMS_RELATIVE_PATH })
      );
    });

    it('should call the API again on refresh when query is identical', async () => {
      const query = buildAlarmsQuery({ filter: 'test', properties: [AlarmsSpecificProperties.displayName] });

      await datastore.runQuery(query, options);
      backendServer.fetch.mockClear();

      await datastore.runQuery(query, options);

      expect(backendServer.fetch).toHaveBeenCalledWith(
        requestMatching({ url: QUERY_ALARMS_RELATIVE_PATH })
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
