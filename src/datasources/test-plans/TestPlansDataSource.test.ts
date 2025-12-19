import { MockProxy } from "jest-mock-extended";
import { TestPlansDataSource } from "./TestPlansDataSource";
import { BackendSrv } from "@grafana/runtime";
import { createFetchError, createFetchResponse, requestMatching, setupDataSource } from "test/fixtures";
import { OrderByOptions, OutputType, Projections, Properties, QueryTestPlansResponse, TestPlansQuery, TestPlansVariableQuery } from "./types";
import { DataQueryRequest, FieldType, LegacyMetricFindQueryOptions } from "@grafana/data";

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

jest.mock('shared/product.utils', () => {
  return {
    ProductUtils: jest.fn().mockImplementation(() => ({
      getProductNamesAndPartNumbers: jest.fn().mockResolvedValue(
        new Map([
          ['part-number-1', { id: '1', partNumber: 'part-number-1', name: 'Product 1' }],
          ['part-number-2', { id: '2', partNumber: 'part-number-2', name: 'Product 2' }],
        ])
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
    expect(defaultQuery.properties).toEqual([
      Properties.NAME,
      Properties.STATE,
      Properties.ASSIGNED_TO,
      Properties.PRODUCT_NAME,
      Properties.DUT_NAME,
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
    expect(result.fields[0].name).toEqual('Test plan name');
    expect(result.fields[0].values).toEqual(['Test Plan 1', 'Test Plan 2']);
    expect(result.fields[1].name).toEqual('State');
    expect(result.fields[1].values).toEqual(['Active', 'Completed']);
  });

  test('should return field without values when no test plans are available', async () => {
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

    expect(result.fields).toHaveLength(2);
    expect(result.fields[0]).toEqual({ "name": "Test plan name", "type": "string", "values": [] });
    expect(result.fields[1]).toEqual({ "name": "State", "type": "string", "values": [] });
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
    expect(result.fields[0].name).toEqual('A');
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
    expect(result.fields[0].name).toEqual('A');
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
      properties: [Properties.DUT_NAME],
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
    expect(result.fields[0].name).toEqual('DUT name');
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

  it('should show work order name work order name property', async () => {
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
    expect(result.fields[0].name).toEqual('Work order name');
    expect(result.fields[0].values).toEqual(['Work Order 1', 'Work Order 2']);
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
    expect(result.fields[0].name).toEqual('Work order name');
    expect(result.fields[0].values).toEqual(['', 'Work Order 2']);
  });

  it('should show template name for Template name property', async () => {
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
    expect(result.fields[0].name).toEqual('Template name');
    expect(result.fields[0].values).toEqual(['Template 1', 'Template 2']);
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
    expect(result.fields[0].name).toEqual('Template name');
    expect(result.fields[0].values).toEqual(['', 'Template 2']);
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

  it('should display empty cell when properties is empty', async () => {
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
        { id: '1', properties: {} }
      ],
    };

    jest.spyOn(datastore, 'queryTestPlansInBatches').mockResolvedValue(testPlansResponse);

    const result = await datastore.runQuery(query, mockOptions);

    expect(result.fields).toHaveLength(1);
    expect(result.fields[0].name).toEqual('Properties');
    expect(result.fields[0].values).toEqual(['']);
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
      properties: [Properties.ID],
      recordCount: 1000
    };
    jest.spyOn(datastore.templateSrv, 'replace').mockReturnValue('workspace = "testWorkspace"');
    jest.spyOn(datastore, 'queryTestPlansInBatches').mockResolvedValue({ testPlans: [] });

    const options = { scopedVars: { var: { value: 'testWorkspace' } } };
    await datastore.runQuery(mockQuery, options as unknown as DataQueryRequest);

    expect(datastore.templateSrv.replace).toHaveBeenCalledWith('workspace = "${var}"', options.scopedVars);
    expect(datastore.queryTestPlansInBatches).toHaveBeenCalledWith(
      'workspace = "testWorkspace"',
      OrderByOptions.UPDATED_AT,
      ["ID"],
      1000,
      true,
    );
  });

  test('should transform fields with multiple values', async () => {
    const mockQuery = {
      refId: 'C',
      outputType: OutputType.Properties,
      queryBy: 'workspace = "${var}"',
      properties: [Properties.ID],
      recordCount: 1000,
    };
    const options = { scopedVars: { var: { value: '{testWorkspace1,testWorkspace2}' } } };
    jest.spyOn(datastore.templateSrv, 'replace').mockReturnValue('workspace = "{testWorkspace1,testWorkspace2}"');
    jest.spyOn(datastore, 'queryTestPlansInBatches').mockResolvedValue({ testPlans: [] });

    await datastore.runQuery(mockQuery, options as unknown as DataQueryRequest);

    expect(datastore.queryTestPlansInBatches).toHaveBeenCalledWith(
      '(workspace = "testWorkspace1" || workspace = "testWorkspace2")',
      OrderByOptions.UPDATED_AT,
      ["ID"],
      1000,
      true,
    );
  });

  test('should transform fields with is blank operation', async () => {
    const mockQuery = {
      refId: 'C',
      outputType: OutputType.Properties,
      queryBy: 'string.IsNullOrEmpty(testProgram)',
      properties: [Properties.ID],
      recordCount: 1000,
    };
    jest.spyOn(datastore, 'queryTestPlansInBatches').mockResolvedValue({ testPlans: [] });

    await datastore.runQuery(mockQuery, {} as unknown as DataQueryRequest);

    expect(datastore.queryTestPlansInBatches).toHaveBeenCalledWith(
      'string.IsNullOrEmpty(testProgram)',
      OrderByOptions.UPDATED_AT,
      ["ID"],
      1000,
      true,
    );
  });

  test('should transform fields with is not blank operation', async () => {
    const mockQuery = {
      refId: 'C',
      outputType: OutputType.Properties,
      queryBy: '!string.IsNullOrEmpty(testProgram)',
      properties: [Properties.ID],
      recordCount: 1000,
    };
    jest.spyOn(datastore, 'queryTestPlansInBatches').mockResolvedValue({ testPlans: [] });

    await datastore.runQuery(mockQuery, {} as unknown as DataQueryRequest);

    expect(datastore.queryTestPlansInBatches).toHaveBeenCalledWith(
      '!string.IsNullOrEmpty(testProgram)',
      OrderByOptions.UPDATED_AT,
      ["ID"],
      1000,
      true,
    );
  });

  test('should transform fields when queryBy contains equals operations', async () => {
    const mockQuery = {
      refId: 'C',
      outputType: OutputType.Properties,
      queryBy: 'testProgram = "Regression"',
      properties: [Properties.ID],
      recordCount: 1000,
    };

    jest.spyOn(datastore, 'queryTestPlansInBatches').mockResolvedValue({ testPlans: [] });

    await datastore.runQuery(mockQuery, {} as DataQueryRequest);

    expect(datastore.queryTestPlansInBatches).toHaveBeenCalledWith(
      'testProgram = "Regression"',
      OrderByOptions.UPDATED_AT,
      ["ID"],
      1000,
      true,
    );
  });

  test('should transform fields when queryBy contains greater than', async () => {
    const mockQuery = {
      refId: 'C',
      outputType: OutputType.Properties,
      queryBy: 'estimatedDurationInDays > "2"',
      properties: [Properties.ID],
      recordCount: 1000,
    };

    jest.spyOn(datastore, 'queryTestPlansInBatches').mockResolvedValue({ testPlans: [] });

    await datastore.runQuery(mockQuery, {} as DataQueryRequest);

    expect(datastore.queryTestPlansInBatches).toHaveBeenCalledWith(
      'estimatedDurationInSeconds > "172800"',
      OrderByOptions.UPDATED_AT,
      ["ID"],
      1000,
      true,
    );
  });

  test('should transform fields when queryBy contains less than', async () => {
    const mockQuery = {
      refId: 'C',
      outputType: OutputType.Properties,
      queryBy: 'estimatedDurationInDays < "2"',
      properties: [Properties.ID],
      recordCount: 1000,
    };

    jest.spyOn(datastore, 'queryTestPlansInBatches').mockResolvedValue({ testPlans: [] });

    await datastore.runQuery(mockQuery, {} as DataQueryRequest);

    expect(datastore.queryTestPlansInBatches).toHaveBeenCalledWith(
      'estimatedDurationInSeconds < "172800"',
      OrderByOptions.UPDATED_AT,
      ["ID"],
      1000,
      true,
    );
  });

  test('should transform fields when queryBy contains greater than or equal to', async () => {
    const mockQuery = {
      refId: 'C',
      outputType: OutputType.Properties,
      queryBy: 'estimatedDurationInDays >= "2"',
      properties: [Properties.ID],
      recordCount: 1000,
    };

    jest.spyOn(datastore, 'queryTestPlansInBatches').mockResolvedValue({ testPlans: [] });

    await datastore.runQuery(mockQuery, {} as DataQueryRequest);

    expect(datastore.queryTestPlansInBatches).toHaveBeenCalledWith(
      'estimatedDurationInSeconds >= "172800"',
      OrderByOptions.UPDATED_AT,
      ["ID"],
      1000,
      true,
    );
  });

  test('should transform fields when queryBy contains less than or equal to', async () => {
    const mockQuery = {
      refId: 'C',
      outputType: OutputType.Properties,
      queryBy: 'estimatedDurationInDays <= "2"',
      properties: [Properties.ID],
      recordCount: 1000,
    };

    jest.spyOn(datastore, 'queryTestPlansInBatches').mockResolvedValue({ testPlans: [] });

    await datastore.runQuery(mockQuery, {} as DataQueryRequest);

    expect(datastore.queryTestPlansInBatches).toHaveBeenCalledWith(
      'estimatedDurationInSeconds <= "172800"',
      OrderByOptions.UPDATED_AT,
      ["ID"],
      1000,
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
      properties: [Properties.ID],
      recordCount: 1000,
    };

    await datastore.runQuery(mockQuery, {} as DataQueryRequest);

    expect(datastore.queryTestPlansInBatches).toHaveBeenCalledWith(
      'updatedAt = "2025-01-01T00:00:00.000Z"',
      OrderByOptions.UPDATED_AT,
      ["ID"],
      1000,
      true,
    );

    jest.useRealTimers();
  });

  it('should convert part number to product name', async () => {
    const query = {
      refId: 'A',
      outputType: OutputType.Properties,
      properties: [Properties.PRODUCT_NAME],
      orderBy: OrderByOptions.UPDATED_AT,
      recordCount: 10,
      descending: true,
    };

    const testPlansResponse = {
      testPlans: [
        { id: '1', partNumber: 'part-number-1' },
        { id: '2', partNumber: 'part-number-2' }
      ],
    };

    jest.spyOn(datastore, 'queryTestPlansInBatches').mockResolvedValue(testPlansResponse);

    const result = await datastore.runQuery(query, mockOptions);

    expect(result.fields).toHaveLength(1);
    expect(result.fields[0].name).toEqual('Product name');
    expect(result.fields[0].values).toEqual(['Product 1', 'Product 2']);
  });

  it('should convert part number to product id', async () => {
    const query = {
      refId: 'A',
      outputType: OutputType.Properties,
      properties: [Properties.PRODUCT_ID],
      orderBy: OrderByOptions.UPDATED_AT,
      recordCount: 10,
      descending: true,
    };
    const testPlansResponse = {
      testPlans: [
        { id: '1', partNumber: 'part-number-1' },
        { id: '2', partNumber: 'part-number-2' }
      ],
    };

    jest.spyOn(datastore, 'queryTestPlansInBatches').mockResolvedValue(testPlansResponse);

    const result = await datastore.runQuery(query, mockOptions);

    expect(result.fields).toHaveLength(1);
    expect(result.fields[0].name).toEqual('Product ID');
    expect(result.fields[0].values).toEqual(['1', '2']);
  });

  test('should transform field when queryBy contains duration fields', async () => {
    const mockQuery = {
      refId: 'C',
      outputType: OutputType.Properties,
      queryBy: '(estimatedDurationInDays > "2" && estimatedDurationInHours != "2")',
      properties: [Properties.ID],
      recordCount: 1000,
    };

    jest.spyOn(datastore, 'queryTestPlansInBatches').mockResolvedValue({ testPlans: [] });

    await datastore.runQuery(mockQuery, {} as DataQueryRequest);

    expect(datastore.queryTestPlansInBatches).toHaveBeenCalledWith(
      '(estimatedDurationInSeconds > \"172800\" && estimatedDurationInSeconds != \"7200\")',
      OrderByOptions.UPDATED_AT,
      ["ID"],
      1000,
      true,
    );
  });

  test('should transform field when queryBy contains duration fields with negative values', async () => {
    const mockQuery = {
      refId: 'C',
      outputType: OutputType.Properties,
      queryBy: '(estimatedDurationInDays > "-2" && estimatedDurationInHours != "-2")',
      properties: [Properties.ID],
      recordCount: 1000,
    };

    jest.spyOn(datastore, 'queryTestPlansInBatches').mockResolvedValue({ testPlans: [] });

    await datastore.runQuery(mockQuery, {} as DataQueryRequest);

    expect(datastore.queryTestPlansInBatches).toHaveBeenCalledWith(
      '(estimatedDurationInSeconds > \"-172800\" && estimatedDurationInSeconds != \"-7200\")',
      OrderByOptions.UPDATED_AT,
      ["ID"],
      1000,
      true,
    );
  });

  test('should return type as string type', async () => {
    const mockQuery = {
      refId: 'A',
      outputType: OutputType.Properties,
      properties: [Properties.ID, Properties.UPDATED_AT],
      recordCount: 1000,
    };

    const testPlansResponse = {
      testPlans: [
        { id: '1', updatedAt: '2023-01-02T00:00:00Z' },
        { id: '2', updatedAt: '2023-01-05T00:00:00Z' },
      ],
    };

    jest.spyOn(datastore, 'queryTestPlansInBatches').mockResolvedValue(testPlansResponse);

    const result = await datastore.runQuery(mockQuery, {} as DataQueryRequest);

    expect(result.fields).toHaveLength(2);
    expect(result.fields[0].type).toEqual(FieldType.string);
    expect(result.fields[1].type).toEqual(FieldType.string);
  });

  test('should set field names as expected', async () => {
    const mockQuery = {
      refId: 'A',
      outputType: OutputType.Properties,
      properties: [
        Properties.ASSIGNED_TO,
        Properties.CREATED_AT,
        Properties.CREATED_BY,
        Properties.DESCRIPTION,
        Properties.ID,
        Properties.NAME,
        Properties.PROPERTIES,
        Properties.STATE,
        Properties.UPDATED_AT,
        Properties.UPDATED_BY,
        Properties.WORKSPACE,
        Properties.WORK_ORDER,
        Properties.WORK_ORDER_ID,
        Properties.PRODUCT_NAME,
        Properties.PRODUCT_ID,
        Properties.PART_NUMBER,
        Properties.PLANNED_START_DATE_TIME,
        Properties.ESTIMATED_END_DATE_TIME,
        Properties.ESTIMATED_DURATION_IN_SECONDS,
        Properties.SYSTEM_NAME,
        Properties.SYSTEM_ID,
        Properties.TEMPLATE,
        Properties.TEMPLATE_ID,
        Properties.TEST_PROGRAM,
        Properties.SUBSTATE,
        Properties.FIXTURE_NAMES,
        Properties.DUT_ID,
        Properties.DUT_NAME,
        Properties.DUT_SERIAL_NUMBER,
      ],
      recordCount: 1000,
    };

    const testPlansResponse = {
      testPlans: [],
    };

    jest.spyOn(datastore, 'queryTestPlansInBatches').mockResolvedValue(testPlansResponse);

    const result = await datastore.runQuery(mockQuery, {} as DataQueryRequest);

    expect(result.fields[0].name).toEqual('Assigned to');
    expect(result.fields[1].name).toEqual('Created');
    expect(result.fields[2].name).toEqual('Created by');
    expect(result.fields[3].name).toEqual('Description');
    expect(result.fields[4].name).toEqual('Test plan ID');
    expect(result.fields[5].name).toEqual('Test plan name');
    expect(result.fields[6].name).toEqual('Properties');
    expect(result.fields[7].name).toEqual('State');
    expect(result.fields[8].name).toEqual('Updated');
    expect(result.fields[9].name).toEqual('Updated by');
    expect(result.fields[10].name).toEqual('Workspace');
    expect(result.fields[11].name).toEqual('Work order name');
    expect(result.fields[12].name).toEqual('Work order ID');
    expect(result.fields[13].name).toEqual('Product name');
    expect(result.fields[14].name).toEqual('Product ID');
    expect(result.fields[15].name).toEqual('Part number');
    expect(result.fields[16].name).toEqual('Planned start date/time');
    expect(result.fields[17].name).toEqual('Estimated end date/time');
    expect(result.fields[18].name).toEqual('Estimated duration');
    expect(result.fields[19].name).toEqual('System name');
    expect(result.fields[20].name).toEqual('System ID');
    expect(result.fields[21].name).toEqual('Template name');
    expect(result.fields[22].name).toEqual('Template ID');
    expect(result.fields[23].name).toEqual('Test program name');
    expect(result.fields[24].name).toEqual('Substate');
    expect(result.fields[25].name).toEqual('Fixture names');
    expect(result.fields[26].name).toEqual('DUT ID');
    expect(result.fields[27].name).toEqual('DUT name');
    expect(result.fields[28].name).toEqual('DUT serial number');
  });

  
  it('should return empty data when properties is invalid', async () => {
    const mockQuery = {
      refId: 'A',
      outputType: OutputType.Properties,
      properties: [],
      recordCount: 1000,
    };

    jest.spyOn(datastore, 'queryTestPlansInBatches').mockResolvedValue({testPlans:[]});

    const result = await datastore.runQuery(mockQuery, {} as DataQueryRequest);

    expect(result.fields).toHaveLength(0);
  });

  it('should return empty data when take is invalid', async () => {
    const mockQuery = {
      refId: 'A',
      outputType: OutputType.Properties,
      properties: [Properties.NAME],
      recordCount: undefined,
    };

    jest.spyOn(datastore, 'queryTestPlansInBatches').mockResolvedValue({testPlans:[]});

    const result = await datastore.runQuery(mockQuery, {} as DataQueryRequest);

    expect(result.fields).toHaveLength(0);
  });

  it('should return empty data when record count is less than 0', async()=> {
    const mockQuery = {
      refId: 'A',
      outputType: OutputType.Properties,
      properties: [Properties.NAME],
      recordCount: -1,
    };
    jest.spyOn(datastore, 'queryTestPlansInBatches').mockResolvedValue({testPlans:[]});

    const result = await datastore.runQuery(mockQuery, {} as DataQueryRequest);

    expect(result.fields).toHaveLength(0);
  })
  
  it('should return empty data when record count is greater than max take', async()=> {
    const mockQuery = {
      refId: 'A',
      outputType: OutputType.Properties,
      properties: [Properties.NAME],
      recordCount: 1000000,
    };
    jest.spyOn(datastore, 'queryTestPlansInBatches').mockResolvedValue({testPlans:[]});

    const result = await datastore.runQuery(mockQuery, {} as DataQueryRequest);

    expect(result.fields).toHaveLength(0);
  })

  it('should return expected data when record count is 0', async () => {
    const mockQuery = {
      refId: 'A',
      outputType: OutputType.Properties,
      properties: [Properties.NAME],
      recordCount: 0,
    };
    jest.spyOn(datastore, 'queryTestPlansInBatches').mockResolvedValue({testPlans:[]});

    const result = await datastore.runQuery(mockQuery, {} as DataQueryRequest);

    expect(result).toMatchSnapshot();
  });

  test('should return expected data when record count is 10000', async () => {
    const mockQuery = {
      refId: 'A',
      outputType: OutputType.Properties,
      properties: [Properties.NAME],
      recordCount: 10000,
    };
    jest.spyOn(datastore, 'queryTestPlansInBatches').mockResolvedValue({testPlans:[]});

    const result = await datastore.runQuery(mockQuery, {} as DataQueryRequest);

    expect(result).toMatchSnapshot();
  });

  test('should run query if not hidden', () => {
    const query: TestPlansQuery = {
      hide: false,
      refId: ''
    };
    expect(datastore.shouldRunQuery(query)).toBe(true);
  });

  test('should not run query if hidden', () => {
    const query: TestPlansQuery = {
      hide: true,
      refId: ''
    };
    expect(datastore.shouldRunQuery(query)).toBe(false);
  });
});

describe('prepareQuery', () => {
  test('should transform DUTId field in older dashboards to dutId', () => {
    const mockQuery = {
      refId: 'C',
      outputType: OutputType.Properties,
      queryBy:  'DUTId = "dutId1" || DUTId = "dutId2"',
      properties: [Properties.ID],
      recordCount: 1000,
    };

    const result = datastore.prepareQuery(mockQuery);

    expect(result.queryBy).toBe('dutId = "dutId1" || dutId = "dutId2"');
  });

  test('should only replace DUTId field name, not values in quotes', () => {
    const mockQuery = {
      refId: 'C',
      outputType: OutputType.Properties,
      queryBy: 'DUTId = "DUTId-12345" && DUTId != "DUTId-67890"',
      properties: [Properties.ID],
      recordCount: 1000,
    };
    
    const result = datastore.prepareQuery(mockQuery);
    
    expect(result.queryBy).toBe('dutId = "DUTId-12345" && dutId != "DUTId-67890"');
  });

  test('should handle DUTId with various operators', () => {
    const testCases = [
      { input: 'DUTId = "value"', expected: 'dutId = "value"' },
      { input: 'DUTId == "value"', expected: 'dutId == "value"' },
      { input: 'DUTId != "value"', expected: 'dutId != "value"' },
      { input: 'DUTId > "value"', expected: 'dutId > "value"' },
      { input: 'DUTId < "value"', expected: 'dutId < "value"' },
      { input: 'DUTId >= "value"', expected: 'dutId >= "value"' },
      { input: 'DUTId <= "value"', expected: 'dutId <= "value"' },
    ];

    testCases.forEach(({ input, expected }) => {
      const mockQuery = {
        refId: 'C',
        outputType: OutputType.Properties,
        queryBy: input,
        properties: [Properties.ID],
        recordCount: 1000,
      };
      
      const result = datastore.prepareQuery(mockQuery);
      
      expect(result.queryBy).toBe(expected);
    });
  });

  test('should handle complex nested expressions with DUTId', () => {
    const mockQuery = {
      refId: 'C',
      outputType: OutputType.Properties,
      queryBy: '((DUTId = "DUTId-123" || DUTId = "DUTId-456") && (state = "running"))',
      properties: [Properties.ID],
      recordCount: 1000,
    };
    
    const result = datastore.prepareQuery(mockQuery);
    
    expect(result.queryBy).toBe('((dutId = "DUTId-123" || dutId = "DUTId-456") && (state = "running"))');
  });

  test('should add default query values when not provided', () => {
    const mockQuery = {
      refId: 'A',
      outputType: OutputType.Properties,
    };

    const result = datastore.prepareQuery(mockQuery);

    expect(result.properties).toEqual([
      Properties.NAME,
      Properties.STATE,
      Properties.ASSIGNED_TO,
      Properties.PRODUCT_NAME,
      Properties.DUT_NAME,
      Properties.PLANNED_START_DATE_TIME,
      Properties.ESTIMATED_DURATION_IN_SECONDS,
      Properties.SYSTEM_NAME,
      Properties.UPDATED_AT
    ]);
    expect(result.orderBy).toBe(OrderByOptions.UPDATED_AT);
    expect(result.descending).toBe(true);
    expect(result.recordCount).toBe(1000);
  });

  test('should preserve provided query values over defaults', () => {
    const mockQuery = {
      refId: 'A',
      outputType: OutputType.Properties,
      properties: [Properties.ID, Properties.NAME],
      orderBy: OrderByOptions.UPDATED_AT,
      descending: false,
      recordCount: 500,
    };

    const result = datastore.prepareQuery(mockQuery);

    expect(result.properties).toEqual([Properties.ID, Properties.NAME]);
    expect(result.orderBy).toBe(OrderByOptions.UPDATED_AT);
    expect(result.descending).toBe(false);
    expect(result.recordCount).toBe(500);
  });
});

describe('loadWorkspaces', () => {
  test('returns workspaces', async () => {
    const result = await datastore.loadWorkspaces();

    expect(result.get('1')?.name).toBe('WorkspaceName');
    expect(result.get('2')?.name).toBe('AnotherWorkspaceName');
  });

  it('should handle errors and set error and innerError fields', async () => {
    jest.spyOn(datastore.workspaceUtils, 'getWorkspaces').mockRejectedValue(new Error('Error'));

    await datastore.loadWorkspaces();

    expect(datastore.errorTitle).toBe('Warning during testplans query');
    expect(datastore.errorDescription).toContain(
      'Some values may not be available in the query builder lookups due to an unknown error.'
    );
  });

  it('should handle errors and set innerError fields with error message detail', async () => {
    datastore.errorTitle = '';
    jest
      .spyOn(datastore.workspaceUtils, 'getWorkspaces')
      .mockRejectedValue(
        new Error('Request failed with status code: 500, Error message: {"message": "Internal Server Error"}')
      );

    await datastore.loadWorkspaces();

    expect(datastore.errorTitle).toBe('Warning during testplans query');
    expect(datastore.errorDescription).toContain(
      'Some values may not be available in the query builder lookups due to the following error: Internal Server Error.'
    );
  });

  test('should throw timeOut error when API returns 504 status', async () => {
    datastore.errorTitle = '';
    jest
      .spyOn(datastore.workspaceUtils, 'getWorkspaces')
      .mockRejectedValue(new Error('Request failed with status code: 504'));

    await datastore.loadWorkspaces();

    expect(datastore.errorTitle).toBe('Warning during testplans query');
    expect(datastore.errorDescription).toContain(
      `The query builder lookups experienced a timeout error. Some values might not be available. Narrow your query with a more specific filter and try again.`
    );
  });

  it('should throw too many requests error when API returns 429 status', async () => {
    datastore.errorTitle = '';
    jest
      .spyOn(datastore.workspaceUtils, 'getWorkspaces')
      .mockRejectedValue(new Error('Request failed with status code: 429'));

    await datastore.loadWorkspaces();

    expect(datastore.errorTitle).toBe('Warning during testplans query');
    expect(datastore.errorDescription).toContain(
      `The query builder lookups failed due to too many requests. Please try again later.`
    );
  });

  it('should throw not found error when API returns 404 status', async () => {
    datastore.errorTitle = '';
    jest
      .spyOn(datastore.workspaceUtils, 'getWorkspaces')
      .mockRejectedValue(new Error('Request failed with status code: 404'));

    await datastore.loadWorkspaces();

    expect(datastore.errorTitle).toBe('Warning during testplans query');
    expect(datastore.errorDescription).toContain(
      `The query builder lookups failed because the requested resource was not found. Please check the query parameters and try again.`
    );
  });
});

describe('loadUsers', () => {
  test('returns users', async () => {
    const result = await datastore.loadUsers();

    expect(result.get('1')?.lastName).toBe('1');
    expect(result.get('2')?.lastName).toBe('2');
  });

  it('should handle errors and set error and innerError fields', async () => {
    jest.spyOn(datastore.usersUtils, 'getUsers').mockRejectedValue(new Error('Error'));

    await datastore.loadUsers();

    expect(datastore.errorTitle).toBe('Warning during testplans query');
    expect(datastore.errorDescription).toContain(
      'Some values may not be available in the query builder lookups due to an unknown error.'
    );
  });

  it('should handle errors and set innerError fields with error message detail', async () => {
    datastore.errorTitle = '';
    jest
      .spyOn(datastore.usersUtils, 'getUsers')
      .mockRejectedValue(
        new Error('Request failed with status code: 500, Error message: {"message": "Internal Server Error"}')
      );

    await datastore.loadUsers();

    expect(datastore.errorTitle).toBe('Warning during testplans query');
    expect(datastore.errorDescription).toContain(
      'Some values may not be available in the query builder lookups due to the following error: Internal Server Error.'
    );
  });

  test('should throw timeOut error when API returns 504 status', async () => {
    datastore.errorTitle = '';
    jest
      .spyOn(datastore.usersUtils, 'getUsers')
      .mockRejectedValue(new Error('Request failed with status code: 504'));

    await datastore.loadUsers();

    expect(datastore.errorTitle).toBe('Warning during testplans query');
    expect(datastore.errorDescription).toContain(
      `The query builder lookups experienced a timeout error. Some values might not be available. Narrow your query with a more specific filter and try again.`
    );
  });

  it('should throw too many requests error when API returns 429 status', async () => {
    datastore.errorTitle = '';
    jest
      .spyOn(datastore.usersUtils, 'getUsers')
      .mockRejectedValue(new Error('Request failed with status code: 429'));

    await datastore.loadUsers();

    expect(datastore.errorTitle).toBe('Warning during testplans query');
    expect(datastore.errorDescription).toContain(
      `The query builder lookups failed due to too many requests. Please try again later.`
    );
  });

  it('should throw not found error when API returns 404 status', async () => {
    datastore.errorTitle = '';
    jest
      .spyOn(datastore.usersUtils, 'getUsers')
      .mockRejectedValue(new Error('Request failed with status code: 404'));

    await datastore.loadUsers();

    expect(datastore.errorTitle).toBe('Warning during testplans query');
    expect(datastore.errorDescription).toContain(
      `The query builder lookups failed because the requested resource was not found. Please check the query parameters and try again.`
    );
  });
});

describe('loadSystemAliases', () => {
  test('returns system aliases', async () => {
    const result = await datastore.loadSystemAliases();
    expect(result.get('1')?.alias).toBe('System 1');
    expect(result.get('2')?.alias).toBe('System 2');
  });

  it('should handle errors and set error and innerError fields', async () => {
    jest.spyOn(datastore.systemUtils, 'getSystemAliases').mockRejectedValue(new Error('Error'));

    await datastore.loadSystemAliases();

    expect(datastore.errorTitle).toBe('Warning during testplans query');
    expect(datastore.errorDescription).toContain(
      'Some values may not be available in the query builder lookups due to an unknown error.'
    );
  });

  it('should handle errors and set innerError fields with error message detail', async () => {
    datastore.errorTitle = '';
    jest
      .spyOn(datastore.systemUtils, 'getSystemAliases')
      .mockRejectedValue(
        new Error('Request failed with status code: 500, Error message: {"message": "Internal Server Error"}')
      );

    await datastore.loadSystemAliases();

    expect(datastore.errorTitle).toBe('Warning during testplans query');
    expect(datastore.errorDescription).toContain(
      'Some values may not be available in the query builder lookups due to the following error: Internal Server Error.'
    );
  });

  test('should throw timeOut error when API returns 504 status', async () => {
    datastore.errorTitle = '';
    jest
      .spyOn(datastore.systemUtils, 'getSystemAliases')
      .mockRejectedValue(new Error('Request failed with status code: 504'));

    await datastore.loadSystemAliases();

    expect(datastore.errorTitle).toBe('Warning during testplans query');
    expect(datastore.errorDescription).toContain(
      `The query builder lookups experienced a timeout error. Some values might not be available. Narrow your query with a more specific filter and try again.`
    );
  });

  it('should throw too many requests error when API returns 429 status', async () => {
    datastore.errorTitle = '';
    jest
      .spyOn(datastore.systemUtils, 'getSystemAliases')
      .mockRejectedValue(new Error('Request failed with status code: 429'));

    await datastore.loadSystemAliases();

    expect(datastore.errorTitle).toBe('Warning during testplans query');
    expect(datastore.errorDescription).toContain(
      `The query builder lookups failed due to too many requests. Please try again later.`
    );
  });

  it('should throw not found error when API returns 404 status', async () => {
    datastore.errorTitle = '';
    jest
      .spyOn(datastore.systemUtils, 'getSystemAliases')
      .mockRejectedValue(new Error('Request failed with status code: 404'));

    await datastore.loadSystemAliases();

    expect(datastore.errorTitle).toBe('Warning during testplans query');
    expect(datastore.errorDescription).toContain(
      `The query builder lookups failed because the requested resource was not found. Please check the query parameters and try again.`
    );
  });
});

describe('loadProductNamesAndPartNumbers', ()=>{
  test('returns product names and part numbers', async () => {
    const result = await datastore.loadProductNamesAndPartNumbers();

    expect(result.get('part-number-1')?.name).toBe('Product 1');
    expect(result.get('part-number-2')?.name).toBe('Product 2');
  });

  it('should handle errors and set error and innerError fields', async () => {
    jest.spyOn(datastore.productUtils, 'getProductNamesAndPartNumbers').mockRejectedValue(new Error('Error'));

    await datastore.loadProductNamesAndPartNumbers();

    expect(datastore.errorTitle).toBe('Warning during testplans query');
    expect(datastore.errorDescription).toContain(
      'Some values may not be available in the query builder lookups due to an unknown error.'
    );
  });

  it('should handle errors and set innerError fields with error message detail', async () => {
    datastore.errorTitle = '';
    jest
      .spyOn(datastore.productUtils, 'getProductNamesAndPartNumbers')
      .mockRejectedValue(
        new Error('Request failed with status code: 500, Error message: {"message": "Internal Server Error"}')
      );

    await datastore.loadProductNamesAndPartNumbers();

    expect(datastore.errorTitle).toBe('Warning during testplans query');
    expect(datastore.errorDescription).toContain(
      'Some values may not be available in the query builder lookups due to the following error: Internal Server Error.'
    );
  });

  test('should throw timeOut error when API returns 504 status', async () => {
    datastore.errorTitle = '';
    jest
      .spyOn(datastore.productUtils, 'getProductNamesAndPartNumbers')
      .mockRejectedValue(new Error('Request failed with status code: 504'));

    await datastore.loadProductNamesAndPartNumbers();

    expect(datastore.errorTitle).toBe('Warning during testplans query');
    expect(datastore.errorDescription).toContain(
      `The query builder lookups experienced a timeout error. Some values might not be available. Narrow your query with a more specific filter and try again.`
    );
  });

  it('should throw too many requests error when API returns 429 status', async () => {
    datastore.errorTitle = '';
    jest
      .spyOn(datastore.productUtils, 'getProductNamesAndPartNumbers')
      .mockRejectedValue(new Error('Request failed with status code: 429'));

    await datastore.loadProductNamesAndPartNumbers();

    expect(datastore.errorTitle).toBe('Warning during testplans query');
    expect(datastore.errorDescription).toContain(
      `The query builder lookups failed due to too many requests. Please try again later.`
    );
  });

  it('should throw not found error when API returns 404 status', async () => {
    datastore.errorTitle = '';
    jest
      .spyOn(datastore.productUtils, 'getProductNamesAndPartNumbers')
      .mockRejectedValue(new Error('Request failed with status code: 404'));

    await datastore.loadProductNamesAndPartNumbers();

    expect(datastore.errorTitle).toBe('Warning during testplans query');
    expect(datastore.errorDescription).toContain(
      `The query builder lookups failed because the requested resource was not found. Please check the query parameters and try again.`
    );
  });
})

describe('queryTestPlansInBatches', () => {
  test('queries test plans in batches and returns aggregated response', async () => {
    const mockQueryResponse = {
      testPlans: [
        { id: '1', name: 'Test Plan 1' },
        { id: '2', name: 'Test Plan 2' }
      ],
      continuationToken: undefined,
    };

    jest.spyOn(datastore, 'queryTestPlans').mockResolvedValue(mockQueryResponse);

    const result = await datastore.queryTestPlansInBatches('', OrderByOptions.UPDATED_AT, [Projections.NAME], 2, true);

    expect(result.testPlans).toEqual(mockQueryResponse.testPlans);
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
      .toThrow('The query failed due to the following error: (status 500) "Error".');
    });

    it('should throw timeOut error when API returns 504 status', async () => {
      backendServer.fetch
        .calledWith(requestMatching({ url: '/niworkorder/v1/query-testplans' }))
        .mockReturnValue(createFetchError(504));

      await expect(datastore.queryTestPlans()).rejects.toThrow(
        'The query to fetch testplans experienced a timeout error. Narrow your query with a more specific filter and try again.'
      );
    });

    it('should throw too many requests error when API returns 429 status', async () => {
      jest.spyOn(datastore, 'post').mockImplementation(() => {
        throw new Error('Request failed with status code: 429');
      });

      await expect(datastore.queryTestPlans()).rejects.toThrow(
        'The query to fetch testplans failed due to too many requests. Please try again later.'
      );
    });

    it('should throw not found error when API returns 404 status', async () => {
      backendServer.fetch
        .calledWith(requestMatching({ url: '/niworkorder/v1/query-testplans' }))
        .mockReturnValue(createFetchError(404));

      await expect(datastore.queryTestPlans()).rejects.toThrow(
        'The query to fetch testplans failed because the requested resource was not found. Please check the query parameters and try again.'
      );
    })

    it('should throw error with unknown error when API returns error without status', async () => {
      backendServer.fetch
        .calledWith(requestMatching({ url: '/niworkorder/v1/query-testplans' }))
        .mockImplementation(() => {
          throw new Error('Error');
        });

      await expect(datastore.queryTestPlans()).rejects.toThrow('The query failed due to an unknown error.');
    });

    it('should publish alertError event when error occurs', async () => {
      const publishMock = jest.fn();
      (datastore as any).appEvents = { publish: publishMock };
      backendServer.fetch
        .calledWith(requestMatching({ url: '/niworkorder/v1/query-testplans' }))
        .mockReturnValue(createFetchError(400));

      await expect(datastore.queryTestPlans()).rejects.toThrow(
        'The query failed due to the following error: (status 400) "Error".'
      );

      expect(publishMock).toHaveBeenCalledWith({
        type: 'alert-error',
        payload: [
          'Error during testplans query',
          expect.stringContaining('The query failed due to the following error: (status 400) "Error".'),
        ],
      });
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
      recordCount: 1000
    };

    const results = await datastore.metricFindQuery(query, options);

    expect(results).toMatchSnapshot();
    expect(backendServer.fetch).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          orderBy: OrderByOptions.UPDATED_AT,
          descending: true,
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
      recordCount: 1000,
    };
    jest.spyOn(datastore.templateSrv, 'replace').mockReturnValue('workspace = "testWorkspace"');
    jest.spyOn(datastore, 'queryTestPlansInBatches').mockResolvedValue({ testPlans: [] });

    const options = { scopedVars: { var: { value: 'testWorkspace' } } };
    await datastore.metricFindQuery(mockQuery, options);

    expect(datastore.templateSrv.replace).toHaveBeenCalledWith('workspace = "${var}"', options.scopedVars);
    expect(datastore.queryTestPlansInBatches).toHaveBeenCalledWith(
      'workspace = "testWorkspace"',
      "UPDATED_AT",
      ["ID", "NAME"],
      1000,
      true
    );
  });

  test('should transform fields with multiple values', async () => {
    const mockQuery = {
      refId: 'C',
      outputType: OutputType.Properties,
      queryBy: 'workspace = "${var}"',
      recordCount: 1000,
    };
    const options = { scopedVars: { var: { value: '{testWorkspace1,testWorkspace2}' } } };
    jest.spyOn(datastore.templateSrv, 'replace').mockReturnValue('workspace = "{testWorkspace1,testWorkspace2}"');
    jest.spyOn(datastore, 'queryTestPlansInBatches').mockResolvedValue({ testPlans: [] });

    await datastore.metricFindQuery(mockQuery, options);

    expect(datastore.queryTestPlansInBatches).toHaveBeenCalledWith(
      '(workspace = "testWorkspace1" || workspace = "testWorkspace2")',
      "UPDATED_AT",
      ["ID", "NAME"],
      1000,
      true
    );
  });

  test('should transform fields when queryBy contains a date', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2025-01-01'));
    jest.spyOn(datastore, 'queryTestPlansInBatches').mockResolvedValue({ testPlans: [] });

    const mockQuery = {
      refId: 'C',
      outputType: OutputType.Properties,
      queryBy: 'updatedAt = "${__now:date}"',
      recordCount: 1000
    };

    await datastore.metricFindQuery(mockQuery, {});

    expect(datastore.queryTestPlansInBatches).toHaveBeenCalledWith(
      'updatedAt = "2025-01-01T00:00:00.000Z"',
      "UPDATED_AT",
      ["ID", "NAME"],
      1000,
      true
    );

    jest.useRealTimers();
  });

  test('should transform field when queryBy contains duration fields', async () => {
    const mockQuery = {
      refId: 'C',
      queryBy: '(estimatedDurationInDays > "2" && estimatedDurationInHours != "2")',
      recordCount: 1000
    };

    jest.spyOn(datastore, 'queryTestPlansInBatches').mockResolvedValue({ testPlans: [] });

    await datastore.metricFindQuery(mockQuery, {});

    expect(datastore.queryTestPlansInBatches).toHaveBeenCalledWith(
      '(estimatedDurationInSeconds > \"172800\" && estimatedDurationInSeconds != \"7200\")',
      "UPDATED_AT",
      ["ID", "NAME"],
      1000,
      true
    );
  });

  test('should transform field when queryBy contains duration fields with negative values', async () => {
    const mockQuery = {
      refId: 'C',
      queryBy: '(estimatedDurationInDays > "-2" && estimatedDurationInHours != "-2")',
      recordCount: 1000
    };

    jest.spyOn(datastore, 'queryTestPlansInBatches').mockResolvedValue({ testPlans: [] });

    await datastore.metricFindQuery(mockQuery, {});

    expect(datastore.queryTestPlansInBatches).toHaveBeenCalledWith(
      '(estimatedDurationInSeconds > \"-172800\" && estimatedDurationInSeconds != \"-7200\")',
      "UPDATED_AT",
      ["ID", "NAME"],
      1000,
      true
    );
  });

  it('should populate default query properties', async () => {
    const mockQuery = {
      refId: 'C'
    };

    jest.spyOn(datastore, 'queryTestPlansInBatches').mockResolvedValue({ testPlans: [] });

    await datastore.metricFindQuery(mockQuery, {});

    expect(datastore.queryTestPlansInBatches).toHaveBeenCalledWith(
      undefined,
      "UPDATED_AT",
      ["ID", "NAME"],
      1000,
      true
    );
  });

  test('should return empty array when record count is invalid', async () => {
    const mockQuery = {
      refId: 'A',
      recordCount: undefined,
    };

    const result = await datastore.metricFindQuery(mockQuery, {} as LegacyMetricFindQueryOptions);

    expect(result).toEqual([]);
  });

  test('should return empty array when record count is less than 0', async () => {
    const mockQuery = {
      refId: 'A',
      recordCount: -1,
    };

    const result = await datastore.metricFindQuery(mockQuery, {} as LegacyMetricFindQueryOptions);

    expect(result).toEqual([]);
  });

  test('should return empty array when record count is greater than max take', async () => {
    const mockQuery = {
      refId: 'A',
      recordCount: 1000000,
    };

    const result = await datastore.metricFindQuery(mockQuery, {} as LegacyMetricFindQueryOptions);

    expect(result).toEqual([]);
  });

  test('should return expected data when record count is 0', async () => {
    const mockQuery = {
      refId: 'A',
      recordCount: 0,
    };

    const result = await datastore.metricFindQuery(mockQuery, {} as LegacyMetricFindQueryOptions);

    expect(result).toMatchSnapshot();
  });

  test('should return expected data when record count is 10000', async () => {
    const mockQuery = {
      refId: 'A',
      recordCount: 10000,
    };

    const result = await datastore.metricFindQuery(mockQuery, {} as LegacyMetricFindQueryOptions);

    expect(result).toMatchSnapshot();
  });

  it('should sort testplan options by name', async () => {
    const mockQuery = {
      refId: 'A',
      outputType: OutputType.Properties,
      properties: [Properties.NAME],
      recordCount: 1000,
    };

    const testPlansResponse = {
      testPlans: [
        { id: '1', name: 'Test Plan B' },
        { id: '3', name: 'Test Plan C' },
        { id: '2', name: 'Test Plan A' },
      ],
    };

    jest.spyOn(datastore, 'queryTestPlansInBatches').mockResolvedValue(testPlansResponse);

    const result = await datastore.metricFindQuery(mockQuery, {} as DataQueryRequest);

    expect(result).toEqual([
      { text: 'Test Plan A (2)', value: '2' },
      { text: 'Test Plan B (1)', value: '1' },
      { text: 'Test Plan C (3)', value: '3' }
    ]);
  });
});
