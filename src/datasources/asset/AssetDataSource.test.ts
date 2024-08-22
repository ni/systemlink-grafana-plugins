import { BackendSrv } from "@grafana/runtime";
import { MockProxy } from "jest-mock-extended";
import {
  createFetchError,
  createFetchResponse,
  getQueryBuilder,
  requestMatching,
  setupDataSource,
} from "test/fixtures";
import { AssetDataSource } from "./AssetDataSource";
import {
  AssetCalibrationForecastGroupByType,
  AssetCalibrationForecastQuery,
  AssetMetadataQuery,
  AssetPresenceWithSystemConnectionModel,
  AssetQueryType,
  AssetsResponse,
  CalibrationForecastResponse,
} from "./types";

let ds: AssetDataSource, backendSrv: MockProxy<BackendSrv>

beforeEach(() => {
  [ds, backendSrv] = setupDataSource(AssetDataSource);
});

const assetsResponseMock: AssetsResponse =
{
  "assets": [
    {
      "modelName": "sbRIO-9629",
      "modelNumber": 31299,
      "serialNumber": "01FE20D1",
      "vendorName": "National Instruments",
      "vendorNumber": 0,
      "busType": "BUILT_IN_SYSTEM",
      "name": "NI-sbRIO-9629-01FE20D1",
      "assetType": "SYSTEM",
      "discoveryType": "AUTOMATIC",
      "firmwareVersion": "8.8.0f0",
      "hardwareVersion": "",
      "visaResourceName": "",
      "temperatureSensors": [
        {
          "name": "FPGA",
          "reading": 38.5625
        },
        {
          "name": "Primary",
          "reading": 36.75
        },
        {
          "name": "Secondary",
          "reading": 34.8125
        },
        {
          "name": "CPU Core 2",
          "reading": 43
        },
        {
          "name": "CPU Core 3",
          "reading": 43
        },
        {
          "name": "CPU Core 0",
          "reading": 43
        },
        {
          "name": "CPU Core 1",
          "reading": 43
        }
      ],
      "supportsSelfCalibration": false,
      "supportsExternalCalibration": false,
      "isNIAsset": true,
      "id": "7f6d0d74-bc75-4d78-9edd-00c253b3a0de",
      "location": {
        "minionId": "NI_sbRIO-9629--SN-01FE20D1--MAC-00-80-2F-33-30-18",
        "parent": "",
        "resourceUri": "system",
        "slotNumber": -1,
        "state": {
          "assetPresence": "PRESENT"
        }
      },
      "calibrationStatus": "OK",
      "isSystemController": true,
      "workspace": "e73fcd94-649b-4d0a-b164-bf647a5d0946",
      "properties": {},
      "keywords": [],
      "lastUpdatedTimestamp": "2024-02-21T12:54:20.069Z",
      "fileIds": [],
      "supportsSelfTest": false,
      "supportsReset": false
    },
    {
      "modelName": "AI 0-15",
      "modelNumber": 31303,
      "serialNumber": "01FE20D1",
      "vendorName": "National Instruments",
      "vendorNumber": 4243,
      "busType": "CRIO",
      "name": "Conn0_AI",
      "assetType": "GENERIC",
      "discoveryType": "AUTOMATIC",
      "firmwareVersion": "",
      "hardwareVersion": "B",
      "visaResourceName": "",
      "temperatureSensors": [],
      "supportsSelfCalibration": false,
      "supportsExternalCalibration": true,
      "isNIAsset": true,
      "id": "71fbef61-fae6-4364-82d4-29feb79c7146",
      "location": {
        "minionId": "NI_sbRIO-9629--SN-01FE20D1--MAC-00-80-2F-33-30-18",
        "parent": "sbRIO1",
        "resourceUri": "7/4243/31303/01FE20D1/3",
        "slotNumber": 3,
        "state": {
          "assetPresence": "PRESENT",
          "systemConnection": "DISCONNECTED"
        } as AssetPresenceWithSystemConnectionModel
      },
      "calibrationStatus": "OK",
      "isSystemController": false,
      "workspace": "e73fcd94-649b-4d0a-b164-bf647a5d0946",
      "properties": {},
      "keywords": [],
      "lastUpdatedTimestamp": "2024-02-21T12:54:20.072Z",
      "fileIds": [],
      "supportsSelfTest": false,
      "supportsReset": false
    },
    {
      "modelName": "AO 0-3",
      "modelNumber": 31304,
      "serialNumber": "01FE20D1",
      "vendorName": "National Instruments",
      "vendorNumber": 4243,
      "busType": "CRIO",
      "name": "Conn0_AO",
      "assetType": "GENERIC",
      "discoveryType": "AUTOMATIC",
      "firmwareVersion": "",
      "hardwareVersion": "B",
      "visaResourceName": "",
      "temperatureSensors": [],
      "supportsSelfCalibration": false,
      "supportsExternalCalibration": true,
      "isNIAsset": true,
      "id": "cf1ac843-06a2-4713-ab43-f9d1d8dfdc32",
      "location": {
        "minionId": "NI_sbRIO-9629--SN-01FE20D1--MAC-00-80-2F-33-30-18",
        "parent": "sbRIO1",
        "resourceUri": "7/4243/31304/01FE20D1/4",
        "slotNumber": 4,
        "state": {
          "assetPresence": "PRESENT",
          "systemConnection": "DISCONNECTED"
        } as AssetPresenceWithSystemConnectionModel
      },
      "calibrationStatus": "OK",
      "isSystemController": false,
      "workspace": "e73fcd94-649b-4d0a-b164-bf647a5d0946",
      "properties": {},
      "keywords": [],
      "lastUpdatedTimestamp": "2024-02-21T12:54:20.076Z",
      "fileIds": [],
      "supportsSelfTest": false,
      "supportsReset": false
    },
    {
      "modelName": "DIO 0-3",
      "modelNumber": 31305,
      "serialNumber": "01FE20D1",
      "vendorName": "National Instruments",
      "vendorNumber": 4243,
      "busType": "CRIO",
      "name": "Conn0_DIO0-3",
      "assetType": "GENERIC",
      "discoveryType": "AUTOMATIC",
      "firmwareVersion": "",
      "hardwareVersion": "",
      "visaResourceName": "",
      "temperatureSensors": [],
      "supportsSelfCalibration": false,
      "supportsExternalCalibration": false,
      "isNIAsset": true,
      "id": "456e8812-1da4-4818-afab-f0cd34f74567",
      "location": {
        "minionId": "NI_sbRIO-9629--SN-01FE20D1--MAC-00-80-2F-33-30-18",
        "parent": "sbRIO1",
        "resourceUri": "7/4243/31305/01FE20D1/5",
        "slotNumber": 5,
        "state": {
          "assetPresence": "PRESENT",
          "systemConnection": "DISCONNECTED"
        } as AssetPresenceWithSystemConnectionModel
      },
      "calibrationStatus": "OK",
      "isSystemController": false,
      "workspace": "e73fcd94-649b-4d0a-b164-bf647a5d0946",
      "properties": {},
      "keywords": [],
      "lastUpdatedTimestamp": "2024-02-21T12:54:20.078Z",
      "fileIds": [],
      "supportsSelfTest": false,
      "supportsReset": false
    }
  ],
  "totalCount": 4
}

const calibrationForecastResponseMock: CalibrationForecastResponse = {
  calibrationForecast: {
    columns: [
      { name: 'Time', values: ['2024-07-24T00:00:00Z', '2024-08-24T00:00:00Z', '2024-09-24T00:00:00Z', '2024-10-24T00:00:00Z', '2024-11-24T00:00:00Z', '2024-12-24T00:00:00Z'] },
      { name: 'Lab1', values: [1, 2, 3, 4, 5, 6] },
      { name: 'Lab2', values: [0, 1, 2, 3, 4, 4] },
    ],
  }
}

const assetMetadataQueryMock: AssetMetadataQuery = {
  queryKind: AssetQueryType.Metadata,
  workspace: '',
  refId: '',
  minionIds: ['123']
}

const calibrationForecastQueryMock: AssetCalibrationForecastQuery = {
  queryKind: AssetQueryType.CalibrationForecast,
  refId: null!,
  groupBy: [AssetCalibrationForecastGroupByType.Month]
}

const buildMetadataQuery = getQueryBuilder<AssetMetadataQuery>()({
  queryKind: AssetQueryType.Metadata,
  workspace: '',
  minionIds: [],
});

const buildCalibrationForecastQuery = getQueryBuilder<AssetCalibrationForecastQuery>()({
  queryKind: AssetQueryType.CalibrationForecast,
  groupBy: [AssetCalibrationForecastGroupByType.Month]
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
  test('run metadata query', async () => {
    backendSrv.fetch
      .calledWith(requestMatching({ url: '/niapm/v1/query-assets' }))
      .mockReturnValue(createFetchResponse(assetsResponseMock as AssetsResponse))

    const result = await ds.query(buildMetadataQuery(assetMetadataQueryMock))

    expect(result.data).toMatchSnapshot()
  })

  test('handles metadata query error', async () => {
    backendSrv.fetch
      .calledWith(requestMatching({ url: '/niapm/v1/query-assets' }))
      .mockReturnValue(createFetchError(418))

    await expect(ds.query(buildMetadataQuery(assetMetadataQueryMock))).rejects.toThrow()
  })

  test('run calibration forecast query', async () => {
    backendSrv.fetch
      .calledWith(requestMatching({ url: '/niapm/v1/assets/calibration-forecast' }))
      .mockReturnValue(createFetchResponse(calibrationForecastResponseMock as CalibrationForecastResponse))

    const result = await ds.query(buildCalibrationForecastQuery(calibrationForecastQueryMock))

    expect(result.data).toMatchSnapshot()
  })

  test('handles calibration forecast query error', async () => {
    backendSrv.fetch
      .calledWith(requestMatching({ url: '/niapm/v1/assets/calibration-forecast' }))
      .mockReturnValue(createFetchError(418))

    await expect(ds.query(buildCalibrationForecastQuery(calibrationForecastQueryMock))).rejects.toThrow()
  })

  describe('format dates', () => {
    test('format day', () => {
      const field = ds.formatField({ name: "Time", values: ['2024-07-24T00:00:00Z'] }, { groupBy: [AssetCalibrationForecastGroupByType.Day], queryKind: null!, refId: null! })
      expect(field.values).toEqual(['2024-07-24'])
    })

    test('format week', () => {
      const field = ds.formatField({ name: "Time", values: ['2024-07-24T00:00:00Z'] }, { groupBy: [AssetCalibrationForecastGroupByType.Week], queryKind: null!, refId: null! })
      expect(field.values).toEqual(['2024-07-24 : 2024-07-30'])
    })

    test('format month', () => {
      const field = ds.formatField({ name: "Time", values: ['2024-07-24T00:00:00Z'] }, { groupBy: [AssetCalibrationForecastGroupByType.Month], queryKind: null!, refId: null! })
      expect(field.values).toEqual(['July 2024'])
    })
  })
})
