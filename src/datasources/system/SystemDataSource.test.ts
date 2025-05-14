import { MockProxy } from 'jest-mock-extended';
import { SystemDataSource } from './SystemDataSource';
import { BackendSrv, TemplateSrv } from '@grafana/runtime';
import { createFetchResponse, getQueryBuilder, requestMatching, setupDataSource } from 'test/fixtures';
import { SystemProperties, SystemQuery, SystemQueryType } from './types';

let ds: SystemDataSource, backendSrv: MockProxy<BackendSrv>, templateSrv: MockProxy<TemplateSrv>;

beforeEach(() => {
  [ds, backendSrv, templateSrv] = setupDataSource(SystemDataSource);
});

const buildQuery = getQueryBuilder<SystemQuery>()({ systemName: '', workspace: '' });

test('query for summary counts', async () => {
  backendSrv.fetch
    .calledWith(requestMatching({ url: '/nisysmgmt/v1/get-systems-summary' }))
    .mockReturnValue(createFetchResponse({ connectedCount: 1, disconnectedCount: 2 }));

  const response$ = ds.query(buildQuery({ queryKind: SystemQueryType.Summary }));
  response$.subscribe((result) => {
    expect(result.data).toEqual([
      {
        fields: [
          { name: 'Connected', values: [1] },
          { name: 'Disconnected', values: [2] },
        ],
        refId: 'A',
      },
    ]);
  });
});

test('query properties for all systems', async () => {
  backendSrv.fetch
    .calledWith(requestMatching({ url: '/nisysmgmt/v1/query-systems', data: { filter: '' } }))
    .mockReturnValue(createFetchResponse({ data: fakeSystems }));

  const response$ = ds.query(buildQuery({ queryKind: SystemQueryType.Properties }));
  response$.subscribe((result) => {
    expect(result.data).toEqual([
      {
        fields: [
          { name: 'id', values: ['system-1', 'system-2'] },
          { name: 'alias', values: ['my system', 'Cool system 😎'] },
          { name: 'connection status', values: ['CONNECTED', 'DISCONNECTED'] },
          { name: 'locked status', values: [false, true] },
          { name: 'system start time', values: ['2023-07-18T10:19:46Z', '2023-03-02T18:48:09Z'] },
          { name: 'model', values: ['NI cRIO-9033', '20LCS0X700'] },
          { name: 'vendor', values: ['National Instruments', 'LENOVO'] },
          { name: 'operating system', values: ['nilrt', 'Microsoft Windows 10 Enterprise'] },
          { name: 'ip address', values: ['172.17.0.1', 'fe80::280:2fff:fe24:fcfa'] },
          { name: 'workspace', values: ['Default workspace', 'Other workspace'] },
        ],
        refId: 'A',
      },
    ]);
  });
});

test('query properties for one system', async () => {
  backendSrv.fetch
    .calledWith(
      requestMatching({ url: '/nisysmgmt/v1/query-systems', data: { filter: 'id = "system-1" || alias = "system-1"' } })
    )
    .mockReturnValue(createFetchResponse({ data: [fakeSystems[0]] }));

  const response$ = ds.query(buildQuery({ queryKind: SystemQueryType.Properties, systemName: 'system-1' }));
  response$.subscribe((result) => {
    expect(result.data).toEqual([
      {
        fields: [
          { name: 'id', values: ['system-1'] },
          { name: 'alias', values: ['my system'] },
          { name: 'connection status', values: ['CONNECTED'] },
          { name: 'locked status', values: [false] },
          { name: 'system start time', values: ['2023-07-18T10:19:46Z'] },
          { name: 'model', values: ['NI cRIO-9033'] },
          { name: 'vendor', values: ['National Instruments'] },
          { name: 'operating system', values: ['nilrt'] },
          { name: 'ip address', values: ['172.17.0.1'] },
          { name: 'workspace', values: ['Default workspace'] },
        ],
        refId: 'A',
      },
    ]);
  });
});

test('query properties with templated system name', async () => {
  templateSrv.replace.calledWith('$system_id').mockReturnValue('system-1');
  backendSrv.fetch.mockReturnValue(createFetchResponse({ data: [fakeSystems[0]] }));

  ds.query(buildQuery({ queryKind: SystemQueryType.Properties, systemName: '$system_id' })).subscribe();

  expect(backendSrv.fetch.mock.lastCall?.[0].data).toHaveProperty('filter', 'id = "system-1" || alias = "system-1"');
});

test('queries for system variable values - all workspaces', async () => {
  backendSrv.fetch
    .calledWith(requestMatching({ url: '/nisysmgmt/v1/query-systems', data: { projection: 'new(id,alias)' } }))
    .mockReturnValue(createFetchResponse({ data: fakeSystems.map(({ id, alias }) => ({ id, alias })) }));

  const result = await ds.metricFindQuery({ workspace: '' });

  expect(result).toEqual([
    { text: 'my system', value: 'system-1' },
    { text: 'Cool system 😎', value: 'system-2' },
  ]);
});

test('queries for system variable values - single workspace', async () => {
  backendSrv.fetch.mockReturnValue(createFetchResponse({ data: fakeSystems.map(({ id, alias }) => ({ id, alias })) }));

  await ds.metricFindQuery({ workspace: '1' });

  expect(backendSrv.fetch.mock.lastCall?.[0].data).toHaveProperty('filter', 'workspace = "1"');
});

test('attempts to replace variables in properties query', async () => {
  const workspaceVariable = '$workspace';
  backendSrv.fetch.mockReturnValue(createFetchResponse({ data: fakeSystems }));
  templateSrv.replace.calledWith(workspaceVariable).mockReturnValue('1');

  ds.query(buildQuery({ queryKind: SystemQueryType.Properties, systemName: 'system', workspace: workspaceVariable })).subscribe();

  expect(templateSrv.replace).toHaveBeenCalledTimes(2);
  expect(templateSrv.replace.mock.calls[1][0]).toBe(workspaceVariable);
});

test('attempts to replace variables in metricFindQuery', async () => {
  const workspaceVariable = '$workspace';
  backendSrv.fetch.mockReturnValue(createFetchResponse({ data: fakeSystems.map(({ id, alias }) => ({ id, alias })) }));
  templateSrv.replace.calledWith(workspaceVariable).mockReturnValue('1');

  await ds.metricFindQuery({ workspace: workspaceVariable });

  expect(templateSrv.replace).toHaveBeenCalledTimes(1);
  expect(templateSrv.replace.mock.calls[0][0]).toBe(workspaceVariable);
});

const fakeSystems: SystemProperties[] = [
  {
    id: 'system-1',
    alias: 'my system',
    state: 'CONNECTED',
    locked: false,
    systemStartTime: '2023-07-18T10:19:46Z',
    model: 'NI cRIO-9033',
    vendor: 'National Instruments',
    osFullName: 'nilrt',
    ip4Interfaces: {
      cali816305ba9ce: [],
      calie2bed856fa8: [],
      docker0: ['172.17.0.1'],
      enp0s31f6: [],
      enp5s0: [],
      lo: ['127.0.0.1'],
      'ni-bridge': ['10.164.64.144'],
      'vxlan.calico': ['10.1.157.0'],
    },
    ip6Interfaces: {
      cali816305ba9ce: ['fe80::ecee:eeff:feee:eeee'],
      calie2bed856fa8: ['fe80::ecee:eeff:feee:eeee'],
      docker0: ['fe80::42:42ff:fe0f:811a'],
      enp0s31f6: [],
      enp5s0: [],
      lo: ['::1'],
      'ni-bridge': ['fe80::38b3:39ff:fe28:69bf'],
      'vxlan.calico': ['fe80::6486:2cff:fe02:5f49'],
    },
    workspace: '1',
  },
  {
    id: 'system-2',
    alias: 'Cool system 😎',
    state: 'DISCONNECTED',
    locked: true,
    systemStartTime: '2023-03-02T18:48:09Z',
    model: '20LCS0X700',
    vendor: 'LENOVO',
    osFullName: 'Microsoft Windows 10 Enterprise',
    ip4Interfaces: {
      usb0: [],
      eth1: [],
      eth0: [],
      lo: ['127.0.0.1'],
    },
    ip6Interfaces: {
      usb0: [],
      eth1: ['fe80::280:2fff:fe24:fcfa'],
      eth0: ['fe80::280:2fff:fe24:fcf9'],
      lo: ['::1'],
    },
    workspace: '2',
  },
];
