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

const calibrationForecastResponseMock: CalibrationForecastResponse =
{
    calibrationForecast: {
        columns: [
            { name: "Month", values: ["2022-01-01T00:00:00.0000000Z", "2022-02-01T00:00:00.0000000Z", "2022-03-01T00:00:00.0000000Z"] },
            { name: "Assets", values: [1, 0, 3]  },
        ]
    }
}

const assetCalibrationForecastQueryMock: AssetCalibrationQuery = {
  refId: '',
  groupBy: [AssetCalibrationForecastGroupByType.Month],
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
  test('run asset calibration forecast query', async () => {
    backendSrv.fetch
      .calledWith(requestMatching({ url: '/niapm/v1/assets/calibration-forecast' }))
      .mockReturnValue(createFetchResponse(calibrationForecastResponseMock as CalibrationForecastResponse))

    const result = await ds.query(buildCalibrationForecastQuery(assetCalibrationForecastQueryMock))

    expect(result.data).toMatchSnapshot()
  })

  test('handles metadata query error', async () => {
    backendSrv.fetch
      .calledWith(requestMatching({ url: '/niapm/v1/assets/calibration-forecast' }))
      .mockReturnValue(createFetchError(418))

    await expect(ds.query(buildCalibrationForecastQuery(assetCalibrationForecastQueryMock))).rejects.toThrow()
  })
})
