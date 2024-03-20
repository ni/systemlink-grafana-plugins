import { BackendSrv } from "@grafana/runtime";
import { MockProxy } from "jest-mock-extended";
import {
  createFetchError,
  createFetchResponse,
  getQueryBuilder,
  mockTimers,
  peakDaysMock,
  requestMatching,
  setupDataSource,
  assetModelMock,
} from "test/fixtures";
import { AssetDataSource } from "./AssetDataSource";
import {
  AssetsResponse,
  AssetQueryType,
  AssetQuery,
  EntityType,
  IsNIAsset,
  IsPeak,
  UtilizationCategory,
  TimeFrequency, PolicyOption
} from "./types";
import { dateTime } from "@grafana/data";


let ds: AssetDataSource, backendSrv: MockProxy<BackendSrv>

beforeEach(() => {
  [ds, backendSrv] = setupDataSource(AssetDataSource);
});

const assetUtilizationQueryMock: AssetQuery = {
  assetQueryType: AssetQueryType.METADATA,
  workspace: '',
  entityType: EntityType.ASSET,
  isPeak: IsPeak.NONPEAK,
  peakDays: peakDaysMock,
  refId: '',
  utilizationCategory: UtilizationCategory.TEST,
  assetIdentifier: '321',
  isNIAsset: IsNIAsset.NIASSET,
  minionId: '123',
  timeFrequency: TimeFrequency.DAILY,
  peakStart: dateTime(new Date(2024, 1, 1, 9, 0)),
  nonPeakStart: dateTime(new Date(2024, 1, 1, 17, 0)),
  policyOption: PolicyOption.DEFAULT
}

const dataFrameDTOMock = [
  { name: 'model name', values: [''] },
  { name: 'serial number', values: [''] },
  { name: 'bus type', values: ['USB'] },
  { name: 'asset type', values: ['DEVICE_UNDER_TEST'] },
  { name: 'is NI asset', values: [true] },
  {
    name: 'calibration status',
    values: ['APPROACHING_RECOMMENDED_DUE_DATE']
  },
  { name: 'is system controller', values: [true] },
  { name: 'workspace', values: [''] },
  { name: 'last updated timestamp', values: [''] },
  { name: 'minionId', values: ['minion1'] },
  { name: 'parent name', values: [''] },
  { name: 'system name', values: ['system1'] },
  {
    name: 'calibration due date',
    values: ['2019-05-07T18:58:05.000Z']
  }
]

const buildQuery = getQueryBuilder<AssetQuery>()({});

mockTimers();

describe('testDatasource', () => {
  test('returns success', async () => {
    backendSrv.fetch
      .calledWith(requestMatching({ url: '/niapm/v1/assets' }))
      .mockReturnValue(createFetchResponse(25));

    const result = await ds.testDatasource();

    expect(result.status).toEqual('success');
  });

  test('bubbles up exception', async () => {
    backendSrv.fetch
      .calledWith(requestMatching({ url: '/niapm/v1/assets' }))
      .mockReturnValue(createFetchError(400));

    await expect(ds.testDatasource()).rejects.toHaveProperty('status', 400);
  });
})

describe('queries', () => {
  test('runs metadata query', async () => {
    const queryAssets = backendSrv.fetch
      .calledWith(requestMatching({ url: '/niapm/v1/query-assets' }))
      .mockReturnValue(createFetchResponse({ assets: assetModelMock, totalCount: 0 } as AssetsResponse))

    const result = await ds.query(buildQuery(assetUtilizationQueryMock))

    expect(result.data[0].fields).toEqual(expect.arrayContaining(dataFrameDTOMock))
    expect(queryAssets).toHaveBeenCalledTimes(1)
  })

  test('handles query error', async () => {
    backendSrv.fetch
      .calledWith(requestMatching({ url: '/niapm/v1/query-assets' }))
      .mockReturnValue(createFetchError(418))

    await expect(ds.query(buildQuery(assetUtilizationQueryMock))).rejects.toThrow()
  })
})
