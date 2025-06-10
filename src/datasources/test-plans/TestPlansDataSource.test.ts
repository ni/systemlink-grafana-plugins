import { MockProxy } from "jest-mock-extended";
import { TestPlansDataSource } from "./TestPlansDataSource";
import { BackendSrv } from "@grafana/runtime";
import { createFetchError, createFetchResponse, requestMatching, setupDataSource } from "test/fixtures";
import { OrderByOptions, OutputType, Projections, Properties, QueryTestPlansResponse, TestPlansVariableQuery } from "./types";
import { DataQueryRequest, LegacyMetricFindQueryOptions } from "@grafana/data";

let datastore: TestPlansDataSource, backendServer: MockProxy<BackendSrv>;

const mockVariableQueryTestPlansResponse: QueryTestPlansResponse = {
  testPlans: [
    {
      id: '1',
      name: 'testPlan 1',
    },
    {
      id: '2',
      name: 'testPlan 2',
    }
  ],
  totalCount: 2
};

jest.mock('shared/system.utils', () => {
  return {
    SystemUtils: jest.fn().mockImplementation(() => ({
      getSystemAliases: jest.fn().mockResolvedValue(
        new Map([
          ['1', { id: '1', alias: 'System 1' }],
          ['2', { id: '2', alias: 'System 2' }],
        ])
      )
    }))
  };
});

jest.mock('shared/workspace.utils', () => {
  return {
    WorkspaceUtils: jest.fn().mockImplementation(() => ({
      getWorkspaces: jest.fn().mockResolvedValue(
        new Map([
          ['1', { id: '1', name: 'WorkspaceName' }],
          ['2', { id: '2', name: 'AnotherWorkspaceName' }],
        ])
      )
    }))
  };
});

jest.mock('./asset.utils', () => {
  return {
    AssetUtils: jest.fn().mockImplementation(() => ({
      queryAssetsInBatches: jest.fn().mockResolvedValue(
        [
          { id: '1', name: 'Asset 1', serialNumber: 'SN-1' },
          { id: '2', name: 'Asset 2', serialNumber: 'SN-2' }
        ]
      )
    }))
  };
});

const mockUsers = [
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

beforeEach(() => {
  [datastore, backendServer] = setupDataSource(TestPlansDataSource);

  jest.spyOn(datastore.usersUtils, 'getUsers').mockResolvedValue(
    new Map([
      ['1', mockUsers[0]],
      ['2', mockUsers[1]]
    ])
  );
});

describe('testDatasource', () => {
  test('returns success', async () => {
    backendServer.fetch
      .calledWith(requestMatching({ url: '/niworkorder/v1/query-testplans', data: { take: 1 } }))
      .mockReturnValue(createFetchResponse(25));

    const result = await datastore.testDatasource();

    expect(result.status).toEqual('success');
  });

  test('bubbles up exception', async () => {
    backendServer.fetch
      .calledWith(requestMatching({ url: '/niworkorder/v1/query-testplans', data: { take: 1 } }))
      .mockReturnValue(createFetchError(400));

    await expect(datastore.testDatasource())
      .rejects
      .toThrow('Request to url "/niworkorder/v1/query-testplans" failed with status code: 400. Error message: "Error"');
  });

  test('default query output type as properties and default properties', async () => {
    const defaultQuery = datastore.defaultQuery;
    expect(defaultQuery.outputType).toEqual(OutputType.Properties);
    expect(defaultQuery.properties).toEqual([
      Properties.NAME,
      Properties.STATE,
      Properties.ASSIGNED_TO,
      Properties.PRODUCT,
      Properties.DUT_ID,
      Properties.PLANNED_START_DATE_TIME,
      Properties.ESTIMATED_DURATION_IN_SECONDS,
      Properties.SYSTEM_NAME,
      Properties.UPDATED_AT
    ]);
    expect(defaultQuery.orderBy).toEqual(OrderByOptions.UPDATED_AT);
    expect(defaultQuery.descending).toEqual(true);
    expect(defaultQuery.recordCount).toEqual(1000);
  });
});

describe('runQuery', () => {
  const mockOptions: DataQueryRequest = {} as DataQueryRequest;

  test('returns data frame with fields when test plans are available', async () => {
    const query = {
      refId: 'A',
      outputType: OutputType.Properties,
      properties: [Properties.NAME, Properties.STATE],
      orderBy: OrderByOptions.UPDATED_AT,
      recordCount: 10,
      descending: true,
    };

    const testPlansResponse = {
      testPlans: [
        { id: '1', name: 'Test Plan 1', state: 'Active' },
        { id: '2', name: 'Test Plan 2', state: 'Completed' },
      ],
    };

    jest.spyOn(datastore, 'queryTestPlansInBatches').mockResolvedValue(testPlansResponse);

    const result = await datastore.runQuery(query, mockOptions);

    expect(result.fields).toHaveLength(2);
    expect(result.fields[0].name).toEqual('Name');
    expect(result.fields[0].values).toEqual(['Test Plan 1', 'Test Plan 2']);
    expect(result.fields[1].name).toEqual('State');
    expect(result.fields[1].values).toEqual(['Active', 'Completed']);
  });

  test('returns empty data frame when no test plans are available', async () => {
    const query = {
      refId: 'A',
      outputType: OutputType.Properties,
      properties: [Properties.NAME, Properties.STATE],
      orderBy: OrderByOptions.UPDATED_AT,
      recordCount: 10,
      descending: true,
    };

    jest.spyOn(datastore, 'queryTestPlansInBatches').mockResolvedValue({ testPlans: [] });

    const result = await datastore.runQuery(query, mockOptions);

    expect(result.fields).toHaveLength(0);
  });

  test('returns total count when output type is TotalCount', async () => {
    const query = {
      refId: 'A',
      outputType: OutputType.TotalCount,
      orderBy: OrderByOptions.UPDATED_AT,
      recordCount: 10,
      descending: true,
    };

    const testPlansResponse = {
      testPlans: [],
      totalCount: 42,
    };

    jest.spyOn(datastore, 'queryTestPlans').mockResolvedValue(testPlansResponse);

    const result = await datastore.runQuery(query, mockOptions);

    expect(result.fields).toHaveLength(1);
    expect(result.fields[0].name).toEqual('Total count');
    expect(result.fields[0].values).toEqual([42]);
  });

  test('returns empty total count when no test plans are available and output type is TotalCount', async () => {
    const query = {
      refId: 'A',
      outputType: OutputType.TotalCount,
      orderBy: OrderByOptions.UPDATED_AT,
      recordCount: 10,
      descending: true,
    };

    const testPlansResponse = {
      testPlans: [],
      totalCount: 0,
    };

    jest.spyOn(datastore, 'queryTestPlans').mockResolvedValue(testPlansResponse);

    const result = await datastore.runQuery(query, mockOptions);

    expect(result.fields).toHaveLength(1);
    expect(result.fields[0].name).toEqual('Total count');
    expect(result.fields[0].values).toEqual([0]);
  });

  it('should convert fixtureIds to fixture names', async () => {
    const query = {
      refId: 'A',
      outputType: OutputType.Properties,
      properties: [Properties.FIXTURE_NAMES],
      orderBy: OrderByOptions.UPDATED_AT,
      recordCount: 10,
      descending: true,
    };

    const testPlansResponse = {
      testPlans: [
        { id: '1', fixtureIds: ['1'] },
        { id: '2', fixtureIds: ['1', '2'] }
      ],
    };

    jest.spyOn(datastore, 'queryTestPlansInBatches').mockResolvedValue(testPlansResponse);

    const result = await datastore.runQuery(query, mockOptions);

    expect(result.fields).toHaveLength(1);
    expect(result.fields[0].name).toEqual('Fixture names');
    expect(result.fields[0].values).toEqual(['Asset 1', 'Asset 1, Asset 2']);
  });

  it('should convert dutIds to dut names', async () => {
    const query = {
      refId: 'A',
      outputType: OutputType.Properties,
      properties: [Properties.DUT_ID],
      orderBy: OrderByOptions.UPDATED_AT,
      recordCount: 10,
      descending: true,
    };

    const testPlansResponse = {
      testPlans: [
        { id: '1', dutId: '1' },
        { id: '2', dutId: '2' }
      ],
    };

    jest.spyOn(datastore, 'queryTestPlansInBatches').mockResolvedValue(testPlansResponse);

    const result = await datastore.runQuery(query, mockOptions);

    expect(result.fields).toHaveLength(1);
    expect(result.fields[0].name).toEqual('DUT');
    expect(result.fields[0].values).toEqual(['Asset 1', 'Asset 2']);
  });

  it('should show dut serial numbers for dut serial number property', async () => {
    const query = {
      refId: 'A',
      outputType: OutputType.Properties,
      properties: [Properties.DUT_SERIAL_NUMBER],
      orderBy: OrderByOptions.UPDATED_AT,
      recordCount: 10,
      descending: true,
    };

    const testPlansResponse = {
      testPlans: [
        { id: '1', dutId: '1', serialNumber: 'SN-1' },
        { id: '2', dutId: '2', serialNumber: 'SN-2' }
      ],
    };

    jest.spyOn(datastore, 'queryTestPlansInBatches').mockResolvedValue(testPlansResponse);

    const result = await datastore.runQuery(query, mockOptions);

    expect(result.fields).toHaveLength(1);
    expect(result.fields[0].name).toEqual('DUT serial number');
    expect(result.fields[0].values).toEqual(['SN-1', 'SN-2']);
  });

  it('should show work order name & id for work order property', async () => {
    const query = {
      refId: 'A',
      outputType: OutputType.Properties,
      properties: [Properties.WORK_ORDER],
      orderBy: OrderByOptions.UPDATED_AT,
      recordCount: 10,
      descending: true,
    };

    const testPlansResponse = {
      testPlans: [
        { id: '1', workOrderId: 'WO-1', workOrderName: 'Work Order 1' },
        { id: '2', workOrderId: 'WO-2', workOrderName: 'Work Order 2' }
      ],
    };

    jest.spyOn(datastore, 'queryTestPlansInBatches').mockResolvedValue(testPlansResponse);

    const result = await datastore.runQuery(query, mockOptions);

    expect(result.fields).toHaveLength(1);
    expect(result.fields[0].name).toEqual('Work order');
    expect(result.fields[0].values).toEqual(['Work Order 1 (WO-1)', 'Work Order 2 (WO-2)']);
  });

  it('should handle empty work order name', async () => {
    const query = {
      refId: 'A',
      outputType: OutputType.Properties,
      properties: [Properties.WORK_ORDER],
      orderBy: OrderByOptions.UPDATED_AT,
      recordCount: 10,
      descending: true,
    };

    const testPlansResponse = {
      testPlans: [
        { id: '1', workOrderId: 'WO-1', workOrderName: '' },
        { id: '2', workOrderId: 'WO-2', workOrderName: 'Work Order 2' }
      ],
    };

    jest.spyOn(datastore, 'queryTestPlansInBatches').mockResolvedValue(testPlansResponse);

    const result = await datastore.runQuery(query, mockOptions);

    expect(result.fields).toHaveLength(1);
    expect(result.fields[0].name).toEqual('Work order');
    expect(result.fields[0].values).toEqual([' (WO-1)', 'Work Order 2 (WO-2)']);
  });

  it('should handle empty work order id', async () => {
    const query = {
      refId: 'A',
      outputType: OutputType.Properties,
      properties: [Properties.WORK_ORDER],
      orderBy: OrderByOptions.UPDATED_AT,
      recordCount: 10,
      descending: true,
    };

    const testPlansResponse = {
      testPlans: [
        { id: '1', workOrderId: '', workOrderName: 'Work Order 1' },
        { id: '2', workOrderId: 'WO-2', workOrderName: 'Work Order 2' }
      ],
    };

    jest.spyOn(datastore, 'queryTestPlansInBatches').mockResolvedValue(testPlansResponse);

    const result = await datastore.runQuery(query, mockOptions);

    expect(result.fields).toHaveLength(1);
    expect(result.fields[0].name).toEqual('Work order');
    expect(result.fields[0].values).toEqual(['Work Order 1 ', 'Work Order 2 (WO-2)']);
  });

  it('should handle empty work order name and id', async () => {
    const query = {
      refId: 'A',
      outputType: OutputType.Properties,
      properties: [Properties.WORK_ORDER],
      orderBy: OrderByOptions.UPDATED_AT,
      recordCount: 10,
      descending: true,
    };

    const testPlansResponse = {
      testPlans: [
        { id: '1', workOrderId: '', workOrderName: '' },
        { id: '2', workOrderId: 'WO-2', workOrderName: 'Work Order 2' }
      ],
    };

    jest.spyOn(datastore, 'queryTestPlansInBatches').mockResolvedValue(testPlansResponse);

    const result = await datastore.runQuery(query, mockOptions);

    expect(result.fields).toHaveLength(1);
    expect(result.fields[0].name).toEqual('Work order');
    expect(result.fields[0].values).toEqual([' ', 'Work Order 2 (WO-2)']);
  });

  it('should show template name and id for test plan template property', async () => {
    const query = {
      refId: 'A',
      outputType: OutputType.Properties,
      properties: [Properties.TEMPLATE],
      orderBy: OrderByOptions.UPDATED_AT,
      recordCount: 10,
      descending: true,
    };

    const templateResponse = [
      { id: 'TPL-1', name: 'Template 1' },
      { id: 'TPL-2', name: 'Template 2' }
    ];
    const testPlansResponse = {
      testPlans: [
        { id: '1', templateId: 'TPL-1' },
        { id: '2', templateId: 'TPL-2' }
      ],
    };

    jest.spyOn(datastore, 'queryTestPlanTemplatesInBatches').mockResolvedValue(templateResponse);
    jest.spyOn(datastore, 'queryTestPlansInBatches').mockResolvedValue(testPlansResponse);

    const result = await datastore.runQuery(query, mockOptions);

    expect(result.fields).toHaveLength(1);
    expect(result.fields[0].name).toEqual('Test plan template');
    expect(result.fields[0].values).toEqual(['Template 1 (TPL-1)', 'Template 2 (TPL-2)']);
  });

  it('should handle empty template name', async () => {
    const query = {
      refId: 'A',
      outputType: OutputType.Properties,
      properties: [Properties.TEMPLATE],
      orderBy: OrderByOptions.UPDATED_AT,
      recordCount: 10,
      descending: true,
    };

    const templateResponse = [
      { id: 'TPL-1', name: '' },
      { id: 'TPL-2', name: 'Template 2' }
    ];
    const testPlansResponse = {
      testPlans: [
        { id: '1', templateId: 'TPL-1' },
        { id: '2', templateId: 'TPL-2' }
      ],
    };

    jest.spyOn(datastore, 'queryTestPlanTemplatesInBatches').mockResolvedValue(templateResponse);
    jest.spyOn(datastore, 'queryTestPlansInBatches').mockResolvedValue(testPlansResponse);

    const result = await datastore.runQuery(query, mockOptions);

    expect(result.fields).toHaveLength(1);
    expect(result.fields[0].name).toEqual('Test plan template');
    expect(result.fields[0].values).toEqual([' (TPL-1)', 'Template 2 (TPL-2)']);
  });

  it('should handle empty template id', async () => {
    const query = {
      refId: 'A',
      outputType: OutputType.Properties,
      properties: [Properties.TEMPLATE],
      orderBy: OrderByOptions.UPDATED_AT,
      recordCount: 10,
      descending: true,
    };

    const templateResponse = [
      { id: 'TPL-2', name: 'Template 2' }
    ];
    const testPlansResponse = {
      testPlans: [
        { id: '1', templateId: '' },
        { id: '2', templateId: 'TPL-2' }
      ],
    };

    jest.spyOn(datastore, 'queryTestPlanTemplatesInBatches').mockResolvedValue(templateResponse);
    jest.spyOn(datastore, 'queryTestPlansInBatches').mockResolvedValue(testPlansResponse);

    const result = await datastore.runQuery(query, mockOptions);

    expect(result.fields).toHaveLength(1);
    expect(result.fields[0].name).toEqual('Test plan template');
    expect(result.fields[0].values).toEqual(['', 'Template 2 (TPL-2)']);
  });

  it('should convert workspaceIds to workspace names for workspace field', async () => {
    const query = {
      refId: 'A',
      outputType: OutputType.Properties,
      properties: [Properties.WORKSPACE],
      orderBy: OrderByOptions.UPDATED_AT,
      recordCount: 10,
      descending: true,
    };

    const testPlansResponse = {
      testPlans: [
        { id: '1', workspace: '1' },
        { id: '2', workspace: '2' }
      ],
    };

    jest.spyOn(datastore, 'queryTestPlansInBatches').mockResolvedValue(testPlansResponse);

    const result = await datastore.runQuery(query, mockOptions);

    expect(result.fields).toHaveLength(1);
    expect(result.fields[0].name).toEqual('Workspace');
    expect(result.fields[0].values).toEqual(['WorkspaceName', 'AnotherWorkspaceName']);
  });

  it('should handle test plan custom properties', async () => {
    const query = {
      refId: 'A',
      outputType: OutputType.Properties,
      properties: [Properties.PROPERTIES],
      orderBy: OrderByOptions.UPDATED_AT,
      recordCount: 10,
      descending: true,
    };
    const testPlansResponse = {
      testPlans: [
        { id: '1', properties: { customProp1: 'value1', customProp2: 'value2' } },
        { id: '2', properties: { customProp1: 'value3' } }
      ],
    };

    jest.spyOn(datastore, 'queryTestPlansInBatches').mockResolvedValue(testPlansResponse);

    const result = await datastore.runQuery(query, mockOptions);

    expect(result.fields).toHaveLength(1);
    expect(result.fields[0].name).toEqual('Properties');
    expect(result.fields[0].values).toEqual([
      JSON.stringify({ customProp1: 'value1', customProp2: 'value2' }),
      JSON.stringify({ customProp1: 'value3' })
    ]);
  });

  it('should convert systemIds to system names for system name property', async () => {
    const query = {
      refId: 'A',
      outputType: OutputType.Properties,
      properties: [Properties.SYSTEM_NAME],
      orderBy: OrderByOptions.UPDATED_AT,
      recordCount: 10,
      descending: true,
    };

    const testPlansResponse = {
      testPlans: [
        { id: '1', systemId: '1' },
        { id: '2', systemId: '2' }
      ],
    };

    jest.spyOn(datastore, 'queryTestPlansInBatches').mockResolvedValue(testPlansResponse);

    const result = await datastore.runQuery(query, mockOptions);

    expect(result.fields).toHaveLength(1);
    expect(result.fields[0].name).toEqual('System name');
    expect(result.fields[0].values).toEqual(['System 1', 'System 2']);
  });

  test('should show user name for assigned to property', async () => {
    const query = {
      refId: 'A',
      outputType: OutputType.Properties,
      properties: [Properties.ASSIGNED_TO],
      orderBy: OrderByOptions.UPDATED_AT,
      recordCount: 10,
      descending: true,
    };

    const testPlansResponse = {
      testPlans: [
        { id: '1', assignedTo: '1' },
        { id: '2', assignedTo: '2' }
      ],
    };

    jest.spyOn(datastore, 'queryTestPlansInBatches').mockResolvedValue(testPlansResponse);

    const result = await datastore.runQuery(query, mockOptions);

    expect(result.fields).toHaveLength(1);
    expect(result.fields[0].name).toEqual('Assigned to');
    expect(result.fields[0].values).toEqual(['User 1', 'User 2']);
  });

  test('should show user name for created by property', async () => {
    const query = {
      refId: 'A',
      outputType: OutputType.Properties,
      properties: [Properties.CREATED_BY],
      orderBy: OrderByOptions.UPDATED_AT,
      recordCount: 10,
      descending: true,
    };

    const testPlansResponse = {
      testPlans: [
        { id: '1', createdBy: '1' },
        { id: '2', createdBy: '2' }
      ],
    };

    jest.spyOn(datastore, 'queryTestPlansInBatches').mockResolvedValue(testPlansResponse);

    const result = await datastore.runQuery(query, mockOptions);

    expect(result.fields).toHaveLength(1);
    expect(result.fields[0].name).toEqual('Created by');
    expect(result.fields[0].values).toEqual(['User 1', 'User 2']);
  });

  test('should show user name for updated by property', async () => {
    const query = {
      refId: 'A',
      outputType: OutputType.Properties,
      properties: [Properties.UPDATED_BY],
      orderBy: OrderByOptions.UPDATED_AT,
      recordCount: 10,
      descending: true,
    };

    const testPlansResponse = {
      testPlans: [
        { id: '1', updatedBy: '1' },
        { id: '2', updatedBy: '2' }
      ],
    };

    jest.spyOn(datastore, 'queryTestPlansInBatches').mockResolvedValue(testPlansResponse);

    const result = await datastore.runQuery(query, mockOptions);

    expect(result.fields).toHaveLength(1);
    expect(result.fields[0].name).toEqual('Updated by');
    expect(result.fields[0].values).toEqual(['User 1', 'User 2']);
  });

  test('should replace variables', async () => {
    const mockQuery = {
      refId: 'C',
      outputType: OutputType.Properties,
      queryBy: 'workspace = "${var}"',
    };
    jest.spyOn(datastore.templateSrv, 'replace').mockReturnValue('workspace = "testWorkspace"');
    jest.spyOn(datastore, 'queryTestPlansInBatches').mockResolvedValue({ testPlans: [] });

    const options = { scopedVars: { var: { value: 'testWorkspace' } } };
    await datastore.runQuery(mockQuery, options as unknown as DataQueryRequest);

    expect(datastore.templateSrv.replace).toHaveBeenCalledWith('workspace = "${var}"', options.scopedVars);
    expect(datastore.queryTestPlansInBatches).toHaveBeenCalledWith(
      'workspace = "testWorkspace"',
      undefined,
      ["ID"],
      undefined,
      undefined,
      true,
    );
  });

  test('should transform fields with multiple values', async () => {
    const mockQuery = {
      refId: 'C',
      outputType: OutputType.Properties,
      queryBy: 'workspace = "${var}"',
    };
    const options = { scopedVars: { var: { value: '{testWorkspace1,testWorkspace2}' } } };
    jest.spyOn(datastore.templateSrv, 'replace').mockReturnValue('workspace = "{testWorkspace1,testWorkspace2}"');
    jest.spyOn(datastore, 'queryTestPlansInBatches').mockResolvedValue({ testPlans: [] });

    await datastore.runQuery(mockQuery, options as unknown as DataQueryRequest);

    expect(datastore.queryTestPlansInBatches).toHaveBeenCalledWith(
      '(workspace = "testWorkspace1" || workspace = "testWorkspace2")',
      undefined,
      ["ID"],
      undefined,
      undefined,
      true,
    );
  });

  test('should transform fields when queryBy contains a date', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2025-01-01'));
    jest.spyOn(datastore, 'queryTestPlansInBatches').mockResolvedValue({ testPlans: [] });

    const mockQuery = {
      refId: 'C',
      outputType: OutputType.Properties,
      queryBy: 'updatedAt = "${__now:date}"',
    };

    await datastore.runQuery(mockQuery, {} as DataQueryRequest);

    expect(datastore.queryTestPlansInBatches).toHaveBeenCalledWith(
      'updatedAt = "2025-01-01T00:00:00.000Z"',
      undefined,
      ["ID"],
      undefined,
      undefined,
      true,
    );

    jest.useRealTimers();
  });
});

describe('queryTestPlansInBatches', () => {
  test('queries test plans in batches and returns aggregated response', async () => {
    const mockQueryResponse = {
      testPlans: [
        { id: '1', name: 'Test Plan 1' },
        { id: '2', name: 'Test Plan 2' }
      ],
      continuationToken: undefined,
      totalCount: 2,
    };

    jest.spyOn(datastore, 'queryTestPlans').mockResolvedValue(mockQueryResponse);

    const result = await datastore.queryTestPlansInBatches('', OrderByOptions.UPDATED_AT, [Projections.NAME], 2, true);

    expect(result.testPlans).toEqual(mockQueryResponse.testPlans);
    expect(result.totalCount).toEqual(2);
  });

  test('handles errors during batch querying', async () => {
    jest.spyOn(datastore, 'queryTestPlans').mockRejectedValue(new Error('Query failed'));

    await expect(datastore.queryTestPlansInBatches('', OrderByOptions.UPDATED_AT, [Projections.NAME], 2, true))
      .rejects
      .toThrow('Query failed');
  });
});

describe('queryTestPlans', () => {
  test('sends correct request and returns response', async () => {
    const mockResponse = { testPlans: [{ name: 'Test Plan 1' }], continuationToken: null, totalCount: 1 };

    backendServer.fetch
      .calledWith(requestMatching({ url: '/niworkorder/v1/query-testplans', data: { filter: 'filter', orderBy: OrderByOptions.UPDATED_AT, take: 1 } }))
      .mockReturnValue(createFetchResponse(mockResponse));

    const result = await datastore.queryTestPlans('filter', OrderByOptions.UPDATED_AT, [Projections.NAME], 1, true);

    expect(result).toEqual(mockResponse);
  });

  test('throws error on failed request', async () => {
    backendServer.fetch
      .calledWith(requestMatching({ url: '/niworkorder/v1/query-testplans', data: { filter: '', orderBy: OrderByOptions.UPDATED_AT, take: 1 } }))
      .mockReturnValue(createFetchError(500));

    await expect(datastore.queryTestPlans('', OrderByOptions.UPDATED_AT, [Projections.NAME], 1, true))
      .rejects
      .toThrow('An error occurred while querying test plans: Error: Request to url "/niworkorder/v1/query-testplans" failed with status code: 500. Error message: "Error"');
  });
});

describe('metricFindQuery', () => {
  let options: LegacyMetricFindQueryOptions;
  beforeEach(() => {
    backendServer.fetch
      .calledWith(requestMatching({ url: '/niworkorder/v1/query-testplans' }))
      .mockReturnValue(
        createFetchResponse<QueryTestPlansResponse>(mockVariableQueryTestPlansResponse));
    options = {}
  });

  it('should return test plan name with id when queryBy is not provided', async () => {
    const query: TestPlansVariableQuery = {
      refId: '',
    };

    const results = await datastore.metricFindQuery(query, options);

    expect(results).toMatchSnapshot();
    expect(backendServer.fetch).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          descending: false,
          projection: ["ID", "NAME"],
          returnCount: false,
          take: 1000
        }
      })
    );
  });

  it('should return test plan name with id when orderBy is provided', async () => {
    const query: TestPlansVariableQuery = {
      refId: '',
      orderBy: OrderByOptions.UPDATED_AT,
      recordCount: 1000,
      descending: false,
    };

    const results = await datastore.metricFindQuery(query, options);

    expect(results).toMatchSnapshot();
    expect(backendServer.fetch).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          descending: false,
          orderBy: OrderByOptions.UPDATED_AT,
          projection: ["ID", "NAME"],
          returnCount: false,
          take: 1000
        }
      })
    );
  });

  test('should replace variables', async () => {
    const mockQuery = {
      refId: 'C',
      queryBy: 'workspace = "${var}"',
    };
    jest.spyOn(datastore.templateSrv, 'replace').mockReturnValue('workspace = "testWorkspace"');
    jest.spyOn(datastore, 'queryTestPlansInBatches').mockResolvedValue({ testPlans: [] });

    const options = { scopedVars: { var: { value: 'testWorkspace' } } };
    await datastore.metricFindQuery(mockQuery, options);

    expect(datastore.templateSrv.replace).toHaveBeenCalledWith('workspace = "${var}"', options.scopedVars);
    expect(datastore.queryTestPlansInBatches).toHaveBeenCalledWith(
      'workspace = "testWorkspace"',
      undefined,
      ["ID", "NAME"],
      undefined,
      undefined
    );
  });

  test('should transform fields with multiple values', async () => {
    const mockQuery = {
      refId: 'C',
      outputType: OutputType.Properties,
      queryBy: 'workspace = "${var}"',
    };
    const options = { scopedVars: { var: { value: '{testWorkspace1,testWorkspace2}' } } };
    jest.spyOn(datastore.templateSrv, 'replace').mockReturnValue('workspace = "{testWorkspace1,testWorkspace2}"');
    jest.spyOn(datastore, 'queryTestPlansInBatches').mockResolvedValue({ testPlans: [] });

    await datastore.metricFindQuery(mockQuery, options);

    expect(datastore.queryTestPlansInBatches).toHaveBeenCalledWith(
      '(workspace = "testWorkspace1" || workspace = "testWorkspace2")',
      undefined,
      ["ID", "NAME"],
      undefined,
      undefined
    );
  });

  test('should transform fields when queryBy contains a date', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2025-01-01'));
    jest.spyOn(datastore, 'queryTestPlansInBatches').mockResolvedValue({ testPlans: [] });

    const mockQuery = {
      refId: 'C',
      outputType: OutputType.Properties,
      queryBy: 'updatedAt = "${__now:date}"',
    };

    await datastore.metricFindQuery(mockQuery, {});

    expect(datastore.queryTestPlansInBatches).toHaveBeenCalledWith(
      'updatedAt = "2025-01-01T00:00:00.000Z"',
      undefined,
      ["ID", "NAME"],
      undefined,
      undefined
    );

    jest.useRealTimers();
  });
});
