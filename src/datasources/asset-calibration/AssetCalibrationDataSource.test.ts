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
  CalibrationForecastResponse,
  ColumnDescriptorType,
} from "./types";
import { SystemMetadata } from "datasources/system/types";

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

const modelLocationBasedCalibrationForecastQueryMock: AssetCalibrationQuery = {
  refId: '',
  groupBy: [AssetCalibrationPropertyGroupByType.Model, AssetCalibrationPropertyGroupByType.Location],
}

const monthLocationBasedCalibrationForecastQueryMock: AssetCalibrationQuery = {
  refId: '',
  groupBy: [AssetCalibrationTimeBasedGroupByType.Month, AssetCalibrationPropertyGroupByType.Location],
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

    await expect(datastore.testDatasource()).rejects.toHaveProperty('status', 400);
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

    expect(result.data).toMatchSnapshot()
  })

  test('calibration forecast with model and location groupBy', async () => {
    backendServer.fetch
      .calledWith(requestMatching({ url: '/niapm/v1/assets/calibration-forecast' }))
      .mockReturnValue(createFetchResponse(modelLocationGroupCalibrationForecastResponseMock as CalibrationForecastResponse))

    const result = await datastore.query(buildCalibrationForecastQuery(modelLocationBasedCalibrationForecastQueryMock))

    expect(result.data).toMatchSnapshot()
  })

  test('calibration forecast with month and location groupBy', async () => {
    backendServer.fetch
      .calledWith(requestMatching({ url: '/niapm/v1/assets/calibration-forecast' }))
      .mockReturnValue(createFetchResponse(monthLocationGroupCalibrationForecastResponseMock as CalibrationForecastResponse))

    const result = await datastore.query(buildCalibrationForecastQuery(monthLocationBasedCalibrationForecastQueryMock))

    expect(result.data).toMatchSnapshot()
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
})
