import { BackendSrv, FetchResponse, TemplateSrv } from "@grafana/runtime";
import { MockProxy } from "jest-mock-extended";
import { createFetchError, createFetchResponse, defaultQueryOptions, getQueryBuilder, mockTimers, peakDaysMock, requestMatching, setupDataSource } from "test/fixtures";
import { AssetUtilizationDataSource } from "./AssetUtilizationDataSource";
import { AssetUtilizationHistoryResponse, AssetUtilizationQuery, IsNIAsset, IsPeak, ServicePolicyModel, UtilizationCategory, UtilizationTimeFrequency } from "./types";
import { minuteInSeconds } from "./constants";
import { Observable } from "rxjs";

let ds: AssetUtilizationDataSource, backendSrv: MockProxy<BackendSrv>, templateSrv: MockProxy<TemplateSrv>
let fetchPolicy: jest.Mock<Observable<FetchResponse<unknown>>>

beforeEach(() => {
  [ds, backendSrv, templateSrv] = setupDataSource(AssetUtilizationDataSource);
  fetchPolicy = backendSrv.fetch
    .calledWith(requestMatching({ url: '/niapm/v1/policy' }))
    .mockReturnValue(createFetchResponse({
      workingHoursPolicy: {
        startTime: '09:00:00',
        endTime: '17:00:00'
      }
    } as ServicePolicyModel))
});

export const assetUtilizationQueryMock: AssetUtilizationQuery = {
  isPeak: IsPeak.NONPEAK,
  peakDays: peakDaysMock,
  refId: '',
  utilizationCategory: UtilizationCategory.TEST,
  assetIdentifier: '321',
  isNIAsset: IsNIAsset.NIASSET,
  minionId: '123',
  timeFrequency: UtilizationTimeFrequency.DAILY
}

const buildQuery = getQueryBuilder<AssetUtilizationQuery>()({});

mockTimers();

describe('testDatasource', () => {
  test('returns success', async () => {
    backendSrv.fetch
      .calledWith(requestMatching({ url: '/niapm/v1/query-asset-utilization' }))
      .mockReturnValue(createFetchResponse(25));

    const result = await ds.testDatasource();

    expect(result.status).toEqual('success');
  });

  test('bubbles up exception', async () => {
    backendSrv.fetch
      .calledWith(requestMatching({ url: '/niapm/v1/query-asset-utilization' }))
      .mockReturnValue(createFetchError(400));

    await expect(ds.testDatasource()).rejects.toHaveProperty('status', 400);
  });
})

describe('queries', () => {
  test('runs query', async () => {
    const start = defaultQueryOptions.range.from.add(minuteInSeconds)
    const end = defaultQueryOptions.range.to.add(-minuteInSeconds)

    const fectchHistory = backendSrv.fetch
      .calledWith(requestMatching({ url: '/niapm/v1/query-asset-utilization-history' }))
      .mockReturnValue(createFetchResponse({ assetUtilizations: [{ startTimestamp: start.toISOString(), endTimestamp: end.toISOString() }] } as AssetUtilizationHistoryResponse))

    const result = await ds.query(buildQuery(assetUtilizationQueryMock))

    expect(result.data[0].fields[0]).toStrictEqual({ name: 'time', values: [] })
    expect(result.data[0].fields[1]).toStrictEqual({ name: '321 - A', values: [] })
    expect(fectchHistory).toHaveBeenCalledTimes(1)
    expect(fetchPolicy).toHaveBeenCalledTimes(1)
  })

  test('runs query with empty asset utilization', async () => {
    backendSrv.fetch
      .calledWith(requestMatching({ url: '/niapm/v1/query-asset-utilization-history' }))
      .mockReturnValue(createFetchResponse({ assetUtilizations: [] }))

    const result = await ds.query(buildQuery(assetUtilizationQueryMock))

    expect(result.data[0].fields[0]).toStrictEqual({ name: 'time', values: [] })
    expect(result.data[0].fields[1]).toStrictEqual({ name: '321 - A', values: [] })
  })

  test('handles query error', async () => {
    backendSrv.fetch
      .calledWith(requestMatching({ url: '/niapm/v1/query-asset-utilization-history' }))
      .mockReturnValue(createFetchError(418))

    const result = await ds.query(buildQuery(assetUtilizationQueryMock))

    expect(result.data[0].fields[0]).toStrictEqual({ name: 'time', values: [] })
    expect(result.data[0].fields[1]).toStrictEqual({ name: '321 - A', values: [] })
  })
})