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
  AssetMetadataQuery,
  AssetPresenceWithSystemConnectionModel,
  AssetQueryType,
  AssetsResponse,
  AssetUtilizationQuery,
  AssetUtilizationTiming,
  EntityType,
} from "./types";
import { dateTime } from "@grafana/data";
import { assetUtilizationHistoryFactory } from "./utils";

let ds: AssetDataSource, backendSrv: MockProxy<BackendSrv>

beforeEach(() => {
  [ds, backendSrv] = setupDataSource(AssetDataSource);
});

const assetsResponseMock: AssetsResponse = {
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

const assetMetadataQueryMock: AssetMetadataQuery = {
  type: AssetQueryType.Metadata,
  workspace: '',
  refId: '',
  minionIds: ['123']
}

const buildMetadataQuery = getQueryBuilder<AssetMetadataQuery>()({
  type: AssetQueryType.Metadata,
  workspace: '',
  minionIds: [],
});

const utilizationHistoryMock: AssetUtilizationTiming[] = [
  {
    "startTimestamp": "2023-12-22T05:42:18.462Z",
    "endTimestamp": "2023-12-22T06:09:29.686Z",
    "heartbeatTimestamp": "2023-12-22T06:07:18.511Z"
  },
  {
    "startTimestamp": "2023-12-22T05:26:39.586Z",
    "endTimestamp": "2023-12-22T05:31:07.594Z"
  },
  {
    "startTimestamp": "2023-12-21T10:39:35.654Z",
    "endTimestamp": "2023-12-21T11:32:02.577Z",
    "heartbeatTimestamp": "2023-12-21T11:29:35.761Z"
  },
  {
    "startTimestamp": "2023-12-21T10:29:47.241Z",
    "endTimestamp": "2023-12-21T10:37:38.289Z",
    "heartbeatTimestamp": "2023-12-21T10:34:47.245Z"
  },
  {
    "startTimestamp": "2023-12-21T10:14:07.372Z",
    "endTimestamp": "2023-12-21T10:22:37.668Z",
    "heartbeatTimestamp": "2023-12-21T10:19:07.385Z"
  },
  {
    "startTimestamp": "2023-12-21T09:52:24.25Z",
    "endTimestamp": "2023-12-21T10:06:45.577Z",
    "heartbeatTimestamp": "2023-12-21T10:02:24.284Z"
  },
  {
    "startTimestamp": "2023-12-21T06:37:45.437Z",
    "endTimestamp": "2023-12-21T09:38:39.889Z",
    "heartbeatTimestamp": "2023-12-21T09:37:45.834Z"
  },
  {
    "startTimestamp": "2023-12-21T05:30:12.103Z",
    "endTimestamp": "2023-12-21T06:27:37.933Z",
    "heartbeatTimestamp": "2023-12-21T06:25:12.245Z"
  },
  {
    "startTimestamp": "2023-12-20T11:18:42.685Z",
    "endTimestamp": "2023-12-20T12:05:19.712Z",
    "heartbeatTimestamp": "2023-12-20T12:03:42.769Z"
  },
  {
    "startTimestamp": "2023-12-20T10:26:22.638Z",
    "endTimestamp": "2023-12-20T11:14:03.904Z",
    "heartbeatTimestamp": "2023-12-20T11:11:22.732Z"
  },
  {
    "startTimestamp": "2023-12-20T09:55:51.432Z",
    "endTimestamp": "2023-12-20T10:17:38.994Z",
    "heartbeatTimestamp": "2023-12-20T10:15:51.478Z"
  },
  {
    "startTimestamp": "2023-12-20T09:42:31.702Z",
    "endTimestamp": "2023-12-20T09:53:53.507Z",
    "heartbeatTimestamp": "2023-12-20T09:52:31.731Z"
  },
  {
    "startTimestamp": "2023-12-20T07:13:07.44Z",
    "endTimestamp": "2023-12-20T08:59:54.644Z",
    "heartbeatTimestamp": "2023-12-20T08:58:07.678Z"
  },
  {
    "startTimestamp": "2023-12-20T06:55:08.832Z",
    "endTimestamp": "2023-12-20T06:59:15.635Z"
  },
  {
    "startTimestamp": "2023-12-20T06:17:30.964Z",
    "endTimestamp": "2023-12-20T06:53:03.493Z",
    "heartbeatTimestamp": "2023-12-20T06:52:31.036Z"
  },
  {
    "startTimestamp": "2023-12-20T05:53:30.745Z",
    "endTimestamp": "2023-12-20T06:15:37.724Z",
    "heartbeatTimestamp": "2023-12-20T06:13:30.799Z"
  },
  {
    "startTimestamp": "2023-12-20T05:41:44.579Z",
    "endTimestamp": "2023-12-20T05:43:30.705Z"
  },
  {
    "startTimestamp": "2023-12-19T11:59:36.276Z",
    "endTimestamp": "2023-12-19T12:01:39.75Z"
  },
  {
    "startTimestamp": "2023-12-18T08:12:54.703Z",
    "endTimestamp": "2023-12-18T08:52:46.81Z",
    "heartbeatTimestamp": "2023-12-18T08:47:54.785Z"
  },
  {
    "startTimestamp": "2023-12-18T07:38:29.703Z",
    "endTimestamp": "2023-12-18T08:05:56.014Z",
    "heartbeatTimestamp": "2023-12-18T08:03:29.759Z"
  },
  {
    "startTimestamp": "2023-12-18T07:04:27.481Z",
    "endTimestamp": "2023-12-18T07:38:14.243Z",
    "heartbeatTimestamp": "2023-12-18T07:34:27.548Z"
  },
  {
    "startTimestamp": "2023-12-18T06:12:39.996Z",
    "endTimestamp": "2023-12-18T07:01:06.234Z",
    "heartbeatTimestamp": "2023-12-18T06:57:40.101Z"
  },
  {
    "startTimestamp": "2023-12-15T11:15:30.857Z",
    "endTimestamp": "2023-12-15T12:21:12.398Z",
    "heartbeatTimestamp": "2023-12-15T12:20:30.99Z"
  },
  {
    "startTimestamp": "2023-12-15T10:38:51.216Z",
    "endTimestamp": "2023-12-15T11:08:45.524Z",
    "heartbeatTimestamp": "2023-12-15T11:03:51.26Z"
  },
  {
    "startTimestamp": "2023-12-15T09:56:54.814Z",
    "endTimestamp": "2023-12-15T10:30:23.685Z",
    "heartbeatTimestamp": "2023-12-15T10:26:54.867Z"
  },
  {
    "startTimestamp": "2023-12-15T07:37:09.062Z",
    "endTimestamp": "2023-12-15T09:18:58.705Z",
    "heartbeatTimestamp": "2023-12-15T09:17:09.252Z"
  },
  {
    "startTimestamp": "2023-12-15T07:03:03.582Z",
    "endTimestamp": "2023-12-15T07:33:09.882Z",
    "heartbeatTimestamp": "2023-12-15T07:33:03.642Z"
  },
  {
    "startTimestamp": "2023-12-15T05:58:52.318Z",
    "endTimestamp": "2023-12-15T06:41:57.966Z",
    "heartbeatTimestamp": "2023-12-15T06:38:52.401Z"
  },
  {
    "startTimestamp": "2023-12-15T05:30:55.127Z",
    "endTimestamp": "2023-12-15T05:56:22.222Z",
    "heartbeatTimestamp": "2023-12-15T05:55:55.172Z"
  },
  {
    "startTimestamp": "2023-12-14T09:01:58.242Z",
    "endTimestamp": "2023-12-14T10:24:44.016Z",
    "heartbeatTimestamp": "2023-12-14T10:21:58.419Z"
  },
  {
    "startTimestamp": "2023-12-14T07:34:19.616Z",
    "endTimestamp": "2023-12-14T08:59:41.219Z",
    "heartbeatTimestamp": "2023-12-14T08:59:19.797Z"
  },
  {
    "startTimestamp": "2023-12-14T06:53:19.49Z",
    "endTimestamp": "2023-12-14T07:30:36.769Z",
    "heartbeatTimestamp": "2023-12-14T07:28:19.581Z"
  },
  {
    "startTimestamp": "2023-12-14T05:41:46.901Z",
    "endTimestamp": "2023-12-14T06:50:41.72Z",
    "heartbeatTimestamp": "2023-12-14T06:46:47.056Z"
  },
  {
    "startTimestamp": "2023-12-14T05:37:39.716Z",
    "endTimestamp": "2023-12-14T05:38:22.563Z"
  },
  {
    "startTimestamp": "2023-12-13T11:28:15.672Z",
    "endTimestamp": "2023-12-13T12:04:52.79Z",
    "heartbeatTimestamp": "2023-12-13T12:03:15.745Z"
  },
  {
    "startTimestamp": "2023-12-13T10:06:09.443Z",
    "endTimestamp": "2023-12-13T11:26:05.189Z",
    "heartbeatTimestamp": "2023-12-13T11:21:09.565Z"
  },
  {
    "startTimestamp": "2023-12-13T09:59:29.228Z",
    "endTimestamp": "2023-12-13T09:59:44.318Z"
  },
  {
    "startTimestamp": "2023-12-13T09:43:39.293Z",
    "endTimestamp": "2023-12-13T09:57:23.846Z",
    "heartbeatTimestamp": "2023-12-13T09:53:39.315Z"
  },
  {
    "startTimestamp": "2023-12-13T07:16:50.731Z",
    "endTimestamp": "2023-12-13T09:10:34.984Z",
    "heartbeatTimestamp": "2023-12-13T09:06:50.962Z"
  },
  {
    "startTimestamp": "2023-12-13T05:37:08.543Z",
    "endTimestamp": "2023-12-13T07:10:21.889Z",
    "heartbeatTimestamp": "2023-12-13T07:07:08.772Z"
  },
  {
    "startTimestamp": "2023-12-12T09:39:43.711Z",
    "endTimestamp": "2023-12-12T11:54:14.455Z",
    "heartbeatTimestamp": "2023-12-12T11:49:43.94Z"
  },
  {
    "startTimestamp": "2023-12-12T08:57:47.504Z",
    "endTimestamp": "2023-12-12T09:18:02.77Z",
    "heartbeatTimestamp": "2023-12-12T09:17:47.553Z"
  },
  {
    "startTimestamp": "2023-12-12T08:35:25.939Z",
    "endTimestamp": "2023-12-12T08:55:45.409Z",
    "heartbeatTimestamp": "2023-12-12T08:55:25.969Z"
  },
  {
    "startTimestamp": "2023-12-12T08:25:54.224Z",
    "endTimestamp": "2023-12-12T08:33:14.776Z",
    "heartbeatTimestamp": "2023-12-12T08:30:54.245Z"
  },
  {
    "startTimestamp": "2023-12-12T07:29:56.697Z",
    "endTimestamp": "2023-12-12T08:14:34.255Z",
    "heartbeatTimestamp": "2023-12-12T08:09:56.788Z"
  },
  {
    "startTimestamp": "2023-12-12T07:03:05.901Z",
    "endTimestamp": "2023-12-12T07:28:00.898Z",
    "heartbeatTimestamp": "2023-12-12T07:23:05.966Z"
  },
  {
    "startTimestamp": "2023-12-12T05:40:20.766Z",
    "endTimestamp": "2023-12-12T06:59:47.132Z",
    "heartbeatTimestamp": "2023-12-12T06:55:20.919Z"
  },
  {
    "startTimestamp": "2023-12-12T05:36:18.888Z",
    "endTimestamp": "2023-12-12T05:36:20.58Z"
  },
  {
    "startTimestamp": "2023-12-11T11:13:57.166Z",
    "endTimestamp": "2023-12-11T12:12:52.557Z",
    "heartbeatTimestamp": "2023-12-11T12:08:57.28Z"
  }
]

const policyQueryMockGTM4 = {
  "calibrationPolicy": {
    "daysForApproachingCalibrationDueDate": 30
  },
  "workingHoursPolicy": {
    "startTime": "05:00:00",
    "endTime": "13:00:00"
  }
}

const queryAssetsResponseMock = {
  "assets": [
    {
      "modelName": "NI 9236",
      "modelNumber": 29483,
      "serialNumber": "01860492",
      "vendorName": "National Instruments",
      "vendorNumber": 4243,
      "busType": "CDAQ",
      "name": "cDAQ1Mod1",
      "assetType": "GENERIC",
      "discoveryType": "AUTOMATIC",
      "firmwareVersion": "",
      "hardwareVersion": "",
      "visaResourceName": "",
      "temperatureSensors": [],
      "supportsSelfCalibration": false,
      "supportsExternalCalibration": true,
      "isNIAsset": true,
      "id": "cc87e897-79e2-4cbf-9655-1b145d78a306",
      "location": {
        "minionId": "System_Product_Name--SN-System_Serial_Number--MAC-40-B0-76-44-7F-26",
        "parent": "cDAQ1",
        "resourceUri": "9/4243/29570/01860492/1",
        "slotNumber": 1,
        "systemName": "System_Product_Name--SN-System_Serial_Number--MAC-40-B0-76-44-7F-26",
        "state": {
          "assetPresence": "NOT_PRESENT",
          "systemConnection": "DISCONNECTED"
        }
      },
      "calibrationStatus": "OK",
      "isSystemController": false,
      "workspace": "eb9a089b-053d-4a8c-9596-70093a42df9b",
      "properties": {},
      "keywords": [],
      "lastUpdatedTimestamp": "2023-12-28T15:25:39.77Z",
      "fileIds": [],
      "supportsSelfTest": true,
      "supportsReset": true
    }
  ],
  "totalCount": 1
}

const buildUtilizationQuery = getQueryBuilder<AssetUtilizationQuery>()({
  type: AssetQueryType.Utilization,
  workspace: '',
  assetIdentifiers: [],
  minionIds: [],
}, {
  range: {
    from: dateTime(new Date('2023-12-10T00:00:00.000Z')),
    to: dateTime(new Date('2023-12-24T00:00:00.000Z')),
    raw: {
      from: dateTime(new Date('2023-12-10T00:00:00.000Z')),
      to: dateTime(new Date('2023-12-24T00:00:00.000Z'))
    }
  },
  timezone: 'Asia/Yerevan'
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

describe('query', () => {
  describe('metadata', () => {
    test('run', async () => {
      backendSrv.fetch
        .calledWith(requestMatching({ url: '/niapm/v1/query-assets' }))
        .mockReturnValue(createFetchResponse(assetsResponseMock as AssetsResponse))
      const result = await ds.query(buildMetadataQuery(assetMetadataQueryMock))

      expect(result.data).toMatchSnapshot()
    })

    test('handle errors', async () => {
      backendSrv.fetch
        .calledWith(requestMatching({ url: '/niapm/v1/query-assets' }))
        .mockReturnValue(createFetchError(418))

      await expect(ds.query(buildMetadataQuery(assetMetadataQueryMock))).rejects.toThrow()
    })

  })
  describe('utilization GMT+4', () => {
    test('from 9 to 17 and weekday are peak', async () => {
      const queryRequest = buildUtilizationQuery({
        type: AssetQueryType.Utilization,
        entityType: EntityType.Asset,
        workspace: '',
        minionIds: ["System_Product_Name--SN-System_Serial_Number--MAC-40-B0-76-44-7F-26"],
        assetIdentifiers: ['cc87e897-79e2-4cbf-9655-1b145d78a306'],
      })
      backendSrv.fetch
        .calledWith(requestMatching({
          url: '/niapm/v1/policy',
        }))
        .mockReturnValue(createFetchResponse(policyQueryMockGTM4))
      backendSrv.fetch
        .calledWith(requestMatching({
          url: '/niapm/v1/query-asset-utilization-history',
          data: {
            utilizationFilter: '',
            continuationToken: '',
            orderBy: 'START_TIMESTAMP',
            orderByDescending: true,
            assetFilter: 'AssetIdentifier = "cc87e897-79e2-4cbf-9655-1b145d78a306"'
          }
        }))
        .mockReturnValue(createFetchResponse(assetUtilizationHistoryFactory(utilizationHistoryMock)))
      backendSrv.fetch
        .calledWith(requestMatching({
          url: '/niapm/v1/query-assets',
          data: {
            filter: 'AssetIdentifier == "cc87e897-79e2-4cbf-9655-1b145d78a306"',
            take: -1
          }
        }))
        .mockReturnValue(createFetchResponse(queryAssetsResponseMock))
      const result = await ds.query(queryRequest)

      expect(result.data).toMatchSnapshot();
    })
  })
})
