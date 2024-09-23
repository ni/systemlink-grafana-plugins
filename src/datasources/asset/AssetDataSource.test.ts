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
  AssetMetadataQuery, AssetModel,
  AssetQueryType,
  AssetsResponse,
  AssetUtilizationQuery,
  AssetUtilizationTiming,
  EntityType,
} from "./types";
import { dateTime } from "@grafana/data";
import { assetUtilizationHistoryFactory } from "./utils";
import { defaultProjection } from "../system/constants";

let ds: AssetDataSource, backendSrv: MockProxy<BackendSrv>

beforeEach(() => {
  [ds, backendSrv] = setupDataSource(AssetDataSource);
});

const assetResponseMock1: AssetModel = {
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
const assetResponseMock2: AssetModel = {
  "modelName": "NI 9234",
  "modelNumber": 29365,
  "serialNumber": "01851A95",
  "vendorName": "National Instruments",
  "vendorNumber": 4243,
  "busType": "CDAQ",
  "name": "cDAQ9189-1DCDB90_FHMMod4",
  "assetType": "GENERIC",
  "discoveryType": "AUTOMATIC",
  "firmwareVersion": "",
  "hardwareVersion": "",
  "visaResourceName": "",
  "temperatureSensors": [],
  "supportsSelfCalibration": false,
  "supportsExternalCalibration": true,
  "isNIAsset": true,
  "id": "a4fac9f7-2637-4014-b727-cc50dd30113e",
  "location": {
    "minionId": "System_Product_Name--SN-System_Serial_Number--MAC-50-EB-F6-B5-9D-5A",
    "parent": "cDAQ9189-1DCDB90_FHM",
    "resourceUri": "9/4243/29283/01851A95/4",
    "slotNumber": 4,
    "state": {
      "assetPresence": "PRESENT",
      "systemConnection": "DISCONNECTED"
    }
  },
  "calibrationStatus": "PAST_RECOMMENDED_DUE_DATE",
  "isSystemController": false,
  "workspace": "e73fcd94-649b-4d0a-b164-bf647a5d0946",
  "properties": {},
  "keywords": [],
  "lastUpdatedTimestamp": "2024-05-07T11:52:47.71Z",
  "fileIds": [],
  "supportsSelfTest": true,
  "supportsReset": true
}


const assetsResponseMock: AssetsResponse = {
  "assets": [
    assetResponseMock1,
    assetResponseMock2
  ],
  "totalCount": 4
}

const queryAssetsResponseMock1 = {
  "assets": [
    assetResponseMock1
  ],
  "totalCount": 1
}
const queryAssetsResponseMock2 = {
  "assets": [
    assetResponseMock2
  ],
  "totalCount": 1
}

const querySystemsResponseMock = {
  "count": 1,
  "data": [
    {
      "id": "System_Product_Name--SN-System_Serial_Number--MAC-50-EB-F6-B5-9D-5A",
      "alias": "DESKTOP-NS7K9UR",
      "state": "DISCONNECTED",
      "locked": false,
      "systemStartTime": "2024-05-07T09:13:42.114Z",
      "model": "System Product Name",
      "vendor": "ASUS",
      "osFullName": "Microsoft Windows 11 Enterprise",
      "ip4Interfaces": {
        "Realtek Gaming 2.5GbE Family Controller": [
          "169.254.212.68"
        ],
        "Lenovo USB Ethernet": [
          "10.94.9.116"
        ],
        "Software Loopback Interface 1": [
          "127.0.0.1"
        ]
      },
      "ip6Interfaces": {
        "Realtek Gaming 2.5GbE Family Controller": [
          "fe80::5173:d9c1:1b37:267"
        ],
        "Lenovo USB Ethernet": [
          "fe80::3ff9:5236:bf25:4140"
        ],
        "Software Loopback Interface 1": [
          "::1"
        ]
      },
      "workspace": "e73fcd94-649b-4d0a-b164-bf647a5d0946"
    }
  ]
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
const utilizationHistoryMock2: AssetUtilizationTiming[] = [
  {
    "startTimestamp": "2024-01-10T08:38:57.27Z",
    "endTimestamp": "2024-01-10T08:39:10.209Z"
  },
  {
    "startTimestamp": "2024-01-09T09:22:52.47Z",
    "endTimestamp": "2024-01-09T10:03:17.986Z",
    "heartbeatTimestamp": "2024-01-09T09:58:38.999Z"
  },
  {
    "startTimestamp": "2024-01-09T09:15:11.17Z",
    "endTimestamp": "2024-01-09T09:22:51.459Z",
    "heartbeatTimestamp": "2024-01-09T09:20:11.183Z"
  },
  {
    "startTimestamp": "2024-01-09T09:09:01.957Z",
    "endTimestamp": "2024-01-09T09:15:09.856Z",
    "heartbeatTimestamp": "2024-01-09T09:14:01.971Z"
  },
  {
    "startTimestamp": "2024-01-09T09:00:02.417Z",
    "endTimestamp": "2024-01-09T09:08:59.609Z",
    "heartbeatTimestamp": "2024-01-09T09:05:02.419Z"
  },
  {
    "startTimestamp": "2024-01-09T06:56:48.426Z",
    "endTimestamp": "2024-01-09T08:59:59.052Z",
    "heartbeatTimestamp": "2024-01-09T08:56:48.734Z"
  },
  {
    "startTimestamp": "2024-01-08T16:19:10.994Z",
    "endTimestamp": "2024-01-08T16:30:48.799Z",
    "heartbeatTimestamp": "2024-01-08T16:29:11.018Z"
  },
  {
    "startTimestamp": "2024-01-08T15:17:32.951Z",
    "endTimestamp": "2024-01-08T16:19:09.171Z",
    "heartbeatTimestamp": "2024-01-08T16:17:33.112Z"
  },
  {
    "startTimestamp": "2024-01-08T08:58:04.307Z",
    "endTimestamp": "2024-01-08T08:58:12.52Z"
  },
  {
    "startTimestamp": "2024-01-08T08:54:44.843Z",
    "endTimestamp": "2024-01-08T08:57:51.68Z"
  },
  {
    "startTimestamp": "2024-01-03T09:45:22.435Z",
    "endTimestamp": "2024-01-03T09:46:10.85Z"
  },
  {
    "startTimestamp": "2023-12-27T14:02:16.267Z",
    "endTimestamp": "2023-12-27T14:04:32.116Z"
  },
  {
    "startTimestamp": "2023-12-27T13:49:40.641Z",
    "endTimestamp": "2023-12-27T13:57:07.249Z",
    "heartbeatTimestamp": "2023-12-27T13:54:40.694Z"
  },
  {
    "startTimestamp": "2023-12-27T13:43:45.033Z",
    "endTimestamp": "2023-12-27T13:44:39.391Z"
  },
  {
    "startTimestamp": "2023-12-27T13:40:13.395Z",
    "endTimestamp": "2023-12-27T13:42:34.136Z"
  },
  {
    "startTimestamp": "2023-12-27T13:39:00.42Z",
    "endTimestamp": "2023-12-27T13:39:41.238Z"
  },
  {
    "startTimestamp": "2023-12-27T13:36:02.194Z",
    "endTimestamp": "2023-12-27T13:38:48.25Z"
  },
  {
    "startTimestamp": "2023-12-27T13:23:20.904Z",
    "endTimestamp": "2023-12-27T13:27:10.809Z"
  },
  {
    "startTimestamp": "2023-12-26T12:39:47.539Z",
    "endTimestamp": "2023-12-26T12:40:10.212Z"
  },
  {
    "startTimestamp": "2023-12-26T08:15:59.065Z",
    "endTimestamp": "2023-12-26T08:17:34.766Z"
  },
  {
    "startTimestamp": "2023-12-26T08:14:50.318Z",
    "endTimestamp": "2023-12-26T08:15:29.481Z"
  },
  {
    "startTimestamp": "2023-12-25T15:01:34.975Z",
    "endTimestamp": "2023-12-25T15:02:03.763Z"
  },
  {
    "startTimestamp": "2023-12-25T11:54:24.042Z",
    "endTimestamp": "2023-12-25T11:55:59.196Z"
  },
  {
    "startTimestamp": "2023-12-25T10:42:38.932Z",
    "endTimestamp": "2023-12-25T11:53:01.706Z",
    "heartbeatTimestamp": "2023-12-25T11:52:39.087Z"
  },
  {
    "startTimestamp": "2023-12-19T14:21:39.488Z",
    "endTimestamp": "2023-12-25T10:42:37.066Z",
    "heartbeatTimestamp": "2023-12-25T10:41:58.694Z"
  },
  {
    "startTimestamp": "2023-12-19T14:20:51.721Z",
    "endTimestamp": "2023-12-19T14:21:37.628Z"
  },
  {
    "startTimestamp": "2023-12-19T14:20:21.369Z",
    "endTimestamp": "2023-12-19T14:20:42.834Z"
  },
  {
    "startTimestamp": "2023-12-19T14:19:13.349Z",
    "endTimestamp": "2023-12-19T14:19:21.381Z"
  },
  {
    "startTimestamp": "2023-12-19T07:12:19.993Z",
    "endTimestamp": "2023-12-19T07:13:03.525Z"
  },
  {
    "startTimestamp": "2023-12-18T13:10:17.365Z",
    "endTimestamp": "2023-12-18T13:59:23.934Z",
    "heartbeatTimestamp": "2023-12-18T13:55:17.479Z"
  },
  {
    "startTimestamp": "2023-12-18T10:47:21.713Z",
    "endTimestamp": "2023-12-18T11:31:33.248Z",
    "heartbeatTimestamp": "2023-12-18T11:27:21.786Z"
  },
  {
    "startTimestamp": "2023-12-15T11:53:56.273Z",
    "endTimestamp": "2023-12-15T13:08:56.044Z",
    "heartbeatTimestamp": "2023-12-15T13:03:56.556Z"
  },
  {
    "startTimestamp": "2023-12-15T08:25:58.593Z",
    "endTimestamp": "2023-12-15T08:33:52.344Z",
    "heartbeatTimestamp": "2023-12-15T08:30:58.599Z"
  },
  {
    "startTimestamp": "2023-12-14T14:27:55.887Z",
    "endTimestamp": "2023-12-14T16:05:43.801Z",
    "heartbeatTimestamp": "2023-12-14T16:02:56.172Z"
  },
  {
    "startTimestamp": "2023-12-14T13:50:49.002Z",
    "endTimestamp": "2023-12-14T14:18:15.625Z",
    "heartbeatTimestamp": "2023-12-14T14:15:49.054Z"
  },
  {
    "startTimestamp": "2023-12-14T09:42:43.561Z",
    "endTimestamp": "2023-12-14T13:26:57.114Z",
    "heartbeatTimestamp": "2023-12-14T13:22:44.027Z"
  },
  {
    "startTimestamp": "2023-12-14T08:02:32.058Z",
    "endTimestamp": "2023-12-14T08:19:46.037Z",
    "heartbeatTimestamp": "2023-12-14T08:17:32.092Z"
  },
  {
    "startTimestamp": "2023-12-14T08:01:16.482Z",
    "endTimestamp": "2023-12-14T08:02:26.498Z"
  },
  {
    "startTimestamp": "2023-12-14T07:44:01.06Z",
    "endTimestamp": "2023-12-14T07:55:32.821Z",
    "heartbeatTimestamp": "2023-12-14T07:54:01.085Z"
  },
  {
    "startTimestamp": "2023-12-13T15:28:14.687Z",
    "endTimestamp": "2023-12-13T15:28:41.322Z"
  },
  {
    "startTimestamp": "2023-12-13T11:39:36.672Z",
    "endTimestamp": "2023-12-13T14:25:04.846Z",
    "heartbeatTimestamp": "2023-12-13T14:24:37.088Z"
  },
  {
    "startTimestamp": "2023-12-12T15:37:01.772Z",
    "endTimestamp": "2023-12-12T15:44:58.986Z",
    "heartbeatTimestamp": "2023-12-12T15:42:01.801Z"
  },
  {
    "startTimestamp": "2023-12-12T15:29:50.694Z",
    "endTimestamp": "2023-12-12T15:35:21.553Z",
    "heartbeatTimestamp": "2023-12-12T15:34:50.734Z"
  },
  {
    "startTimestamp": "2023-12-12T15:12:11.396Z",
    "endTimestamp": "2023-12-12T15:29:09.944Z",
    "heartbeatTimestamp": "2023-12-12T15:27:11.436Z"
  },
  {
    "startTimestamp": "2023-12-12T15:11:13.113Z",
    "endTimestamp": "2023-12-12T15:11:40.33Z"
  },
  {
    "startTimestamp": "2023-12-12T15:06:16.22Z",
    "endTimestamp": "2023-12-12T15:11:11.873Z"
  },
  {
    "startTimestamp": "2023-12-12T14:49:44.737Z",
    "endTimestamp": "2023-12-12T14:50:48.239Z"
  },
  {
    "startTimestamp": "2023-12-12T14:31:04.59Z",
    "endTimestamp": "2023-12-12T14:37:14.152Z",
    "heartbeatTimestamp": "2023-12-12T14:36:04.6Z"
  },
  {
    "startTimestamp": "2023-12-12T13:29:17.747Z",
    "endTimestamp": "2023-12-12T13:30:27.996Z"
  },
  {
    "startTimestamp": "2023-12-12T08:34:38.756Z",
    "endTimestamp": "2023-12-12T08:35:56.329Z"
  },
  {
    "startTimestamp": "2023-12-11T14:14:50.853Z",
    "endTimestamp": "2023-12-11T14:16:18.109Z"
  },
  {
    "startTimestamp": "2023-12-11T12:36:09.147Z",
    "endTimestamp": "2023-12-11T13:44:03.593Z",
    "heartbeatTimestamp": "2023-12-11T13:41:09.348Z"
  },
  {
    "startTimestamp": "2023-12-11T12:26:10.501Z",
    "endTimestamp": "2023-12-11T12:36:05.342Z",
    "heartbeatTimestamp": "2023-12-11T12:31:10.515Z"
  },
  {
    "startTimestamp": "2023-12-11T10:44:01.089Z",
    "endTimestamp": "2023-12-11T10:53:29.371Z",
    "heartbeatTimestamp": "2023-12-11T10:49:01.104Z"
  },
  {
    "startTimestamp": "2023-12-11T10:03:07.548Z",
    "endTimestamp": "2023-12-11T10:18:40.206Z",
    "heartbeatTimestamp": "2023-12-11T10:18:07.582Z"
  },
  {
    "startTimestamp": "2023-12-11T09:56:37.836Z",
    "endTimestamp": "2023-12-11T09:57:03.981Z"
  },
  {
    "startTimestamp": "2023-12-11T08:28:37.686Z",
    "endTimestamp": "2023-12-11T09:02:17.106Z",
    "heartbeatTimestamp": "2023-12-11T08:58:37.768Z"
  },
  {
    "startTimestamp": "2023-12-11T07:41:54.708Z",
    "endTimestamp": "2023-12-11T08:28:11.698Z",
    "heartbeatTimestamp": "2023-12-11T08:26:54.851Z"
  },
  {
    "startTimestamp": "2023-12-11T07:41:53.027Z",
    "endTimestamp": "2023-12-11T07:41:53.182Z"
  },
  {
    "startTimestamp": "2023-12-11T07:32:10.654Z",
    "endTimestamp": "2023-12-11T07:41:51.179Z",
    "heartbeatTimestamp": "2023-12-11T07:37:10.675Z"
  },
  {
    "startTimestamp": "2023-12-11T07:24:02.621Z",
    "endTimestamp": "2023-12-11T07:28:32.327Z"
  }
]
const sysControllerUtilizationHistoryMock: AssetUtilizationTiming[] = [
    {
      "startTimestamp": "2023-12-18T10:59:39.639Z",
      "endTimestamp": "2023-12-18T12:27:53.094Z",
      "heartbeatTimestamp": "2023-12-18T12:24:39.863Z"
    },
    {
      "startTimestamp": "2023-12-18T10:28:43.813Z",
      "endTimestamp": "2023-12-18T10:52:37.715Z",
      "heartbeatTimestamp": "2023-12-18T10:48:43.86Z"
    },
    {
      "startTimestamp": "2023-12-18T10:21:30.802Z",
      "endTimestamp": "2023-12-18T10:26:16.124Z"
    },
    {
      "startTimestamp": "2023-12-18T09:59:54.992Z",
      "endTimestamp": "2023-12-18T10:20:06.619Z",
      "heartbeatTimestamp": "2023-12-18T10:19:55.048Z"
    },
    {
      "startTimestamp": "2023-12-18T09:32:18.409Z",
      "endTimestamp": "2023-12-18T09:57:55.081Z",
      "heartbeatTimestamp": "2023-12-18T09:57:18.47Z"
    },
    {
      "startTimestamp": "2023-12-18T09:27:15.849Z",
      "endTimestamp": "2023-12-18T09:28:43.812Z"
    },
    {
      "startTimestamp": "2023-12-18T09:24:40.683Z",
      "endTimestamp": "2023-12-18T09:24:42.961Z"
    },
    {
      "startTimestamp": "2023-12-18T08:54:39.177Z",
      "endTimestamp": "2023-12-18T08:57:55.568Z"
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
    },
    {
      "startTimestamp": "2023-12-11T11:08:05.901Z",
      "endTimestamp": "2023-12-11T11:11:31.698Z"
    },
    {
      "startTimestamp": "2023-12-11T10:16:18.093Z",
      "endTimestamp": "2023-12-11T11:01:14.254Z",
      "heartbeatTimestamp": "2023-12-11T10:56:18.148Z"
    },
    {
      "startTimestamp": "2023-12-11T10:00:06.819Z",
      "endTimestamp": "2023-12-11T10:05:25Z",
      "heartbeatTimestamp": "2023-12-11T10:05:06.824Z"
    },
    {
      "startTimestamp": "2023-12-11T08:58:12.539Z",
      "endTimestamp": "2023-12-11T09:14:04.654Z",
      "heartbeatTimestamp": "2023-12-11T09:13:12.581Z"
    },
    {
      "startTimestamp": "2023-12-11T08:26:17.214Z",
      "endTimestamp": "2023-12-11T08:57:51.889Z",
      "heartbeatTimestamp": "2023-12-11T08:56:17.27Z"
    },
    {
      "startTimestamp": "2023-12-11T08:02:05.755Z",
      "endTimestamp": "2023-12-11T08:24:12.315Z",
      "heartbeatTimestamp": "2023-12-11T08:22:05.787Z"
    },
    {
      "startTimestamp": "2023-12-11T07:07:54.529Z",
      "endTimestamp": "2023-12-11T07:51:17.842Z",
      "heartbeatTimestamp": "2023-12-11T07:47:54.61Z"
    },
    {
      "startTimestamp": "2023-12-11T06:38:24.798Z",
      "endTimestamp": "2023-12-11T07:06:32.861Z",
      "heartbeatTimestamp": "2023-12-11T07:03:24.853Z"
    },
    {
      "startTimestamp": "2023-12-11T05:36:11.52Z",
      "endTimestamp": "2023-12-11T06:38:21.661Z",
      "heartbeatTimestamp": "2023-12-11T06:36:11.658Z"
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
const policyQueryMockGTM4WholeDay = {
  "calibrationPolicy": {
    "daysForApproachingCalibrationDueDate": 30
  },
  "workingHoursPolicy": {
    "startTime": "20:00:00",
    "endTime": "20:00:00"
  }
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
    test('asset from 9 to 17 and weekday are peak', async () => {
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
        .mockReturnValue(createFetchResponse(queryAssetsResponseMock1))
      const result = await ds.query(queryRequest)

      expect(result.data).toMatchSnapshot();
    })
    test('asset whole day and weekday are peak', async () => {
      const queryRequest = buildUtilizationQuery({
        type: AssetQueryType.Utilization,
        entityType: EntityType.Asset,
        workspace: '',
        minionIds: ["System_Product_Name--SN-System_Serial_Number--MAC-50-EB-F6-B5-9D-5A"],
        assetIdentifiers: ['a4fac9f7-2637-4014-b727-cc50dd30113e'],
      })
      backendSrv.fetch
        .calledWith(requestMatching({
          url: '/niapm/v1/policy',
        }))
        .mockReturnValue(createFetchResponse(policyQueryMockGTM4WholeDay))
      backendSrv.fetch
        .calledWith(requestMatching({
          url: '/niapm/v1/query-asset-utilization-history',
          data: {
            utilizationFilter: '',
            continuationToken: '',
            orderBy: 'START_TIMESTAMP',
            orderByDescending: true,
            assetFilter: 'AssetIdentifier = "a4fac9f7-2637-4014-b727-cc50dd30113e"'
          }
        }))
        .mockReturnValue(createFetchResponse(assetUtilizationHistoryFactory(utilizationHistoryMock2)))
      backendSrv.fetch
        .calledWith(requestMatching({
          url: '/niapm/v1/query-assets',
          data: {
            filter: 'AssetIdentifier == "a4fac9f7-2637-4014-b727-cc50dd30113e"',
            take: -1
          }
        }))
        .mockReturnValue(createFetchResponse(queryAssetsResponseMock2))
      const result = await ds.query(queryRequest)

      expect(result.data).toMatchSnapshot();
    })
    test('asset not utilized', async () => {
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
        .mockReturnValue(createFetchResponse(assetUtilizationHistoryFactory([])))
      backendSrv.fetch
        .calledWith(requestMatching({
          url: '/niapm/v1/query-assets',
          data: {
            filter: 'AssetIdentifier == "cc87e897-79e2-4cbf-9655-1b145d78a306"',
            take: -1
          }
        }))
        .mockReturnValue(createFetchResponse(queryAssetsResponseMock1))
      const result = await ds.query(queryRequest)

      expect(result.data).toMatchSnapshot();
    })
    test('sys controller whole day and weekday are peak', async () => {
      const queryRequest = buildUtilizationQuery({
        type: AssetQueryType.Utilization,
        entityType: EntityType.System,
        workspace: '',
        minionIds: ['System_Product_Name--SN-System_Serial_Number--MAC-50-EB-F6-B5-9D-5A'],
        assetIdentifiers: [],
      })
      backendSrv.fetch
        .calledWith(requestMatching({
          url: '/niapm/v1/policy',
        }))
        .mockReturnValue(createFetchResponse(policyQueryMockGTM4WholeDay))
      backendSrv.fetch
        .calledWith(requestMatching({
          url: '/niapm/v1/query-asset-utilization-history',
          data: {
            utilizationFilter: '',
            continuationToken: '',
            orderBy: 'START_TIMESTAMP',
            orderByDescending: true,
            assetFilter: 'Location.MinionId = "System_Product_Name--SN-System_Serial_Number--MAC-50-EB-F6-B5-9D-5A" and IsSystemController = true'
          }
        }))
        .mockReturnValue(createFetchResponse(assetUtilizationHistoryFactory(sysControllerUtilizationHistoryMock)))
      backendSrv.fetch
        .calledWith(requestMatching({
          url: '/nisysmgmt/v1/query-systems',
          data: {
            filter: 'id == "System_Product_Name--SN-System_Serial_Number--MAC-50-EB-F6-B5-9D-5A"',
            orderBy:"createdTimeStamp DESC",
            projection: `new(${defaultProjection.join()})`
          }
        }))
        .mockReturnValue(createFetchResponse(querySystemsResponseMock))
      const result = await ds.query(queryRequest)

      expect(result.data).toMatchSnapshot();
    })
  })

})
