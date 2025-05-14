import { MockProxy } from "jest-mock-extended";
import { TestPlansDataSource } from "./TestPlansDataSource";
import { BackendSrv } from "@grafana/runtime";
import { createFetchError, createFetchResponse, requestMatching, setupDataSource } from "test/fixtures";
import { OrderByOptions, OutputType, PropertiesOptions } from "./types";


let datastore: TestPlansDataSource, backendServer: MockProxy<BackendSrv>

beforeEach(() => {
  [datastore, backendServer] = setupDataSource(TestPlansDataSource);
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
      PropertiesOptions.NAME,
      PropertiesOptions.STATE,
      PropertiesOptions.ASSIGNED_TO,
      PropertiesOptions.PRODUCT,
      PropertiesOptions.DUT,
      PropertiesOptions.PLANNED_START_DATE,
      PropertiesOptions.ESTIMATED_DURATION,
      PropertiesOptions.SYSTEM,
      PropertiesOptions.UPDATED_AT
    ]);
    expect(defaultQuery.orderBy).toEqual(OrderByOptions.UPDATED_AT);
    expect(defaultQuery.descending).toEqual(true);
  });
});
