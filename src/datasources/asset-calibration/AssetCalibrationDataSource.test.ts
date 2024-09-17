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
  AssetCalibrationForecastGroupByType,
  AssetCalibrationQuery,
  CalibrationForecastResponse,
} from "./types";

let ds: AssetCalibrationDataSource, backendSrv: MockProxy<BackendSrv>

beforeEach(() => {
  [ds, backendSrv] = setupDataSource(AssetCalibrationDataSource);
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

const timeBasedCalibrationForecastQueryMock: AssetCalibrationQuery = {
  refId: '',
  groupBy: [AssetCalibrationForecastGroupByType.Month],
}

const locationBasedCalibrationForecastQueryMock: AssetCalibrationQuery = {
  refId: '',
  groupBy: [AssetCalibrationForecastGroupByType.Location],
}

const buildCalibrationForecastQuery = getQueryBuilder<AssetCalibrationQuery>()({
  refId: '',
  groupBy: []
});

describe('testDatasource', () => {
  test('returns success', async () => {
    backendSrv.fetch
      .calledWith(requestMatching({ url: '/niapm/v1/assets?take=1' }))
      .mockReturnValue(createFetchResponse(25));

    const result = await ds.testDatasource();

    expect(result.status).toEqual('success');
  });

  test('bubbles up exception', async () => {
    backendSrv.fetch
      .calledWith(requestMatching({ url: '/niapm/v1/assets?take=1' }))
      .mockReturnValue(createFetchError(400));

    await expect(ds.testDatasource()).rejects.toHaveProperty('status', 400);
  });
})

describe('queries', () => {
  test('asset calibration forecast with time groupBy', async () => {
    backendSrv.fetch
      .calledWith(requestMatching({ url: '/niapm/v1/assets/calibration-forecast' }))
      .mockReturnValue(createFetchResponse(monthGroupCalibrationForecastResponseMock as CalibrationForecastResponse))

    const result = await ds.query(buildCalibrationForecastQuery(timeBasedCalibrationForecastQueryMock))

    expect(result.data).toMatchSnapshot()
  })

  test('calibration forecast with location groupBy', async () => {
    backendSrv.fetch
      .calledWith(requestMatching({ url: '/niapm/v1/assets/calibration-forecast' }))
      .mockReturnValue(createFetchResponse(locationGroupCalibrationForecastResponseMock as CalibrationForecastResponse))

    const result = await ds.query(buildCalibrationForecastQuery(locationBasedCalibrationForecastQueryMock))

    expect(result.data).toMatchSnapshot()
  })

  test('handles metadata query error', async () => {
    backendSrv.fetch
      .calledWith(requestMatching({ url: '/niapm/v1/assets/calibration-forecast' }))
      .mockReturnValue(createFetchError(418))

    await expect(ds.query(buildCalibrationForecastQuery(timeBasedCalibrationForecastQueryMock))).rejects.toThrow()
  })
})
