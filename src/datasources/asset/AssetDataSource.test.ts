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
  EntityType,
} from "./types";
import { dateTime } from "@grafana/data";

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

const assetUtilizationHistoryQueryMock = {
  "assetUtilizations": [
    {
      "utilizationIdentifier": "cf459917-2873-4702-9636-42e4ed1a22f2",
      "assetIdentifier": "cc87e897-79e2-4cbf-9655-1b145d78a306",
      "minionId": "System_Product_Name--SN-System_Serial_Number--MAC-40-B0-76-44-7F-26",
      "category": "Configuration",
      "taskName": "NI SystemLink Notifications",
      "userName": "ServEng",
      "startTimestamp": "2023-12-22T05:42:18.462Z",
      "endTimestamp": "2023-12-22T06:09:29.686Z",
      "heartbeatTimestamp": "2023-12-22T06:07:18.511Z"
    },
    {
      "utilizationIdentifier": "1de94e14-c8fa-4ef6-8278-fdb8f0798076",
      "assetIdentifier": "cc87e897-79e2-4cbf-9655-1b145d78a306",
      "minionId": "System_Product_Name--SN-System_Serial_Number--MAC-40-B0-76-44-7F-26",
      "category": "Configuration",
      "taskName": "NI SystemLink Notifications",
      "userName": "ServEng",
      "startTimestamp": "2023-12-22T05:26:39.586Z",
      "endTimestamp": "2023-12-22T05:31:07.594Z"
    },
    {
      "utilizationIdentifier": "71e0838a-0dda-4df7-9c6d-6e6c77320f22",
      "assetIdentifier": "cc87e897-79e2-4cbf-9655-1b145d78a306",
      "minionId": "System_Product_Name--SN-System_Serial_Number--MAC-40-B0-76-44-7F-26",
      "category": "Configuration",
      "taskName": "NI SystemLink Notifications",
      "userName": "ServEng",
      "startTimestamp": "2023-12-21T10:39:35.654Z",
      "endTimestamp": "2023-12-21T11:32:02.577Z",
      "heartbeatTimestamp": "2023-12-21T11:29:35.761Z"
    },
    {
      "utilizationIdentifier": "48ca7230-a883-49b9-9ac1-aafdc597536d",
      "assetIdentifier": "cc87e897-79e2-4cbf-9655-1b145d78a306",
      "minionId": "System_Product_Name--SN-System_Serial_Number--MAC-40-B0-76-44-7F-26",
      "category": "Configuration",
      "taskName": "NI SystemLink Notifications",
      "userName": "ServEng",
      "startTimestamp": "2023-12-21T10:29:47.241Z",
      "endTimestamp": "2023-12-21T10:37:38.289Z",
      "heartbeatTimestamp": "2023-12-21T10:34:47.245Z"
    },
    {
      "utilizationIdentifier": "1d055adb-b54f-440a-b32c-71029cd45797",
      "assetIdentifier": "cc87e897-79e2-4cbf-9655-1b145d78a306",
      "minionId": "System_Product_Name--SN-System_Serial_Number--MAC-40-B0-76-44-7F-26",
      "category": "Configuration",
      "taskName": "NI SystemLink Notifications",
      "userName": "ServEng",
      "startTimestamp": "2023-12-21T10:14:07.372Z",
      "endTimestamp": "2023-12-21T10:22:37.668Z",
      "heartbeatTimestamp": "2023-12-21T10:19:07.385Z"
    },
    {
      "utilizationIdentifier": "71f76678-aa36-4b1c-a968-f3ed27210b3d",
      "assetIdentifier": "cc87e897-79e2-4cbf-9655-1b145d78a306",
      "minionId": "System_Product_Name--SN-System_Serial_Number--MAC-40-B0-76-44-7F-26",
      "category": "Configuration",
      "taskName": "NI SystemLink Notifications",
      "userName": "ServEng",
      "startTimestamp": "2023-12-21T09:52:24.25Z",
      "endTimestamp": "2023-12-21T10:06:45.577Z",
      "heartbeatTimestamp": "2023-12-21T10:02:24.284Z"
    },
    {
      "utilizationIdentifier": "0ec4a7d0-56fa-4535-861d-2dd2ab850ec9",
      "assetIdentifier": "cc87e897-79e2-4cbf-9655-1b145d78a306",
      "minionId": "System_Product_Name--SN-System_Serial_Number--MAC-40-B0-76-44-7F-26",
      "category": "Configuration",
      "taskName": "NI SystemLink Notifications",
      "userName": "ServEng",
      "startTimestamp": "2023-12-21T06:37:45.437Z",
      "endTimestamp": "2023-12-21T09:38:39.889Z",
      "heartbeatTimestamp": "2023-12-21T09:37:45.834Z"
    },
    {
      "utilizationIdentifier": "a8909a22-25c1-4db7-a47d-37476b15f2cb",
      "assetIdentifier": "cc87e897-79e2-4cbf-9655-1b145d78a306",
      "minionId": "System_Product_Name--SN-System_Serial_Number--MAC-40-B0-76-44-7F-26",
      "category": "Configuration",
      "taskName": "NI SystemLink Notifications",
      "userName": "ServEng",
      "startTimestamp": "2023-12-21T05:30:12.103Z",
      "endTimestamp": "2023-12-21T06:27:37.933Z",
      "heartbeatTimestamp": "2023-12-21T06:25:12.245Z"
    },
    {
      "utilizationIdentifier": "1b90f350-b07d-44fb-8eaf-c80946e6b544",
      "assetIdentifier": "cc87e897-79e2-4cbf-9655-1b145d78a306",
      "minionId": "System_Product_Name--SN-System_Serial_Number--MAC-40-B0-76-44-7F-26",
      "category": "Configuration",
      "taskName": "NI SystemLink Notifications",
      "userName": "ServEng",
      "startTimestamp": "2023-12-20T11:18:42.685Z",
      "endTimestamp": "2023-12-20T12:05:19.712Z",
      "heartbeatTimestamp": "2023-12-20T12:03:42.769Z"
    },
    {
      "utilizationIdentifier": "c542f077-7175-4f3f-b3fe-a8a6c7cc12bf",
      "assetIdentifier": "cc87e897-79e2-4cbf-9655-1b145d78a306",
      "minionId": "System_Product_Name--SN-System_Serial_Number--MAC-40-B0-76-44-7F-26",
      "category": "Configuration",
      "taskName": "NI SystemLink Notifications",
      "userName": "ServEng",
      "startTimestamp": "2023-12-20T10:26:22.638Z",
      "endTimestamp": "2023-12-20T11:14:03.904Z",
      "heartbeatTimestamp": "2023-12-20T11:11:22.732Z"
    },
    {
      "utilizationIdentifier": "2205d84f-5537-40df-bf1c-16cb397470ad",
      "assetIdentifier": "cc87e897-79e2-4cbf-9655-1b145d78a306",
      "minionId": "System_Product_Name--SN-System_Serial_Number--MAC-40-B0-76-44-7F-26",
      "category": "Configuration",
      "taskName": "NI SystemLink Notifications",
      "userName": "ServEng",
      "startTimestamp": "2023-12-20T09:55:51.432Z",
      "endTimestamp": "2023-12-20T10:17:38.994Z",
      "heartbeatTimestamp": "2023-12-20T10:15:51.478Z"
    },
    {
      "utilizationIdentifier": "995f36fb-4d1e-49b8-93ac-4c1caec71dc1",
      "assetIdentifier": "cc87e897-79e2-4cbf-9655-1b145d78a306",
      "minionId": "System_Product_Name--SN-System_Serial_Number--MAC-40-B0-76-44-7F-26",
      "category": "Configuration",
      "taskName": "NI SystemLink Notifications",
      "userName": "ServEng",
      "startTimestamp": "2023-12-20T09:42:31.702Z",
      "endTimestamp": "2023-12-20T09:53:53.507Z",
      "heartbeatTimestamp": "2023-12-20T09:52:31.731Z"
    },
    {
      "utilizationIdentifier": "63e8d2e4-0bfb-4a3e-83cf-afdb283d933d",
      "assetIdentifier": "cc87e897-79e2-4cbf-9655-1b145d78a306",
      "minionId": "System_Product_Name--SN-System_Serial_Number--MAC-40-B0-76-44-7F-26",
      "category": "Configuration",
      "taskName": "NI SystemLink Notifications",
      "userName": "ServEng",
      "startTimestamp": "2023-12-20T07:13:07.44Z",
      "endTimestamp": "2023-12-20T08:59:54.644Z",
      "heartbeatTimestamp": "2023-12-20T08:58:07.678Z"
    },
    {
      "utilizationIdentifier": "087885c9-8760-48e3-91a7-d778c22ea4b0",
      "assetIdentifier": "cc87e897-79e2-4cbf-9655-1b145d78a306",
      "minionId": "System_Product_Name--SN-System_Serial_Number--MAC-40-B0-76-44-7F-26",
      "category": "Configuration",
      "taskName": "NI SystemLink Notifications",
      "userName": "ServEng",
      "startTimestamp": "2023-12-20T06:55:08.832Z",
      "endTimestamp": "2023-12-20T06:59:15.635Z"
    },
    {
      "utilizationIdentifier": "0f2730da-466c-4dfe-9896-1960a99dc1d3",
      "assetIdentifier": "cc87e897-79e2-4cbf-9655-1b145d78a306",
      "minionId": "System_Product_Name--SN-System_Serial_Number--MAC-40-B0-76-44-7F-26",
      "category": "Configuration",
      "taskName": "NI SystemLink Notifications",
      "userName": "ServEng",
      "startTimestamp": "2023-12-20T06:17:30.964Z",
      "endTimestamp": "2023-12-20T06:53:03.493Z",
      "heartbeatTimestamp": "2023-12-20T06:52:31.036Z"
    },
    {
      "utilizationIdentifier": "7a2af4b3-2c1b-48cb-97a3-2b804da8a261",
      "assetIdentifier": "cc87e897-79e2-4cbf-9655-1b145d78a306",
      "minionId": "System_Product_Name--SN-System_Serial_Number--MAC-40-B0-76-44-7F-26",
      "category": "Configuration",
      "taskName": "NI SystemLink Notifications",
      "userName": "ServEng",
      "startTimestamp": "2023-12-20T05:53:30.745Z",
      "endTimestamp": "2023-12-20T06:15:37.724Z",
      "heartbeatTimestamp": "2023-12-20T06:13:30.799Z"
    },
    {
      "utilizationIdentifier": "010f733d-e3f4-4c7c-bf6d-d9e92b092286",
      "assetIdentifier": "cc87e897-79e2-4cbf-9655-1b145d78a306",
      "minionId": "System_Product_Name--SN-System_Serial_Number--MAC-40-B0-76-44-7F-26",
      "category": "Configuration",
      "taskName": "NI SystemLink Notifications",
      "userName": "ServEng",
      "startTimestamp": "2023-12-20T05:41:44.579Z",
      "endTimestamp": "2023-12-20T05:43:30.705Z"
    },
    {
      "utilizationIdentifier": "6e4810ff-fa92-49f5-aef2-a17d66a92af2",
      "assetIdentifier": "cc87e897-79e2-4cbf-9655-1b145d78a306",
      "minionId": "System_Product_Name--SN-System_Serial_Number--MAC-40-B0-76-44-7F-26",
      "category": "Configuration",
      "taskName": "NI SystemLink Notifications",
      "userName": "ServEng",
      "startTimestamp": "2023-12-19T11:59:36.276Z",
      "endTimestamp": "2023-12-19T12:01:39.75Z"
    },
    {
      "utilizationIdentifier": "13347732-742b-4a94-83f2-028ef8a2bff1",
      "assetIdentifier": "cc87e897-79e2-4cbf-9655-1b145d78a306",
      "minionId": "System_Product_Name--SN-System_Serial_Number--MAC-40-B0-76-44-7F-26",
      "category": "Configuration",
      "taskName": "NI SystemLink Notifications",
      "userName": "ServEng",
      "startTimestamp": "2023-12-18T08:12:54.703Z",
      "endTimestamp": "2023-12-18T08:52:46.81Z",
      "heartbeatTimestamp": "2023-12-18T08:47:54.785Z"
    },
    {
      "utilizationIdentifier": "c34a4a5e-7ef2-4de9-9764-77d2e37d793a",
      "assetIdentifier": "cc87e897-79e2-4cbf-9655-1b145d78a306",
      "minionId": "System_Product_Name--SN-System_Serial_Number--MAC-40-B0-76-44-7F-26",
      "category": "Configuration",
      "taskName": "NI SystemLink Notifications",
      "userName": "ServEng",
      "startTimestamp": "2023-12-18T07:38:29.703Z",
      "endTimestamp": "2023-12-18T08:05:56.014Z",
      "heartbeatTimestamp": "2023-12-18T08:03:29.759Z"
    },
    {
      "utilizationIdentifier": "785f212c-1e1f-444a-b8a7-b4e896cd1eb3",
      "assetIdentifier": "cc87e897-79e2-4cbf-9655-1b145d78a306",
      "minionId": "System_Product_Name--SN-System_Serial_Number--MAC-40-B0-76-44-7F-26",
      "category": "Configuration",
      "taskName": "NI SystemLink Notifications",
      "userName": "ServEng",
      "startTimestamp": "2023-12-18T07:04:27.481Z",
      "endTimestamp": "2023-12-18T07:38:14.243Z",
      "heartbeatTimestamp": "2023-12-18T07:34:27.548Z"
    },
    {
      "utilizationIdentifier": "e4e39644-85e9-4175-ab92-58ffd87514cb",
      "assetIdentifier": "cc87e897-79e2-4cbf-9655-1b145d78a306",
      "minionId": "System_Product_Name--SN-System_Serial_Number--MAC-40-B0-76-44-7F-26",
      "category": "Configuration",
      "taskName": "NI SystemLink Notifications",
      "userName": "ServEng",
      "startTimestamp": "2023-12-18T06:12:39.996Z",
      "endTimestamp": "2023-12-18T07:01:06.234Z",
      "heartbeatTimestamp": "2023-12-18T06:57:40.101Z"
    },
    {
      "utilizationIdentifier": "b13fd5ac-f71e-43ca-920a-56320b57b716",
      "assetIdentifier": "cc87e897-79e2-4cbf-9655-1b145d78a306",
      "minionId": "System_Product_Name--SN-System_Serial_Number--MAC-40-B0-76-44-7F-26",
      "category": "Configuration",
      "taskName": "NI SystemLink Notifications",
      "userName": "ServEng",
      "startTimestamp": "2023-12-15T11:15:30.857Z",
      "endTimestamp": "2023-12-15T12:21:12.398Z",
      "heartbeatTimestamp": "2023-12-15T12:20:30.99Z"
    },
    {
      "utilizationIdentifier": "30de5767-7360-4492-b6d5-28be2ee77731",
      "assetIdentifier": "cc87e897-79e2-4cbf-9655-1b145d78a306",
      "minionId": "System_Product_Name--SN-System_Serial_Number--MAC-40-B0-76-44-7F-26",
      "category": "Configuration",
      "taskName": "NI SystemLink Notifications",
      "userName": "ServEng",
      "startTimestamp": "2023-12-15T10:38:51.216Z",
      "endTimestamp": "2023-12-15T11:08:45.524Z",
      "heartbeatTimestamp": "2023-12-15T11:03:51.26Z"
    },
    {
      "utilizationIdentifier": "3d65663f-b29b-4b27-9ae3-6b1c0c6f8c7c",
      "assetIdentifier": "cc87e897-79e2-4cbf-9655-1b145d78a306",
      "minionId": "System_Product_Name--SN-System_Serial_Number--MAC-40-B0-76-44-7F-26",
      "category": "Configuration",
      "taskName": "NI SystemLink Notifications",
      "userName": "ServEng",
      "startTimestamp": "2023-12-15T09:56:54.814Z",
      "endTimestamp": "2023-12-15T10:30:23.685Z",
      "heartbeatTimestamp": "2023-12-15T10:26:54.867Z"
    },
    {
      "utilizationIdentifier": "640e5690-8379-42ac-893f-f3ecfdb5b54d",
      "assetIdentifier": "cc87e897-79e2-4cbf-9655-1b145d78a306",
      "minionId": "System_Product_Name--SN-System_Serial_Number--MAC-40-B0-76-44-7F-26",
      "category": "Configuration",
      "taskName": "NI SystemLink Notifications",
      "userName": "ServEng",
      "startTimestamp": "2023-12-15T07:37:09.062Z",
      "endTimestamp": "2023-12-15T09:18:58.705Z",
      "heartbeatTimestamp": "2023-12-15T09:17:09.252Z"
    },
    {
      "utilizationIdentifier": "660710c8-2563-4f82-a15c-82fd2576a103",
      "assetIdentifier": "cc87e897-79e2-4cbf-9655-1b145d78a306",
      "minionId": "System_Product_Name--SN-System_Serial_Number--MAC-40-B0-76-44-7F-26",
      "category": "Configuration",
      "taskName": "NI SystemLink Notifications",
      "userName": "ServEng",
      "startTimestamp": "2023-12-15T07:03:03.582Z",
      "endTimestamp": "2023-12-15T07:33:09.882Z",
      "heartbeatTimestamp": "2023-12-15T07:33:03.642Z"
    },
    {
      "utilizationIdentifier": "a092e718-e993-4059-9f97-a3c580df0980",
      "assetIdentifier": "cc87e897-79e2-4cbf-9655-1b145d78a306",
      "minionId": "System_Product_Name--SN-System_Serial_Number--MAC-40-B0-76-44-7F-26",
      "category": "Configuration",
      "taskName": "NI SystemLink Notifications",
      "userName": "ServEng",
      "startTimestamp": "2023-12-15T05:58:52.318Z",
      "endTimestamp": "2023-12-15T06:41:57.966Z",
      "heartbeatTimestamp": "2023-12-15T06:38:52.401Z"
    },
    {
      "utilizationIdentifier": "7e6f9856-702a-4312-ac68-47236a2c2721",
      "assetIdentifier": "cc87e897-79e2-4cbf-9655-1b145d78a306",
      "minionId": "System_Product_Name--SN-System_Serial_Number--MAC-40-B0-76-44-7F-26",
      "category": "Configuration",
      "taskName": "NI SystemLink Notifications",
      "userName": "ServEng",
      "startTimestamp": "2023-12-15T05:30:55.127Z",
      "endTimestamp": "2023-12-15T05:56:22.222Z",
      "heartbeatTimestamp": "2023-12-15T05:55:55.172Z"
    },
    {
      "utilizationIdentifier": "30128cc4-d786-4695-b4d1-6c37b4ad9998",
      "assetIdentifier": "cc87e897-79e2-4cbf-9655-1b145d78a306",
      "minionId": "System_Product_Name--SN-System_Serial_Number--MAC-40-B0-76-44-7F-26",
      "category": "Configuration",
      "taskName": "NI SystemLink Notifications",
      "userName": "ServEng",
      "startTimestamp": "2023-12-14T09:01:58.242Z",
      "endTimestamp": "2023-12-14T10:24:44.016Z",
      "heartbeatTimestamp": "2023-12-14T10:21:58.419Z"
    },
    {
      "utilizationIdentifier": "8176d613-6b05-4780-95c8-df9680395287",
      "assetIdentifier": "cc87e897-79e2-4cbf-9655-1b145d78a306",
      "minionId": "System_Product_Name--SN-System_Serial_Number--MAC-40-B0-76-44-7F-26",
      "category": "Configuration",
      "taskName": "NI SystemLink Notifications",
      "userName": "ServEng",
      "startTimestamp": "2023-12-14T07:34:19.616Z",
      "endTimestamp": "2023-12-14T08:59:41.219Z",
      "heartbeatTimestamp": "2023-12-14T08:59:19.797Z"
    },
    {
      "utilizationIdentifier": "f1b909ec-0503-4a57-935a-649d1e25d1ef",
      "assetIdentifier": "cc87e897-79e2-4cbf-9655-1b145d78a306",
      "minionId": "System_Product_Name--SN-System_Serial_Number--MAC-40-B0-76-44-7F-26",
      "category": "Configuration",
      "taskName": "NI SystemLink Notifications",
      "userName": "ServEng",
      "startTimestamp": "2023-12-14T06:53:19.49Z",
      "endTimestamp": "2023-12-14T07:30:36.769Z",
      "heartbeatTimestamp": "2023-12-14T07:28:19.581Z"
    },
    {
      "utilizationIdentifier": "9278da8a-4c7d-4172-b816-de738e1e0150",
      "assetIdentifier": "cc87e897-79e2-4cbf-9655-1b145d78a306",
      "minionId": "System_Product_Name--SN-System_Serial_Number--MAC-40-B0-76-44-7F-26",
      "category": "Configuration",
      "taskName": "NI SystemLink Notifications",
      "userName": "ServEng",
      "startTimestamp": "2023-12-14T05:41:46.901Z",
      "endTimestamp": "2023-12-14T06:50:41.72Z",
      "heartbeatTimestamp": "2023-12-14T06:46:47.056Z"
    },
    {
      "utilizationIdentifier": "90d41e92-f1a1-4d93-a7f3-bf6921c3a130",
      "assetIdentifier": "cc87e897-79e2-4cbf-9655-1b145d78a306",
      "minionId": "System_Product_Name--SN-System_Serial_Number--MAC-40-B0-76-44-7F-26",
      "category": "Configuration",
      "taskName": "NI SystemLink Notifications",
      "userName": "ServEng",
      "startTimestamp": "2023-12-14T05:37:39.716Z",
      "endTimestamp": "2023-12-14T05:38:22.563Z"
    },
    {
      "utilizationIdentifier": "263cf09f-b0af-4875-9659-b0ea404d19e1",
      "assetIdentifier": "cc87e897-79e2-4cbf-9655-1b145d78a306",
      "minionId": "System_Product_Name--SN-System_Serial_Number--MAC-40-B0-76-44-7F-26",
      "category": "Configuration",
      "taskName": "NI SystemLink Notifications",
      "userName": "ServEng",
      "startTimestamp": "2023-12-13T11:28:15.672Z",
      "endTimestamp": "2023-12-13T12:04:52.79Z",
      "heartbeatTimestamp": "2023-12-13T12:03:15.745Z"
    },
    {
      "utilizationIdentifier": "f2940c90-2d3f-411d-82da-cb0f06ed4dd0",
      "assetIdentifier": "cc87e897-79e2-4cbf-9655-1b145d78a306",
      "minionId": "System_Product_Name--SN-System_Serial_Number--MAC-40-B0-76-44-7F-26",
      "category": "Configuration",
      "taskName": "NI SystemLink Notifications",
      "userName": "ServEng",
      "startTimestamp": "2023-12-13T10:06:09.443Z",
      "endTimestamp": "2023-12-13T11:26:05.189Z",
      "heartbeatTimestamp": "2023-12-13T11:21:09.565Z"
    },
    {
      "utilizationIdentifier": "b0868486-4803-439f-a72f-26c11a40678f",
      "assetIdentifier": "cc87e897-79e2-4cbf-9655-1b145d78a306",
      "minionId": "System_Product_Name--SN-System_Serial_Number--MAC-40-B0-76-44-7F-26",
      "category": "Configuration",
      "taskName": "NI SystemLink Notifications",
      "userName": "ServEng",
      "startTimestamp": "2023-12-13T09:59:29.228Z",
      "endTimestamp": "2023-12-13T09:59:44.318Z"
    },
    {
      "utilizationIdentifier": "31afac8f-7977-4196-aaa1-7d9ec14c0fc2",
      "assetIdentifier": "cc87e897-79e2-4cbf-9655-1b145d78a306",
      "minionId": "System_Product_Name--SN-System_Serial_Number--MAC-40-B0-76-44-7F-26",
      "category": "Configuration",
      "taskName": "NI SystemLink Notifications",
      "userName": "ServEng",
      "startTimestamp": "2023-12-13T09:43:39.293Z",
      "endTimestamp": "2023-12-13T09:57:23.846Z",
      "heartbeatTimestamp": "2023-12-13T09:53:39.315Z"
    },
    {
      "utilizationIdentifier": "7f489b1d-3325-46d2-b234-ea1dd254fec3",
      "assetIdentifier": "cc87e897-79e2-4cbf-9655-1b145d78a306",
      "minionId": "System_Product_Name--SN-System_Serial_Number--MAC-40-B0-76-44-7F-26",
      "category": "Configuration",
      "taskName": "NI SystemLink Notifications",
      "userName": "ServEng",
      "startTimestamp": "2023-12-13T07:16:50.731Z",
      "endTimestamp": "2023-12-13T09:10:34.984Z",
      "heartbeatTimestamp": "2023-12-13T09:06:50.962Z"
    },
    {
      "utilizationIdentifier": "17d1a869-b56c-4842-a609-69510115181e",
      "assetIdentifier": "cc87e897-79e2-4cbf-9655-1b145d78a306",
      "minionId": "System_Product_Name--SN-System_Serial_Number--MAC-40-B0-76-44-7F-26",
      "category": "Configuration",
      "taskName": "NI SystemLink Notifications",
      "userName": "ServEng",
      "startTimestamp": "2023-12-13T05:37:08.543Z",
      "endTimestamp": "2023-12-13T07:10:21.889Z",
      "heartbeatTimestamp": "2023-12-13T07:07:08.772Z"
    },
    {
      "utilizationIdentifier": "8458110a-cbb5-4725-959c-f7fea6fadff1",
      "assetIdentifier": "cc87e897-79e2-4cbf-9655-1b145d78a306",
      "minionId": "System_Product_Name--SN-System_Serial_Number--MAC-40-B0-76-44-7F-26",
      "category": "Configuration",
      "taskName": "NI SystemLink Notifications",
      "userName": "ServEng",
      "startTimestamp": "2023-12-12T09:39:43.711Z",
      "endTimestamp": "2023-12-12T11:54:14.455Z",
      "heartbeatTimestamp": "2023-12-12T11:49:43.94Z"
    },
    {
      "utilizationIdentifier": "d84bb397-4a6a-4c56-835c-1fbf9f75910b",
      "assetIdentifier": "cc87e897-79e2-4cbf-9655-1b145d78a306",
      "minionId": "System_Product_Name--SN-System_Serial_Number--MAC-40-B0-76-44-7F-26",
      "category": "Configuration",
      "taskName": "NI SystemLink Notifications",
      "userName": "ServEng",
      "startTimestamp": "2023-12-12T08:57:47.504Z",
      "endTimestamp": "2023-12-12T09:18:02.77Z",
      "heartbeatTimestamp": "2023-12-12T09:17:47.553Z"
    },
    {
      "utilizationIdentifier": "be6ed18d-5e30-4894-99ea-bd565b68adda",
      "assetIdentifier": "cc87e897-79e2-4cbf-9655-1b145d78a306",
      "minionId": "System_Product_Name--SN-System_Serial_Number--MAC-40-B0-76-44-7F-26",
      "category": "Configuration",
      "taskName": "NI SystemLink Notifications",
      "userName": "ServEng",
      "startTimestamp": "2023-12-12T08:35:25.939Z",
      "endTimestamp": "2023-12-12T08:55:45.409Z",
      "heartbeatTimestamp": "2023-12-12T08:55:25.969Z"
    },
    {
      "utilizationIdentifier": "13bd1e72-d8c9-4c53-8eef-55455880d8af",
      "assetIdentifier": "cc87e897-79e2-4cbf-9655-1b145d78a306",
      "minionId": "System_Product_Name--SN-System_Serial_Number--MAC-40-B0-76-44-7F-26",
      "category": "Configuration",
      "taskName": "NI SystemLink Notifications",
      "userName": "ServEng",
      "startTimestamp": "2023-12-12T08:25:54.224Z",
      "endTimestamp": "2023-12-12T08:33:14.776Z",
      "heartbeatTimestamp": "2023-12-12T08:30:54.245Z"
    },
    {
      "utilizationIdentifier": "dc8d7f55-806d-4166-81bc-105fe1333bd6",
      "assetIdentifier": "cc87e897-79e2-4cbf-9655-1b145d78a306",
      "minionId": "System_Product_Name--SN-System_Serial_Number--MAC-40-B0-76-44-7F-26",
      "category": "Configuration",
      "taskName": "NI SystemLink Notifications",
      "userName": "ServEng",
      "startTimestamp": "2023-12-12T07:29:56.697Z",
      "endTimestamp": "2023-12-12T08:14:34.255Z",
      "heartbeatTimestamp": "2023-12-12T08:09:56.788Z"
    },
    {
      "utilizationIdentifier": "66c6c1b2-64b2-4b81-babf-da9baffaad14",
      "assetIdentifier": "cc87e897-79e2-4cbf-9655-1b145d78a306",
      "minionId": "System_Product_Name--SN-System_Serial_Number--MAC-40-B0-76-44-7F-26",
      "category": "Configuration",
      "taskName": "NI SystemLink Notifications",
      "userName": "ServEng",
      "startTimestamp": "2023-12-12T07:03:05.901Z",
      "endTimestamp": "2023-12-12T07:28:00.898Z",
      "heartbeatTimestamp": "2023-12-12T07:23:05.966Z"
    },
    {
      "utilizationIdentifier": "12e0e9bd-027a-49b9-ac33-87744bbff01b",
      "assetIdentifier": "cc87e897-79e2-4cbf-9655-1b145d78a306",
      "minionId": "System_Product_Name--SN-System_Serial_Number--MAC-40-B0-76-44-7F-26",
      "category": "Configuration",
      "taskName": "NI SystemLink Notifications",
      "userName": "ServEng",
      "startTimestamp": "2023-12-12T05:40:20.766Z",
      "endTimestamp": "2023-12-12T06:59:47.132Z",
      "heartbeatTimestamp": "2023-12-12T06:55:20.919Z"
    },
    {
      "utilizationIdentifier": "57f3c059-789e-4023-81ad-7d6379d969c1",
      "assetIdentifier": "cc87e897-79e2-4cbf-9655-1b145d78a306",
      "minionId": "System_Product_Name--SN-System_Serial_Number--MAC-40-B0-76-44-7F-26",
      "category": "Configuration",
      "taskName": "NI SystemLink Notifications",
      "userName": "ServEng",
      "startTimestamp": "2023-12-12T05:36:18.888Z",
      "endTimestamp": "2023-12-12T05:36:20.58Z"
    },
    {
      "utilizationIdentifier": "1226e856-47f6-4bde-87fe-248678c96922",
      "assetIdentifier": "cc87e897-79e2-4cbf-9655-1b145d78a306",
      "minionId": "System_Product_Name--SN-System_Serial_Number--MAC-40-B0-76-44-7F-26",
      "category": "Configuration",
      "taskName": "NI SystemLink Notifications",
      "userName": "ServEng",
      "startTimestamp": "2023-12-11T11:13:57.166Z",
      "endTimestamp": "2023-12-11T12:12:52.557Z",
      "heartbeatTimestamp": "2023-12-11T12:08:57.28Z"
    }
  ],
  "continuationToken": ""
}

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
        .mockReturnValue(createFetchResponse(assetUtilizationHistoryQueryMock))
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
