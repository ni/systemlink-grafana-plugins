import { BackendSrv } from "@grafana/runtime";
import { MockProxy } from "jest-mock-extended";
import {
  createFetchError,
  createFetchResponse,
  getQueryBuilder,
  requestMatching,
  setupDataSource,
} from "test/fixtures";
import { AssetCalibrationDataSource } from "./AssetCalibrationDataSource";
import {
  AssetCalibrationPropertyGroupByType,
  AssetCalibrationQuery,
  AssetCalibrationTimeBasedGroupByType,
  AssetType,
  BusType,
  CalibrationForecastResponse,
  ColumnDescriptorType,
} from "./types";
import { SystemMetadata } from "datasources/system/types";
import { dateTime } from "@grafana/data";
import { AssetCalibrationFieldNames } from "./constants";

let datastore: AssetCalibrationDataSource, backendServer: MockProxy<BackendSrv>

beforeEach(() => {
  [datastore, backendServer] = setupDataSource(AssetCalibrationDataSource);

  backendServer.fetch
    .calledWith(requestMatching({ url: '/nisysmgmt/v1/query-systems' }))
    .mockReturnValue(createFetchResponse({ data: fakeSystems }));
});

const monthGroupCalibrationForecastResponseMock: CalibrationForecastResponse =
{
  calibrationForecast: {
    columns: [
      { name: "", values: ["2022-01-01T00:00:00.0000000Z", "2022-02-01T00:00:00.0000000Z", "2022-03-01T00:00:00.0000000Z"], columnDescriptors: [{ value: "Month", type: ColumnDescriptorType.Time }] },
      { name: "", values: [1, 0, 3], columnDescriptors: [{ value: "Assets", type: ColumnDescriptorType.Count }] }
    ]
  }
}

const dayGroupCalibrationForecastResponseMock: CalibrationForecastResponse =
{
  calibrationForecast: {
    columns: [
      { name: "", values: ["2022-01-01T00:00:00.0000000Z", "2022-01-02T00:00:00.0000000Z", "2022-01-03T00:00:00.0000000Z"], columnDescriptors: [{ value: "Day", type: ColumnDescriptorType.Time }] },
      { name: "", values: [1, 2, 2], columnDescriptors: [{ value: "Assets", type: ColumnDescriptorType.Count }] }
    ]
  }
}

const weekGroupCalibrationForecastResponseMock: CalibrationForecastResponse =
{
  calibrationForecast: {
    columns: [
      { name: "", values: ["2022-01-03T00:00:00.0000000Z", "2022-01-10T00:00:00.0000000Z", "2022-01-17T00:00:00.0000000Z"], columnDescriptors: [{ value: "Week", type: ColumnDescriptorType.Time }] },
      { name: "", values: [1, 2, 2], columnDescriptors: [{ value: "Assets", type: ColumnDescriptorType.Count }] }
    ]
  }
}

const locationGroupCalibrationForecastResponseMock: CalibrationForecastResponse =
{
  calibrationForecast: {
    columns: [
      { name: "", values: [1], columnDescriptors: [{ value: "Location1", type: ColumnDescriptorType.StringValue }] },
      { name: "", values: [2], columnDescriptors: [{ value: "Location2", type: ColumnDescriptorType.StringValue }] },
      { name: "", values: [3], columnDescriptors: [{ value: "Location3", type: ColumnDescriptorType.StringValue }] }
    ]
  }
}

const minionIdLocationGroupCalibrationForecastResponseMock: CalibrationForecastResponse =
{
  calibrationForecast: {
    columns: [
      { name: "", values: [1], columnDescriptors: [{ value: "Minion1", type: ColumnDescriptorType.MinionId }] },
      { name: "", values: [2], columnDescriptors: [{ value: "Minion2", type: ColumnDescriptorType.MinionId }] },
      { name: "", values: [3], columnDescriptors: [{ value: "Minion3", type: ColumnDescriptorType.MinionId }] }
    ]
  }
}


const modelGroupCalibrationForecastResponseMock: CalibrationForecastResponse =
{
  calibrationForecast: {
    columns: [
      { name: "", values: [1], columnDescriptors: [{ value: "Model1", type: ColumnDescriptorType.StringValue }] },
      { name: "", values: [2], columnDescriptors: [{ value: "Model2", type: ColumnDescriptorType.StringValue }] }
    ]
  }
}

const emptyGroupCalibrationForecastResponseMock: CalibrationForecastResponse =
{
  calibrationForecast: {
    columns: [
    ]
  }
}

const modelLocationGroupCalibrationForecastResponseMock: CalibrationForecastResponse =
{
  calibrationForecast: {
    columns: [
      { name: "", values: [1], columnDescriptors: [{ value: "Model1", type: ColumnDescriptorType.StringValue }, { value: "Location1", type: ColumnDescriptorType.StringValue }] },
      { name: "", values: [2], columnDescriptors: [{ value: "Model2", type: ColumnDescriptorType.StringValue }, { value: "Location1", type: ColumnDescriptorType.StringValue }] }
    ]
  }
}

const monthLocationGroupCalibrationForecastResponseMock: CalibrationForecastResponse =
{
  calibrationForecast: {
    columns: [
      { name: "", values: ["2022-01-01T00:00:00.0000000Z", "2022-02-01T00:00:00.0000000Z", "2022-03-01T00:00:00.0000000Z"], columnDescriptors: [{ value: "Month", type: ColumnDescriptorType.Time }] },
      { name: "", values: [1, 2, 3], columnDescriptors: [{ value: "Location1", type: ColumnDescriptorType.StringValue }] },
      { name: "", values: [2, 4, 1], columnDescriptors: [{ value: "Location2", type: ColumnDescriptorType.StringValue }] },
      { name: "", values: [4, 3, 1], columnDescriptors: [{ value: "Location3", type: ColumnDescriptorType.StringValue }] }
    ]
  }
}

const workspaceGroupCalibrationForecastResponseMock: CalibrationForecastResponse =
{
  calibrationForecast: {
    columns: [
      { name: "", values: [1], columnDescriptors: [{ value: "Workspace1", type: ColumnDescriptorType.WorkspaceId }] },
      { name: "", values: [2], columnDescriptors: [{ value: "Workspace1", type: ColumnDescriptorType.WorkspaceId }] }
    ]
  }
}

const vendorGroupCalibrationForecastResponseMock: CalibrationForecastResponse =
{
  calibrationForecast: {
    columns: [
      { name: "", values: [1], columnDescriptors: [{ value: "Vendor1", type: ColumnDescriptorType.StringValue }] },
      { name: "", values: [2], columnDescriptors: [{ value: "Vendor2", type: ColumnDescriptorType.StringValue }] }
    ]
  }
}

const assetTypeGroupCalibrationForecastResponseMock: CalibrationForecastResponse =
{
  calibrationForecast: {
    columns: [
      { name: "", values: [1], columnDescriptors: [{ value: AssetType.GENERIC, type: ColumnDescriptorType.AssetType }] },
      { name: "", values: [2], columnDescriptors: [{ value: AssetType.DEVICE_UNDER_TEST, type: ColumnDescriptorType.AssetType }] }
    ]
  }
}

const busTypeGroupCalibrationForecastResponseMock: CalibrationForecastResponse =
{
  calibrationForecast: {
    columns: [
      { name: "", values: [1], columnDescriptors: [{ value: BusType.BUILT_IN_SYSTEM, type: ColumnDescriptorType.BusType }] },
      { name: "", values: [2], columnDescriptors: [{ value: BusType.FIRE_WIRE, type: ColumnDescriptorType.BusType }] }
    ]
  }
}

const modelWorkspaceGroupCalibrationForecastResponseMock: CalibrationForecastResponse =
{
  calibrationForecast: {
    columns: [
      { name: "", values: [1], columnDescriptors: [{ value: "Model1", type: ColumnDescriptorType.StringValue }, { value: "Workspace1", type: ColumnDescriptorType.WorkspaceId }] },
      { name: "", values: [2], columnDescriptors: [{ value: "Model2", type: ColumnDescriptorType.StringValue }, { value: "Workspace1", type: ColumnDescriptorType.WorkspaceId }] }
    ]
  }
}

const monthWorkspaceGroupCalibrationForecastResponseMock: CalibrationForecastResponse =
{
  calibrationForecast: {
    columns: [
      { name: "", values: ["2022-01-01T00:00:00.0000000Z", "2022-02-01T00:00:00.0000000Z", "2022-03-01T00:00:00.0000000Z"], columnDescriptors: [{ value: "Month", type: ColumnDescriptorType.Time }] },
      { name: "", values: [1, 2, 3], columnDescriptors: [{ value: "Workspace1", type: ColumnDescriptorType.WorkspaceId }] },
      { name: "", values: [2, 4, 1], columnDescriptors: [{ value: "Workspace2", type: ColumnDescriptorType.WorkspaceId }] },
      { name: "", values: [4, 3, 1], columnDescriptors: [{ value: "Workspace3", type: ColumnDescriptorType.WorkspaceId }] }
    ]
  }
}

const monthVendorGroupCalibrationForecastResponseMock: CalibrationForecastResponse =
{
  calibrationForecast: {
    columns: [
      { name: "", values: ["2022-01-01T00:00:00.0000000Z", "2022-02-01T00:00:00.0000000Z", "2022-03-01T00:00:00.0000000Z"], columnDescriptors: [{ value: "Month", type: ColumnDescriptorType.Time }] },
      { name: "", values: [1, 2, 3], columnDescriptors: [{ value: "Vendor1", type: ColumnDescriptorType.StringValue }] },
      { name: "", values: [2, 4, 1], columnDescriptors: [{ value: "Vendor2", type: ColumnDescriptorType.StringValue }] },
      { name: "", values: [4, 3, 1], columnDescriptors: [{ value: "Vendor3", type: ColumnDescriptorType.StringValue }] }
    ]
  }
}

const monthAssetTypeGroupCalibrationForecastResponseMock: CalibrationForecastResponse =
{
  calibrationForecast: {
    columns: [
      { name: "", values: ["2022-01-01T00:00:00.0000000Z", "2022-02-01T00:00:00.0000000Z", "2022-03-01T00:00:00.0000000Z"], columnDescriptors: [{ value: "Month", type: ColumnDescriptorType.Time }] },
      { name: "", values: [1, 2, 3], columnDescriptors: [{ value: AssetType.DEVICE_UNDER_TEST, type: ColumnDescriptorType.AssetType }] },
      { name: "", values: [2, 4, 1], columnDescriptors: [{ value: AssetType.FIXTURE, type: ColumnDescriptorType.AssetType }] },
      { name: "", values: [4, 3, 1], columnDescriptors: [{ value: AssetType.GENERIC, type: ColumnDescriptorType.AssetType }] }
    ]
  }
}

const monthBusTypeGroupCalibrationForecastResponseMock: CalibrationForecastResponse =
{
  calibrationForecast: {
    columns: [
      { name: "", values: ["2022-01-01T00:00:00.0000000Z", "2022-02-01T00:00:00.0000000Z", "2022-03-01T00:00:00.0000000Z"], columnDescriptors: [{ value: "Month", type: ColumnDescriptorType.Time }] },
      { name: "", values: [1, 2, 3], columnDescriptors: [{ value: BusType.BUILT_IN_SYSTEM, type: ColumnDescriptorType.BusType }] },
      { name: "", values: [2, 4, 1], columnDescriptors: [{ value: BusType.ACCESSORY, type: ColumnDescriptorType.BusType }] },
      { name: "", values: [4, 3, 1], columnDescriptors: [{ value: BusType.SERIAL, type: ColumnDescriptorType.BusType }] }
    ]
  }
}

const monthBasedCalibrationForecastQueryMock: AssetCalibrationQuery = {
  refId: '',
  groupBy: [AssetCalibrationTimeBasedGroupByType.Month],
}

const weekBasedCalibrationForecastQueryMock: AssetCalibrationQuery = {
  refId: '',
  groupBy: [AssetCalibrationTimeBasedGroupByType.Week],
}

const dayBasedCalibrationForecastQueryMock: AssetCalibrationQuery = {
  refId: '',
  groupBy: [AssetCalibrationTimeBasedGroupByType.Day],
}

const locationBasedCalibrationForecastQueryMock: AssetCalibrationQuery = {
  refId: '',
  groupBy: [AssetCalibrationPropertyGroupByType.Location],
}

const modelBasedCalibrationForecastQueryMock: AssetCalibrationQuery = {
  refId: '',
  groupBy: [AssetCalibrationPropertyGroupByType.Model],
}

const workspaceBasedCalibrationForecastQueryMock: AssetCalibrationQuery = {
  refId: '',
  groupBy: [AssetCalibrationPropertyGroupByType.Workspace],
}

const modelLocationBasedCalibrationForecastQueryMock: AssetCalibrationQuery = {
  refId: '',
  groupBy: [AssetCalibrationPropertyGroupByType.Model, AssetCalibrationPropertyGroupByType.Location],
}

const monthLocationBasedCalibrationForecastQueryMock: AssetCalibrationQuery = {
  refId: '',
  groupBy: [AssetCalibrationTimeBasedGroupByType.Month, AssetCalibrationPropertyGroupByType.Location],
}

const modelWorkspaceBasedCalibrationForecastQueryMock: AssetCalibrationQuery = {
  refId: '',
  groupBy: [AssetCalibrationPropertyGroupByType.Model, AssetCalibrationPropertyGroupByType.Workspace],
}

const monthWorkspaceBasedCalibrationForecastQueryMock: AssetCalibrationQuery = {
  refId: '',
  groupBy: [AssetCalibrationTimeBasedGroupByType.Month, AssetCalibrationPropertyGroupByType.Workspace],
}

const buildCalibrationForecastQuery = getQueryBuilder<AssetCalibrationQuery>()({
  refId: '',
  groupBy: []
});

const fakeSystems: SystemMetadata[] = [
  {
    id: 'Minion1',
    alias: 'Minion1-alias',
    state: 'CONNECTED',
    workspace: '1',
  },
  {
    id: 'Minion2',
    alias: undefined,
    state: 'DISCONNECTED',
    workspace: '2',
  },
];

describe('testDatasource', () => {
  test('returns success', async () => {
    backendServer.fetch
      .calledWith(requestMatching({ url: '/niapm/v1/assets?take=1' }))
      .mockReturnValue(createFetchResponse(25));

    const result = await datastore.testDatasource();

    expect(result.status).toEqual('success');
  });

  test('bubbles up exception', async () => {
    backendServer.fetch
      .calledWith(requestMatching({ url: '/niapm/v1/assets?take=1' }))
      .mockReturnValue(createFetchError(400));

    await expect(datastore.testDatasource()).rejects.toThrow('Request to url "/niapm/v1/assets?take=1" failed with status code: 400. Error message: "Error"');
  });
})

describe('queries', () => {
  test('asset calibration forecast with month groupBy', async () => {
    backendServer.fetch
      .calledWith(requestMatching({ url: '/niapm/v1/assets/calibration-forecast' }))
      .mockReturnValue(createFetchResponse(monthGroupCalibrationForecastResponseMock as CalibrationForecastResponse))

    const result = await datastore.query(buildCalibrationForecastQuery(monthBasedCalibrationForecastQueryMock))

    expect(result.data).toMatchSnapshot()
  })

  test('asset calibration forecast with week groupBy', async () => {
    backendServer.fetch
      .calledWith(requestMatching({ url: '/niapm/v1/assets/calibration-forecast' }))
      .mockReturnValue(createFetchResponse(weekGroupCalibrationForecastResponseMock as CalibrationForecastResponse))

    const result = await datastore.query(buildCalibrationForecastQuery(weekBasedCalibrationForecastQueryMock))

    expect(result.data).toMatchSnapshot()
  })

  test('asset calibration forecast with day groupBy', async () => {
    backendServer.fetch
      .calledWith(requestMatching({ url: '/niapm/v1/assets/calibration-forecast' }))
      .mockReturnValue(createFetchResponse(dayGroupCalibrationForecastResponseMock as CalibrationForecastResponse))

    const result = await datastore.query(buildCalibrationForecastQuery(dayBasedCalibrationForecastQueryMock))

    expect(result.data).toMatchSnapshot()
  })

  test('calibration forecast with location groupBy', async () => {
    backendServer.fetch
      .calledWith(requestMatching({ url: '/niapm/v1/assets/calibration-forecast' }))
      .mockReturnValue(createFetchResponse(locationGroupCalibrationForecastResponseMock as CalibrationForecastResponse))

    const result = await datastore.query(buildCalibrationForecastQuery(locationBasedCalibrationForecastQueryMock))

    expect(result.data).toMatchSnapshot()
  })

  test('calibration forecast with minion ID location groupBy', async () => {
    backendServer.fetch
      .calledWith(requestMatching({ url: '/niapm/v1/assets/calibration-forecast' }))
      .mockReturnValue(createFetchResponse(minionIdLocationGroupCalibrationForecastResponseMock as CalibrationForecastResponse))

    const result = await datastore.query(buildCalibrationForecastQuery(locationBasedCalibrationForecastQueryMock))

    expect(result.data).toMatchSnapshot()
  })

  test('calibration forecast with model groupBy', async () => {
    backendServer.fetch
      .calledWith(requestMatching({ url: '/niapm/v1/assets/calibration-forecast' }))
      .mockReturnValue(createFetchResponse(modelGroupCalibrationForecastResponseMock as CalibrationForecastResponse))

    const result = await datastore.query(buildCalibrationForecastQuery(modelBasedCalibrationForecastQueryMock))

    expect(result.data).toMatchSnapshot();
  })

  test('calibration forecast with model and location groupBy', async () => {
    backendServer.fetch
      .calledWith(requestMatching({ url: '/niapm/v1/assets/calibration-forecast' }))
      .mockReturnValue(createFetchResponse(modelLocationGroupCalibrationForecastResponseMock as CalibrationForecastResponse))

    const result = await datastore.query(buildCalibrationForecastQuery(modelLocationBasedCalibrationForecastQueryMock))

    expect(result.data).toMatchSnapshot();
  })

  test('calibration forecast with month and location groupBy', async () => {
    backendServer.fetch
      .calledWith(requestMatching({ url: '/niapm/v1/assets/calibration-forecast' }))
      .mockReturnValue(createFetchResponse(monthLocationGroupCalibrationForecastResponseMock as CalibrationForecastResponse))

    const result = await datastore.query(buildCalibrationForecastQuery(monthLocationBasedCalibrationForecastQueryMock))

    expect(result.data).toMatchSnapshot();
  })

  test('calibration forecast with workspace groupBy', async () => {
    backendServer.fetch
      .calledWith(requestMatching({ url: '/niapm/v1/assets/calibration-forecast' }))
      .mockReturnValue(createFetchResponse(workspaceGroupCalibrationForecastResponseMock as CalibrationForecastResponse))

    const result = await datastore.query(buildCalibrationForecastQuery(workspaceBasedCalibrationForecastQueryMock))

    expect(result.data).toMatchSnapshot();
  })

  test('calibration forecast with model and workspace groupBy', async () => {
    backendServer.fetch
      .calledWith(requestMatching({ url: '/niapm/v1/assets/calibration-forecast' }))
      .mockReturnValue(createFetchResponse(modelWorkspaceGroupCalibrationForecastResponseMock as CalibrationForecastResponse))

    const result = await datastore.query(buildCalibrationForecastQuery(modelWorkspaceBasedCalibrationForecastQueryMock))

    expect(result.data).toMatchSnapshot();
  })

  test('calibration forecast with month and workspace groupBy', async () => {
    backendServer.fetch
      .calledWith(requestMatching({ url: '/niapm/v1/assets/calibration-forecast' }))
      .mockReturnValue(createFetchResponse(monthWorkspaceGroupCalibrationForecastResponseMock as CalibrationForecastResponse))

    const result = await datastore.query(buildCalibrationForecastQuery(monthWorkspaceBasedCalibrationForecastQueryMock))

    expect(result.data).toMatchSnapshot()
  })

  test('calibration forecast with vendor groupBy', async () => {
    backendServer.fetch
      .calledWith(requestMatching({ url: '/niapm/v1/assets/calibration-forecast' }))
      .mockReturnValue(createFetchResponse(vendorGroupCalibrationForecastResponseMock as CalibrationForecastResponse))

    const result = await datastore.query(buildCalibrationForecastQuery({ groupBy: [AssetCalibrationPropertyGroupByType.Vendor] }))

    expect(result.data).toMatchSnapshot();
  })

  test('calibration forecast with month and vendor groupBy', async () => {
    backendServer.fetch
      .calledWith(requestMatching({ url: '/niapm/v1/assets/calibration-forecast' }))
      .mockReturnValue(createFetchResponse(monthVendorGroupCalibrationForecastResponseMock as CalibrationForecastResponse))

    const result = await datastore.query(buildCalibrationForecastQuery({
      groupBy: [AssetCalibrationTimeBasedGroupByType.Month, AssetCalibrationPropertyGroupByType.Vendor]
    }));

    expect(result.data).toMatchSnapshot();
  })

  test('calibration forecast with assetType groupBy', async () => {
    backendServer.fetch
      .calledWith(requestMatching({ url: '/niapm/v1/assets/calibration-forecast' }))
      .mockReturnValue(createFetchResponse(assetTypeGroupCalibrationForecastResponseMock as CalibrationForecastResponse))

    const result = await datastore.query(buildCalibrationForecastQuery({ groupBy: [AssetCalibrationPropertyGroupByType.AssetType] }))

    expect(result.data).toMatchSnapshot();
  })

  test('calibration forecast with month and assetType groupBy', async () => {
    backendServer.fetch
      .calledWith(requestMatching({ url: '/niapm/v1/assets/calibration-forecast' }))
      .mockReturnValue(createFetchResponse(monthAssetTypeGroupCalibrationForecastResponseMock as CalibrationForecastResponse))

    const result = await datastore.query(buildCalibrationForecastQuery({
      groupBy: [AssetCalibrationTimeBasedGroupByType.Month, AssetCalibrationPropertyGroupByType.AssetType]
    }));

    expect(result.data).toMatchSnapshot();
  })

  test('calibration forecast with busType groupBy', async () => {
    backendServer.fetch
      .calledWith(requestMatching({ url: '/niapm/v1/assets/calibration-forecast' }))
      .mockReturnValue(createFetchResponse(busTypeGroupCalibrationForecastResponseMock as CalibrationForecastResponse))

    const result = await datastore.query(buildCalibrationForecastQuery({ groupBy: [AssetCalibrationPropertyGroupByType.BusType] }))

    expect(result.data).toMatchSnapshot();
  })

  test('calibration forecast with month and busType groupBy', async () => {
    backendServer.fetch
      .calledWith(requestMatching({ url: '/niapm/v1/assets/calibration-forecast' }))
      .mockReturnValue(createFetchResponse(monthBusTypeGroupCalibrationForecastResponseMock as CalibrationForecastResponse))

    const result = await datastore.query(buildCalibrationForecastQuery({
      groupBy: [AssetCalibrationTimeBasedGroupByType.Month, AssetCalibrationPropertyGroupByType.BusType]
    }));

    expect(result.data).toMatchSnapshot();
  })

  test('calibration forecast with month groupBy returns empty results', async () => {
    backendServer.fetch
      .calledWith(requestMatching({ url: '/niapm/v1/assets/calibration-forecast' }))
      .mockReturnValue(createFetchResponse(emptyGroupCalibrationForecastResponseMock as CalibrationForecastResponse))

    const result = await datastore.query(buildCalibrationForecastQuery(monthBasedCalibrationForecastQueryMock))

    expect(result.data).toMatchSnapshot()
  })

  test('handles metadata query error', async () => {
    backendServer.fetch
      .calledWith(requestMatching({ url: '/niapm/v1/assets/calibration-forecast' }))
      .mockReturnValue(createFetchError(418))

    await expect(datastore.query(buildCalibrationForecastQuery(monthBasedCalibrationForecastQueryMock))).rejects.toThrow()
  })

  test('validate DAY grouping', async () => {
    const request = buildCalibrationForecastQuery(dayBasedCalibrationForecastQueryMock);
    const numberOfDays = 31 * 3 + 1;
    request.range = { from: dateTime().subtract(numberOfDays, 'day'), to: dateTime(), raw: { from: `now-${numberOfDays}d`, to: 'now' } };

    await expect(datastore.query(request)).rejects.toThrow('Query range exceeds range limit of DAY grouping method: 3 months');
  })

  test('validate WEEK grouping', async () => {
    const request = buildCalibrationForecastQuery(weekBasedCalibrationForecastQueryMock);
    const numberOfDays = 366 * 2 + 1;
    request.range = { from: dateTime().subtract(numberOfDays, 'day'), to: dateTime(), raw: { from: `now-${numberOfDays}d`, to: 'now' } };

    await expect(datastore.query(request)).rejects.toThrow('Query range exceeds range limit of WEEK grouping method: 2 years');
  })

  test('validate MONTH grouping', async () => {
    const request = buildCalibrationForecastQuery(monthBasedCalibrationForecastQueryMock);
    const numberOfDays = 366 * 5 + 1;
    request.range = { from: dateTime().subtract(numberOfDays, 'day'), to: dateTime(), raw: { from: `now-${numberOfDays}d`, to: 'now' } };

    await expect(datastore.query(request)).rejects.toThrow('Query range exceeds range limit of MONTH grouping method: 5 years');
  })
})

describe('Asset calibration location queries', () => {
  let processCalibrationForecastQuerySpy: jest.SpyInstance;

  beforeEach(() => {
    processCalibrationForecastQuerySpy = jest.spyOn(datastore, 'processCalibrationForecastQuery').mockImplementation();
  });

  test('should transform LOCATION field with single value', async () => {
    const query = buildCalibrationForecastQuery({
      refId: '',
      groupBy: [AssetCalibrationTimeBasedGroupByType.Month],
      filter: `${AssetCalibrationFieldNames.LOCATION} = "Location1"`,
    });

    await datastore.query(query);

    expect(processCalibrationForecastQuerySpy).toHaveBeenCalledWith(
      expect.objectContaining({
        groupBy: [AssetCalibrationTimeBasedGroupByType.Month],
        filter: "(Location.MinionId = \"Location1\" || Location.PhysicalLocation = \"Location1\")"
      }),
      expect.anything()
    );
  });

  test('should transform LOCATION field with single value and cache hit', async () => {
    datastore.systemAliasCache.set('Location1', { id: 'Location1', alias: 'Location1-alias', state: 'CONNECTED', workspace: '1' });

    const query = buildCalibrationForecastQuery({
      refId: '',
      groupBy: [AssetCalibrationTimeBasedGroupByType.Month],
      filter: `${AssetCalibrationFieldNames.LOCATION} = "Location1"`,
    });

    await datastore.query(query);

    expect(processCalibrationForecastQuerySpy).toHaveBeenCalledWith(
      expect.objectContaining({
        groupBy: [AssetCalibrationTimeBasedGroupByType.Month],
        filter: "Location.MinionId = \"Location1\""
      }),
      expect.anything()
    );
  });

  test('should transform LOCATION field with multiple values and cache hit', async () => {
    datastore.systemAliasCache.set('Location1', { id: 'Location1', alias: 'Location1-alias', state: 'CONNECTED', workspace: '1' });
    datastore.systemAliasCache.set('Location2', { id: 'Location2', alias: 'Location2-alias', state: 'CONNECTED', workspace: '2' });

    const query = buildCalibrationForecastQuery({
      refId: '',
      groupBy: [AssetCalibrationTimeBasedGroupByType.Month],
      filter: `${AssetCalibrationFieldNames.LOCATION} = "{Location1,Location2}"`,
    });

    await datastore.query(query);

    expect(processCalibrationForecastQuerySpy).toHaveBeenCalledWith(
      expect.objectContaining({
        groupBy: [AssetCalibrationTimeBasedGroupByType.Month],
        filter: "(Location.MinionId = \"Location1\" || Location.MinionId = \"Location2\")"
      }),
      expect.anything()
    );
  });
});
