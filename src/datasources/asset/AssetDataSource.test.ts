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
import { AssetQueryType } from "./types/types";
import { AssetPresenceWithSystemConnectionModel, AssetsResponse } from "datasources/asset-common/types";
import { ListAssetsQuery } from "./types/ListAssets.types";
import { AssetVariableQuery } from "./types/AssetVariableQuery.types";

let ds: AssetDataSource, backendSrv: MockProxy<BackendSrv>
let assetOptions = {
  featureToggles: {
    assetListEnabled: true,
    calibrationForecastEnabled: true,
    assetSummaryEnabled: true,
  }
}

beforeEach(() => {
  [ds, backendSrv] = setupDataSource(AssetDataSource, () => assetOptions);
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
      "partNumber": "1",
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
      "supportsSelfCalibration": true,
      "selfCalibration": {
        "date": "2024-02-21T12:54:20.069Z",
      },
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
      "properties": { "Property1": "Test1", "Property2": "Test2" },
      "keywords": ["TestKeyword1", "TestKeyword2"],
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
      "partNumber": "2",
      "name": "Conn0_AI",
      "assetType": "GENERIC",
      "discoveryType": "AUTOMATIC",
      "firmwareVersion": "",
      "hardwareVersion": "B",
      "visaResourceName": "PXI::203.0::INSTR",
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
      "keywords": [ "Kw1", "Kw2" ],
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
      "partNumber": "3",
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
      "partNumber": "",
      "visaResourceName": "",
      "temperatureSensors": [],
      "supportsSelfCalibration": false,
      "supportsExternalCalibration": false,
      "isNIAsset": true,
      "id": "456e8812-1da4-4818-afab-f0cd34f74567",
      "location": {
        "minionId": "NI_sbRIO-9629--SN-01FE20D1--MAC-00-80-2F-33-30-18",
        "physicalLocation": "Cabinet 1",
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
      "supportsSelfTest": true,
      "supportsReset": true,
      "externalCalibration": {
        "temperatureSensors": [],
        "isLimited": false,
        "date": "2024-02-21T12:54:20.078Z",
        "recommendedInterval": 12,
        "nextRecommendedDate": "2025-02-21T12:54:20.078Z",
        "nextCustomDueDate": "2025-02-21T12:54:20.078Z",
        "resolvedDueDate": "2025-02-21T12:54:20.078Z",
        "entryType": "AUTOMATIC",
        "updatedBy": "user-id"
      }
    }
  ],
  "totalCount": 4
}

const assetsWithoutNameResponseMock: AssetsResponse =
{
  "assets": [
    {
      "modelName": "sbRIO-9629",
      "modelNumber": 0,
      "serialNumber": "01FE20D1",
      "vendorName": "National Instruments",
      "vendorNumber": 0,
      "busType": "BUILT_IN_SYSTEM",
      "name": "",
      "assetType": "SYSTEM",
      "discoveryType": "AUTOMATIC",
      "firmwareVersion": "8.8.0f0",
      "hardwareVersion": "",
      "partNumber": "4",
      "visaResourceName": "",
      "temperatureSensors": [],
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
      "modelName": "",
      "modelNumber": 1111,
      "serialNumber": "2222",
      "vendorName": "",
      "vendorNumber": 3333,
      "busType": "BUILT_IN_SYSTEM",
      "name": "",
      "assetType": "SYSTEM",
      "discoveryType": "AUTOMATIC",
      "firmwareVersion": "8.8.0f0",
      "hardwareVersion": "",
      "partNumber": "5",
      "visaResourceName": "",
      "temperatureSensors": [],
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
    }
  ],
  "totalCount": 2
}


const assetMetadataQueryMock: ListAssetsQuery = {
  type: AssetQueryType.ListAssets,
  filter: 'Location.MinionId == "123"',
  refId: ''
}

const buildMetadataQuery = getQueryBuilder<ListAssetsQuery>()({
  filter: ''
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

    await expect(ds.testDatasource()).rejects.toThrow('Request to url "/niapm/v1/assets?take=1" failed with status code: 400. Error message: "Error"');
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

  describe('metricFindQuery', () => {
    it('returns name/alias when asset name field is present', async () => {
      const query: AssetVariableQuery = {
        filter: '',
        type: AssetQueryType.None,
        refId: ""
      }

      backendSrv.fetch
        .calledWith(requestMatching({ url: '/niapm/v1/query-assets' }))
        .mockReturnValue(createFetchResponse(assetsResponseMock as AssetsResponse))

      const options = {
        scopedVars: {}
      }

      const result = await ds.metricFindQuery(query, options)

      expect(result).toMatchSnapshot();
    })

    it('returns default identifiers when asset name is not present', async () => {
      const query: AssetVariableQuery = {
        filter: '',
        type: AssetQueryType.None,
        refId: ""
      }

      backendSrv.fetch
        .calledWith(requestMatching({ url: '/niapm/v1/query-assets' }))
        .mockReturnValue(createFetchResponse(assetsWithoutNameResponseMock as AssetsResponse))

      const options = {
        scopedVars: {}
      }

      const result = await ds.metricFindQuery(query, options)

      expect(result).toMatchSnapshot();
    })
  })
})
