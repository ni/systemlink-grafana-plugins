import { MockProxy } from 'jest-mock-extended';
import { SystemDataSource } from './SystemDataSource';
import { BackendSrv, TemplateSrv } from '@grafana/runtime';
import { createFetchResponse, getQueryBuilder, requestMatching, setupDataSource } from 'test/fixtures';
import { SystemProperties, SystemQuery, SystemQueryType } from './types';
import { firstValueFrom } from 'rxjs';

let ds: SystemDataSource, backendSrv: MockProxy<BackendSrv>, templateSrv: MockProxy<TemplateSrv>;

beforeEach(() => {
  [ds, backendSrv, templateSrv] = setupDataSource(SystemDataSource);
});

const buildQuery = getQueryBuilder<SystemQuery>()({ systemName: '', workspace: '', filter: '' });

test('query for summary counts', async () => {
  backendSrv.fetch
    .calledWith(requestMatching({ url: '/nisysmgmt/v1/get-systems-summary' }))
    .mockReturnValue(createFetchResponse({ connectedCount: 1, disconnectedCount: 2 }));

  const result = await firstValueFrom(ds.query(buildQuery({ queryKind: SystemQueryType.Summary })));

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

test('query properties for all systems', async () => {
  backendSrv.fetch
    .calledWith(requestMatching({ url: '/nisysmgmt/v1/query-systems', data: { filter: '' } }))
    .mockReturnValue(createFetchResponse({ data: fakeSystems }));

  const result = await firstValueFrom(ds.query(buildQuery({ queryKind: SystemQueryType.Properties })));

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
        { name: 'scan code', values: ['ABC123DEF456', 'ABC123DEF457'] },
      ],
      refId: 'A',
    },
  ]);
});

test('query properties for one system', async () => {
  backendSrv.fetch
    .calledWith(
      requestMatching({ url: '/nisysmgmt/v1/query-systems', data: { filter: '(id = "system-1" || alias = "system-1")' } })
    )
    .mockReturnValue(createFetchResponse({ data: [fakeSystems[0]] }));

  const result = await firstValueFrom(ds.query(buildQuery({ queryKind: SystemQueryType.Properties, systemName: 'system-1' })));

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
        { name: 'scan code', values: ['ABC123DEF456'] },
      ],
      refId: 'A',
    },
  ]);
});

test('query properties with templated system name', async () => {
  templateSrv.replace.calledWith('(id = "$system_id" || alias = "$system_id")', expect.any(Object)).mockReturnValue('(id = "system-1" || alias = "system-1")');
  backendSrv.fetch
    .mockReturnValue(createFetchResponse({ data: [fakeSystems[0]] }));

  await firstValueFrom(ds.query(buildQuery({ queryKind: SystemQueryType.Properties, systemName: '$system_id' })));

  expect(backendSrv.fetch.mock.lastCall?.[0].data).toHaveProperty('filter', '(id = "system-1" || alias = "system-1")');
});

test('queries for system variable values - all workspaces', async () => {
  backendSrv.fetch
    .calledWith(requestMatching({ url: '/nisysmgmt/v1/query-systems', data: { projection: 'new(id,alias,scanCode)' } }))
    .mockReturnValue(createFetchResponse({ data: fakeSystems.map(({ id, alias, scanCode }) => ({ id, alias, scanCode })) }));

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
  templateSrv.replace.calledWith(`workspace = "${workspaceVariable}"`).mockReturnValue('workspace = "1"');

  await firstValueFrom(ds.query(buildQuery({ queryKind: SystemQueryType.Properties, filter: `workspace = "${workspaceVariable}"` })));

  expect(templateSrv.replace).toHaveBeenCalledTimes(1);
  expect(templateSrv.replace.mock.calls[0][0]).toContain(workspaceVariable);
});

test('attempts to replace variables in metricFindQuery', async () => {
  const workspaceVariable = '$workspace';
  backendSrv.fetch.mockReturnValue(createFetchResponse({ data: fakeSystems.map(({ id, alias }) => ({ id, alias })) }));
  templateSrv.replace.calledWith(workspaceVariable).mockReturnValue('1');

  await ds.metricFindQuery({ workspace: workspaceVariable });

  expect(templateSrv.replace).toHaveBeenCalledTimes(1);
  expect(templateSrv.replace.mock.calls[0][0]).toBe(workspaceVariable);
});

test('should not run query if hidden', () => {
  const query: SystemQuery = {
    hide: true,
    queryKind: SystemQueryType.Properties,
    systemName: '',
    workspace: '',
    refId: ''
  };
  expect(ds.shouldRunQuery(query)).toBe(false);
});

describe('System filter transformation', () => {
  let getSystemPropertiesSpy: jest.SpyInstance;

  beforeEach(() => {
    getSystemPropertiesSpy = jest.spyOn(ds, 'getSystemProperties' as any).mockResolvedValue([]);
  });

  test('should transform scan code field with multi-value does not equal operator', async () => {
    const query: SystemQuery = {
      refId: 'A',
      queryKind: SystemQueryType.Properties,
      systemName: '',
      workspace: '',
      filter: `scanCode != "{scan1,scan2}"`
    };

    await firstValueFrom(ds.query(buildQuery(query)));

    expect(getSystemPropertiesSpy).toHaveBeenCalledWith(
      '(scanCode != "scan1" && scanCode != "scan2")',
      expect.any(Array)
    );
  });

  test('should transform scan code field with multi-value equals operator', async () => {
    const query: SystemQuery = {
      refId: 'A',
      queryKind: SystemQueryType.Properties,
      systemName: '',
      workspace: '',
      filter: `scanCode = "{scan1,scan2,scan3}"`
    };

    await firstValueFrom(ds.query(buildQuery(query)));

    expect(getSystemPropertiesSpy).toHaveBeenCalledWith(
      '(scanCode = "scan1" || scanCode = "scan2" || scanCode = "scan3")',
      expect.any(Array)
    );
  });

  test('should transform minion id field with multi-value equals operator', async () => {
    const query: SystemQuery = {
      refId: 'A',
      queryKind: SystemQueryType.Properties,
      systemName: '',
      workspace: '',
      filter: `id = "{system1,system2,system3}"`
    };

    await firstValueFrom(ds.query(buildQuery(query)));

    expect(getSystemPropertiesSpy).toHaveBeenCalledWith(
      '(id = "system1" || id = "system2" || id = "system3")',
      expect.any(Array)
    );
  });

  test('should transform minion id field with multi-value does not equal operator', async () => {
    const query: SystemQuery = {
      refId: 'A',
      queryKind: SystemQueryType.Properties,
      systemName: '',
      workspace: '',
      filter: `id != "{system1,system2}"`
    };

    await firstValueFrom(ds.query(buildQuery(query)));

    expect(getSystemPropertiesSpy).toHaveBeenCalledWith(
      '(id != "system1" && id != "system2")',
      expect.any(Array)
    );
  });

  test('should transform boolean field with does not equal operator', async () => {
    const query: SystemQuery = {
      refId: 'A',
      queryKind: SystemQueryType.Properties,
      systemName: '',
      workspace: '',
      filter: `lockedStatus != "true"`
    };

    await firstValueFrom(ds.query(buildQuery(query)));

    expect(getSystemPropertiesSpy).toHaveBeenCalledWith(
      '!grains.data.minion_blackout.Equals(true)',
      expect.any(Array)
    );
  });

  test('should transform boolean field with multi-value equals operator', async () => {
    const query: SystemQuery = {
      refId: 'A',
      queryKind: SystemQueryType.Properties,
      systemName: '',
      workspace: '',
      filter: `lockedStatus = "{true,false}"`
    };

    await firstValueFrom(ds.query(buildQuery(query)));

    expect(getSystemPropertiesSpy).toHaveBeenCalledWith(
      '(grains.data.minion_blackout.Equals(true) || grains.data.minion_blackout.Equals(false))',
      expect.any(Array)
    );
  });

  test('should transform boolean field with multi-value does not equal operator', async () => {
    const query: SystemQuery = {
      refId: 'A',
      queryKind: SystemQueryType.Properties,
      systemName: '',
      workspace: '',
      filter: `lockedStatus != "{true,false}"`
    };

    await firstValueFrom(ds.query(buildQuery(query)));

    expect(getSystemPropertiesSpy).toHaveBeenCalledWith(
      '(!grains.data.minion_blackout.Equals(true) && !grains.data.minion_blackout.Equals(false))',
      expect.any(Array)
    );
  });
});

describe('backward compatibility - legacy systemName and workspace migration', () => {
  let getSystemPropertiesSpy: jest.SpyInstance;

  beforeEach(() => {
    getSystemPropertiesSpy = jest.spyOn(ds, 'getSystemProperties' as any).mockResolvedValue([]);
  });

  test('should migrate systemName to minionId filter', async () => {
    const query: SystemQuery = {
      refId: 'A',
      queryKind: SystemQueryType.Properties,
      systemName: 'my-system',
      workspace: '',
      filter: ''
    };

    await firstValueFrom(ds.query(buildQuery(query)));

    expect(getSystemPropertiesSpy).toHaveBeenCalledWith(
      '(id = "my-system" || alias = "my-system")',
      expect.any(Array)
    );
  });

  test('should migrate workspace to filter when systemName is empty', async () => {
    const query: SystemQuery = {
      refId: 'A',
      queryKind: SystemQueryType.Properties,
      systemName: '',
      workspace: 'workspace-1',
      filter: ''
    };

    await firstValueFrom(ds.query(buildQuery(query)));

    expect(getSystemPropertiesSpy).toHaveBeenCalledWith(
      'workspace = "workspace-1"',
      expect.any(Array)
    );
  });

  test('should preserve existing filter and append migrated systemName', async () => {
    const query: SystemQuery = {
      refId: 'A',
      queryKind: SystemQueryType.Properties,
      systemName: 'my-system',
      workspace: '',
      filter: 'state = "CONNECTED"'
    };

    await firstValueFrom(ds.query(buildQuery(query)));

    expect(getSystemPropertiesSpy).toHaveBeenCalledWith(
      'state = "CONNECTED" && (id = "my-system" || alias = "my-system")',
      expect.any(Array)
    );
  });

  test('should not add workspace filter if systemName is provided', async () => {
    const query: SystemQuery = {
      refId: 'A',
      queryKind: SystemQueryType.Properties,
      systemName: 'my-system',
      workspace: 'workspace-1',
      filter: ''
    };

    await firstValueFrom(ds.query(buildQuery(query)));

    expect(getSystemPropertiesSpy).toHaveBeenCalledWith(
      '(id = "my-system" || alias = "my-system")',
      expect.any(Array)
    );
  });

  test('should clear systemName and workspace fields after migration', async () => {
    const query: SystemQuery = {
      refId: 'A',
      queryKind: SystemQueryType.Properties,
      systemName: 'my-system',
      workspace: 'workspace-1',
      filter: ''
    };

    const prepared = ds.prepareQuery(query);

    expect(prepared.systemName).toBe('');
    expect(prepared.workspace).toBe('');
    expect(prepared.filter).toBe('(id = "my-system" || alias = "my-system")');
  });
});

describe('UI field mapping', () => {
  let getSystemPropertiesSpy: jest.SpyInstance;

  beforeEach(() => {
    getSystemPropertiesSpy = jest.spyOn(ds, 'getSystemProperties' as any).mockResolvedValue([]);
  });

  test('should map connectionStatus UI field names to connected.data.state backend field names in filter', async () => {
    const query: SystemQuery = {
      refId: 'A',
      queryKind: SystemQueryType.Properties,
      systemName: '',
      workspace: '',
      filter: `connectionStatus = "CONNECTED" && scanCode = "ABC123DEF456"`
    };

    await firstValueFrom(ds.query(buildQuery(query)));

    expect(getSystemPropertiesSpy).toHaveBeenCalledWith(
      `connected.data.state = "CONNECTED" && scanCode = "ABC123DEF456"`,
      expect.any(Array)
    );
  });

  test('should map model UI field to grains.data.productname backend field', async () => {
    const query: SystemQuery = {
      refId: 'A',
      queryKind: SystemQueryType.Properties,
      systemName: '',
      workspace: '',
      filter: `model = "NI cRIO-9033"`
    };

    await firstValueFrom(ds.query(buildQuery(query)));

    expect(getSystemPropertiesSpy).toHaveBeenCalledWith(
      `grains.data.productname = "NI cRIO-9033"`,
      expect.any(Array)
    );
  });

  test('should map vendor UI field to grains.data.manufacturer backend field', async () => {
    const query: SystemQuery = {
      refId: 'A',
      queryKind: SystemQueryType.Properties,
      systemName: '',
      workspace: '',
      filter: `vendor = "National Instruments"`
    };

    await firstValueFrom(ds.query(buildQuery(query)));

    expect(getSystemPropertiesSpy).toHaveBeenCalledWith(
      `grains.data.manufacturer = "National Instruments"`,
      expect.any(Array)
    );
  });

  test('should map osFullName UI field to grains.data.osfullname backend field', async () => {
    const query: SystemQuery = {
      refId: 'A',
      queryKind: SystemQueryType.Properties,
      systemName: '',
      workspace: '',
      filter: `osFullName = "nilrt"`
    };

    await firstValueFrom(ds.query(buildQuery(query)));

    expect(getSystemPropertiesSpy).toHaveBeenCalledWith(
      `grains.data.osfullname = "nilrt"`,
      expect.any(Array)
    );
  });

  test('should map lockedStatus UI field to grains.data.minion_blackout backend field', async () => {
    const query: SystemQuery = {
      refId: 'A',
      queryKind: SystemQueryType.Properties,
      systemName: '',
      workspace: '',
      filter: `lockedStatus = "true"`
    };

    await firstValueFrom(ds.query(buildQuery(query)));

    expect(getSystemPropertiesSpy).toHaveBeenCalledWith(
      `grains.data.minion_blackout.Equals(true)`,
      expect.any(Array)
    );
  });

  test('should map multiple UI fields in a single filter', async () => {
    const query: SystemQuery = {
      refId: 'A',
      queryKind: SystemQueryType.Properties,
      systemName: '',
      workspace: '',
      filter: `connectionStatus = "CONNECTED" && osFullName = "nilrt" && lockedStatus != "true"`
    };

    await firstValueFrom(ds.query(buildQuery(query)));

    expect(getSystemPropertiesSpy).toHaveBeenCalledWith(
      `connected.data.state = "CONNECTED" && grains.data.osfullname = "nilrt" && !grains.data.minion_blackout.Equals(true)`,
      expect.any(Array)
    );
  });
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
    scanCode: 'ABC123DEF456',
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
    scanCode: 'ABC123DEF457',
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
