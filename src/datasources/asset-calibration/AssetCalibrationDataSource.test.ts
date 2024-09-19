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
} from "./types";

let datastore: AssetCalibrationDataSource, backendServer: MockProxy<BackendSrv>

beforeEach(() => {
  [datastore, backendServer] = setupDataSource(AssetCalibrationDataSource);
});

const monthGroupCalibrationForecastResponseMock: CalibrationForecastResponse =
{
    calibrationForecast: {
        columns: [
            { name: "Month", values: ["2022-01-01T00:00:00.0000000Z", "2022-02-01T00:00:00.0000000Z", "2022-03-01T00:00:00.0000000Z"] },
            { name: "Assets", values: [1, 0, 3] },
        ]
    }
}

const weekGroupCalibrationForecastResponseMock: CalibrationForecastResponse =
{
    calibrationForecast: {
        columns: [
            { name: "Day", values: ["2022-01-01T00:00:00.0000000Z", "2022-01-02T00:00:00.0000000Z", "2022-01-03T00:00:00.0000000Z"] },
            { name: "Assets", values: [1, 2, 2] },
        ]
    }
}

const dayGroupCalibrationForecastResponseMock: CalibrationForecastResponse =
{
    calibrationForecast: {
        columns: [
            { name: "Week", values: ["2022-01-03T00:00:00.0000000Z", "2022-01-10T00:00:00.0000000Z", "2022-01-17T00:00:00.0000000Z"] },
            { name: "Assets", values: [1, 2, 2] },
        ]
    }
}

const locationGroupCalibrationForecastResponseMock: CalibrationForecastResponse =
{
    calibrationForecast: {
        columns: [
          { name: "Location1", values: [1] },
          { name: "Location2", values: [2] },
          { name: "Location3", values: [3] },
        ]
    }
}

const modelGroupCalibrationForecastResponseMock: CalibrationForecastResponse =
{
    calibrationForecast: {
        columns: [
          { name: "Model1", values: [1] },
          { name: "Model2", values: [2] },
        ]
    }
}

const modelLocationGroupCalibrationForecastResponseMock: CalibrationForecastResponse =
{
    calibrationForecast: {
        columns: [
          { name: "Model1 - Localtion1", values: [1] },
          { name: "Model2 - Localtion1", values: [2] },
        ]
    }
}

const monthLocationGroupCalibrationForecastResponseMock: CalibrationForecastResponse =
{
    calibrationForecast: {
        columns: [
            { name: "Month", values: ["2022-01-01T00:00:00.0000000Z", "2022-02-01T00:00:00.0000000Z", "2022-03-01T00:00:00.0000000Z"] },
            { name: "Location1", values: [1, 2, 3] },
            { name: "Location2", values: [2, 4, 1] },
            { name: "Location3", values: [4, 3, 1] },
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

  test('handles metadata query error', async () => {
    backendServer.fetch
      .calledWith(requestMatching({ url: '/niapm/v1/assets/calibration-forecast' }))
      .mockReturnValue(createFetchError(418))

    await expect(datastore.query(buildCalibrationForecastQuery(monthBasedCalibrationForecastQueryMock))).rejects.toThrow()
  })
})
