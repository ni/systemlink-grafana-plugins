import { MockProxy } from 'jest-mock-extended';
import { SystemDataSource } from './SystemDataSource';
import { BackendSrv, TemplateSrv } from '@grafana/runtime';
import { createFetchError, createFetchResponse, getQueryBuilder, requestMatching, setupDataSource } from 'test/fixtures';
import { SystemProperties, SystemQuery, SystemQueryType } from './types';
import { firstValueFrom } from 'rxjs';

let ds: SystemDataSource, backendSrv: MockProxy<BackendSrv>, templateSrv: MockProxy<TemplateSrv>;

beforeEach(() => {
  [ds, backendSrv, templateSrv] = setupDataSource(SystemDataSource);
});

const buildQuery = getQueryBuilder<SystemQuery>()({ systemName: '', workspace: '', filter: '' });

describe('testing connection to the data source', () => {
  test('should return success when able to fetch summary', async () => {
    backendSrv.fetch
      .calledWith(requestMatching({ url: '/nisysmgmt/v1/get-systems-summary' }))
      .mockReturnValue(createFetchResponse({ connectedCount: 5, disconnectedCount: 3 }));

    const result = await ds.testDatasource();

    expect(result).toEqual({ status: 'success', message: 'Data source connected and authentication successful!' });
  });

  test('should return error when unable to fetch summary', async () => {
    backendSrv.fetch
      .calledWith(requestMatching({ url: '/nisysmgmt/v1/get-systems-summary' }))
      .mockReturnValue(createFetchError(400));

    await expect(ds.testDatasource()).rejects.toThrow('Request to url \"/nisysmgmt/v1/get-systems-summary\" failed with status code: 400. Error message: \"Error\"');
  });
});

describe('queries', () => {
  describe('query for summary counts', () => {
    test('should return summary counts', async () => {
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

    test('should handle API errors gracefully', async () => {
      backendSrv.fetch
        .calledWith(requestMatching({ url: '/nisysmgmt/v1/get-systems-summary' }))
        .mockReturnValue(createFetchError(500));

      await expect(firstValueFrom(ds.query(buildQuery({ queryKind: SystemQueryType.Summary })))).rejects.toThrow('Request to url \"/nisysmgmt/v1/get-systems-summary\" failed with status code: 500. Error message: \"Error\"');
    });
  });

  describe('query for system properties', () => {
    test('should return properties for all systems', async () => {
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

    test('should return properties for single system', async () => {
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
          refId: 'A'
        }
      ]);
    });

    test('should replace template variables in system name', async () => {
      templateSrv.replace.calledWith('(id = "$system_id" || alias = "$system_id")', expect.any(Object)).mockReturnValue('(id = "system-1" || alias = "system-1")');
      backendSrv.fetch
        .mockReturnValue(createFetchResponse({ data: [fakeSystems[0]] }));

      await firstValueFrom(ds.query(buildQuery({ queryKind: SystemQueryType.Properties, systemName: '$system_id' })));

      expect(backendSrv.fetch.mock.lastCall?.[0].data).toHaveProperty('filter', '(id = "system-1" || alias = "system-1")');
    });

    test('should handle API errors gracefully', async () => {
      backendSrv.fetch
        .calledWith(requestMatching({ url: '/nisysmgmt/v1/query-systems' }))
        .mockReturnValue(createFetchError(500));

      await expect(firstValueFrom(ds.query(buildQuery({ queryKind: SystemQueryType.Properties })))).rejects.toThrow('Request to url "/nisysmgmt/v1/query-systems" failed with status code: 500. Error message: "Error"');
    });
  });

  describe('shouldRunQuery', () => {
    test('should return true when query is not hidden', () => {
      const query: SystemQuery = {
        hide: false,
        queryKind: SystemQueryType.Properties,
        systemName: '',
        workspace: '',
        refId: ''
      };
      expect(ds.shouldRunQuery(query)).toBe(true);
    });

    test('should return false when query is hidden', () => {
      const query: SystemQuery = {
        hide: true,
        queryKind: SystemQueryType.Properties,
        systemName: '',
        workspace: '',
        refId: ''
      };
      expect(ds.shouldRunQuery(query)).toBe(false);
    });
  });
});

describe('metricFindQuery', () => {
  test('should return system list for all workspaces', async () => {
    backendSrv.fetch
      .calledWith(requestMatching({ url: '/nisysmgmt/v1/query-systems', data: { projection: 'new(id,alias,scanCode)' } }))
      .mockReturnValue(createFetchResponse({ data: fakeSystems.map(({ id, alias, scanCode }) => ({ id, alias, scanCode })) }));

    const result = await ds.metricFindQuery({ workspace: '' });

    expect(result).toEqual([
      { text: 'my system', value: 'system-1' },
      { text: 'Cool system 😎', value: 'system-2' },
    ]);
  });

  test('should return system list filtered by workspace', async () => {
    backendSrv.fetch.mockReturnValue(createFetchResponse({ data: fakeSystems.map(({ id, alias }) => ({ id, alias })) }));

    await ds.metricFindQuery({ workspace: '1' });

    expect(backendSrv.fetch.mock.lastCall?.[0].data).toHaveProperty('filter', 'workspace = "1"');
  });

  test('should replace variables in properties query', async () => {
    const workspaceVariable = '$workspace';
    backendSrv.fetch.mockReturnValue(createFetchResponse({ data: fakeSystems }));
    templateSrv.replace.calledWith(`workspace = "${workspaceVariable}"`).mockReturnValue('workspace = "1"');

    await firstValueFrom(ds.query(buildQuery({ queryKind: SystemQueryType.Properties, filter: `workspace = "${workspaceVariable}"` })));

    expect(templateSrv.replace).toHaveBeenCalledTimes(1);
    expect(templateSrv.replace.mock.calls[0][0]).toContain(workspaceVariable);
  });

  test('should replace template variables in workspace filter (backward compatibility)', async () => {
    const workspaceVariable = '$workspace';
    backendSrv.fetch.mockReturnValue(createFetchResponse({ data: fakeSystems.map(({ id, alias, scanCode }) => ({ id, alias, scanCode })) }));

    templateSrv.replace.mockReturnValue('workspace = "1"');

    await ds.metricFindQuery({ workspace: workspaceVariable, filter: '' });

    expect(templateSrv.replace).toHaveBeenCalledTimes(1);
    expect(templateSrv.replace).toHaveBeenCalledWith('workspace = "$workspace"', {});
    expect(backendSrv.fetch.mock.lastCall?.[0].data).toHaveProperty('filter', 'workspace = "1"');
  });

  test('should handle scopedVars in options parameter', async () => {
    const workspaceVariable = '$workspace';
    const scopedVars = { workspace: { text: '2', value: '2' } };
    backendSrv.fetch.mockReturnValue(createFetchResponse({ data: fakeSystems.map(({ id, alias, scanCode }) => ({ id, alias, scanCode })) }));
    templateSrv.replace.calledWith(`workspace = "${workspaceVariable}"`, scopedVars).mockReturnValue('workspace = "2"');

    await ds.metricFindQuery({ workspace: '', filter: `workspace = "${workspaceVariable}"` }, { scopedVars });

    expect(templateSrv.replace).toHaveBeenCalledWith(expect.stringContaining(workspaceVariable), scopedVars);
    expect(backendSrv.fetch.mock.lastCall?.[0].data).toHaveProperty('filter', 'workspace = "2"');
  });
});

describe('System filter transformation', () => {
  beforeEach(() => {
    backendSrv.fetch.mockReturnValue(createFetchResponse({ data: [] }));
  });

  test('should handle multi-value transform of "scanCode" with "!=" operator', async () => {
    const query: SystemQuery = {
      refId: 'A',
      queryKind: SystemQueryType.Properties,
      systemName: '',
      workspace: '',
      filter: `scanCode != "{scan1,scan2}"`
    };

    await firstValueFrom(ds.query(buildQuery(query)));

    expect(backendSrv.fetch.mock.lastCall?.[0].data).toHaveProperty(
      'filter',
      '(scanCode != "scan1" && scanCode != "scan2")'
    );
  });

  test('should handle multi-value transform of "scanCode" with "=" operator', async () => {
    const query: SystemQuery = {
      refId: 'A',
      queryKind: SystemQueryType.Properties,
      systemName: '',
      workspace: '',
      filter: `scanCode = "{scan1,scan2,scan3}"`
    };

    await firstValueFrom(ds.query(buildQuery(query)));

    expect(backendSrv.fetch.mock.lastCall?.[0].data).toHaveProperty(
      'filter',
      '(scanCode = "scan1" || scanCode = "scan2" || scanCode = "scan3")'
    );
  });

  test('should handle multi-value transform of "id" with "=" operator', async () => {
    const query: SystemQuery = {
      refId: 'A',
      queryKind: SystemQueryType.Properties,
      systemName: '',
      workspace: '',
      filter: `id = "{system1,system2,system3}"`
    };

    await firstValueFrom(ds.query(buildQuery(query)));

    expect(backendSrv.fetch.mock.lastCall?.[0].data).toHaveProperty(
      'filter',
      '(id = "system1" || id = "system2" || id = "system3")'
    );
  });

  test('should handle multi-value transform of "id" with "!=" operator', async () => {
    const query: SystemQuery = {
      refId: 'A',
      queryKind: SystemQueryType.Properties,
      systemName: '',
      workspace: '',
      filter: `id != "{system1,system2}"`
    };

    await firstValueFrom(ds.query(buildQuery(query)));

    expect(backendSrv.fetch.mock.lastCall?.[0].data).toHaveProperty(
      'filter',
      '(id != "system1" && id != "system2")'
    );
  });

  test('should handle boolean field with "!=" operator', async () => {
    const query: SystemQuery = {
      refId: 'A',
      queryKind: SystemQueryType.Properties,
      systemName: '',
      workspace: '',
      filter: `grains.data.minion_blackout != "true"`
    };

    await firstValueFrom(ds.query(buildQuery(query)));

    expect(backendSrv.fetch.mock.lastCall?.[0].data).toHaveProperty(
      'filter',
      '!grains.data.minion_blackout.Equals(true)'
    );
  });
});

describe('backward compatibility - legacy systemName and workspace migration', () => {
  beforeEach(() => {
    backendSrv.fetch.mockReturnValue(createFetchResponse({ data: [] }));
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

    expect(backendSrv.fetch.mock.lastCall?.[0].data).toHaveProperty(
      'filter',
      '(id = "my-system" || alias = "my-system")'
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

    expect(backendSrv.fetch.mock.lastCall?.[0].data).toHaveProperty(
      'filter',
      'workspace = "workspace-1"'
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

    expect(backendSrv.fetch.mock.lastCall?.[0].data).toHaveProperty(
      'filter',
      'state = "CONNECTED" && (id = "my-system" || alias = "my-system")'
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

    expect(backendSrv.fetch.mock.lastCall?.[0].data).toHaveProperty(
      'filter',
      '(id = "my-system" || alias = "my-system")'
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
