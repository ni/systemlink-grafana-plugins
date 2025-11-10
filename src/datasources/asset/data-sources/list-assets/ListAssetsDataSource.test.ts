import {
    createFetchResponse,
    getQueryBuilder,
    requestMatching,
    setupDataSource,
} from "test/fixtures";
import { AssetQueryType } from "../../types/types";
import { ListAssetsDataSource } from "./ListAssetsDataSource";
import { AssetFilterPropertiesOption, ListAssetsQuery, OutputType } from "../../types/ListAssets.types";
import { ListAssetsFieldNames } from "../../constants/ListAssets.constants";
import { MockProxy } from "jest-mock-extended";
import { BackendSrv } from "@grafana/runtime";
import { Field } from "@grafana/data";
import { AssetsResponse } from "datasources/asset-common/types";
import { QUERY_LIMIT } from "datasources/asset/constants/constants";

let datastore: ListAssetsDataSource, backendServer: MockProxy<BackendSrv>;
const mockListAssets = {
    assets: [
        {
            modelName: 'ABCD',
            modelNumber: 0,
            serialNumber: 'SDFGSDFG234',
            vendorName: 'Acme',
            vendorNumber: 0,
            busType: 'BUILT_IN_SYSTEM',
            name: 'SDFGSDFG234',
            assetType: 'SYSTEM',
            firmwareVersion: '',
            hardwareVersion: '',
            visaResourceName: '',
            temperatureSensors: [],
            supportsSelfCalibration: false,
            supportsExternalCalibration: false,
            isNIAsset: true,
            partNumber: 'ALK AA48FFP-U AMZ',
            workspace: 'Default',
            fileIds: ["608a5684800e325b48837c2a"],
            supportsSelfTest: false,
            supportsReset: false,
            id: 'c44750b7-1f22-4fec-b475-73b10e966217',
            location: {
                minionId: '',
                parent: '',
                resourceUri: '',
                slotNumber: 0,
                state: {
                    assetPresence: "INITIALIZING"
                },
                physicalLocation: ''
            },
            calibrationStatus: 'OK',
            isSystemController: false,
            discoveryType: 'MANUAL',
            properties: {},
            keywords: ['keyword'],
            lastUpdatedTimestamp: '2023-08-31T17:32:15.201Z',
            scanCode: 'c44750b7-1f22-4fec-b475-73b10e966217',
        }
    ],
    totalCount: 4,
};

beforeEach(() => {
    [datastore, backendServer] = setupDataSource(ListAssetsDataSource);
    backendServer.fetch
        .calledWith(requestMatching({ url: '/niapm/v1/query-assets', method: 'POST' }))
        .mockReturnValue(createFetchResponse(mockListAssets));

    jest.spyOn(datastore, 'processListAssetsQuery');
});

const buildListAssetsQuery = getQueryBuilder<ListAssetsQuery>()({
    refId: '',
});

describe('List assets location queries', () => {
    let processlistAssetsQuerySpy: jest.SpyInstance;

    beforeEach(() => {
        processlistAssetsQuerySpy = jest.spyOn(datastore, 'processListAssetsQuery').mockImplementation();
    });

    test('should transform LOCATION field with single value', async () => {
        const query = buildListAssetsQuery({
            refId: '',
            type: AssetQueryType.ListAssets,
            filter: `${ListAssetsFieldNames.LOCATION} = "Location1"`,
            outputType: OutputType.Properties,
        });

        await datastore.query(query);

        expect(processlistAssetsQuerySpy).toHaveBeenCalledWith(
            expect.objectContaining({
                filter: "Locations.Any(l => l.MinionId = \"Location1\" || l.PhysicalLocation = \"Location1\")"
            })
        );
    });

    test('should transform LOCATION field when operator is string.IsNullOrEmpty', async () => {
        const query = buildListAssetsQuery({
            refId: '',
            type: AssetQueryType.ListAssets,
            filter: `string.IsNullOrEmpty(${ListAssetsFieldNames.LOCATION})`,
            outputType: OutputType.Properties,
        });

        await datastore.query(query);

        expect(processlistAssetsQuerySpy).toHaveBeenCalledWith(
            expect.objectContaining({
                filter: "(string.IsNullOrEmpty(Location.MinionId) && string.IsNullOrEmpty(Location.PhysicalLocation))"
            })
        );
    });

    test('should transform LOCATION field when operator is !string.IsNullOrEmpty', async () => {
        const query = buildListAssetsQuery({
            refId: '',
            type: AssetQueryType.ListAssets,
            filter: `!string.IsNullOrEmpty(${ListAssetsFieldNames.LOCATION})`,
            outputType: OutputType.Properties,
        });

        await datastore.query(query);

        expect(processlistAssetsQuerySpy).toHaveBeenCalledWith(
            expect.objectContaining({
                filter: "(!string.IsNullOrEmpty(Location.MinionId) || !string.IsNullOrEmpty(Location.PhysicalLocation))"
            })
        );
    });

    test('should transform LOCATION field with single value and system cache hit', async () => {
        datastore.systemAliasCache.set('Location1', { id: 'Location1', alias: 'Location1-alias', state: 'CONNECTED', workspace: '1' });

        const query = buildListAssetsQuery({
            refId: '',
            type: AssetQueryType.ListAssets,
            filter: `${ListAssetsFieldNames.LOCATION} = "Location1"`,
            outputType: OutputType.Properties,
        });

        await datastore.query(query);

        expect(processlistAssetsQuerySpy).toHaveBeenCalledWith(
            expect.objectContaining({
                filter: "Location.MinionId = \"Location1\""
            })
        );
    });

    test('should transform LOCATION field with multiple values and system cache hit', async () => {
        datastore.systemAliasCache.set('Location1', { id: 'Location1', alias: 'Location1-alias', state: 'CONNECTED', workspace: '1' });
        datastore.systemAliasCache.set('Location2', { id: 'Location2', alias: 'Location2-alias', state: 'CONNECTED', workspace: '2' });

        const query = buildListAssetsQuery({
            refId: '',
            type: AssetQueryType.ListAssets,
            filter: `${ListAssetsFieldNames.LOCATION} = "{Location1,Location2}"`,
            outputType: OutputType.Properties,
        });

        await datastore.query(query);

        expect(processlistAssetsQuerySpy).toHaveBeenCalledWith(
            expect.objectContaining({
                filter: "(Location.MinionId = \"Location1\" || Location.MinionId = \"Location2\")"
            })
        );
    });

    test('should transform LOCATION field with location cache hit', async () => {
        datastore.locationCache.set('cabinet-1-id', { id: 'cabinet-1-id', name: 'Cabinet 1' });

        const query = buildListAssetsQuery({
            refId: '',
            type: AssetQueryType.ListAssets,
            filter: `${ListAssetsFieldNames.LOCATION} = "cabinet-1-id"`,
            outputType: OutputType.Properties,
        });

        await datastore.query(query);

        expect(processlistAssetsQuerySpy).toHaveBeenCalledWith(
            expect.objectContaining({
                filter: "Location.PhysicalLocation = \"cabinet-1-id\""
            })
        );
    });
});

describe('List assets "contains" queries', () => {
    let processlistAssetsQuerySpy: jest.SpyInstance;

    beforeEach(() => {
        processlistAssetsQuerySpy = jest.spyOn(datastore, 'processListAssetsQuery').mockImplementation();
    });

    describe('should transform single values for', () => {
        test('ModelName, Name, VendorName field with single value', async () => {
            const query = buildListAssetsQuery({
                refId: '',
                type: AssetQueryType.ListAssets,
                outputType: OutputType.Properties,
                filter: `${ListAssetsFieldNames.MODEL_NAME}.Contains("ModelName1") && ${ListAssetsFieldNames.ASSET_NAME}.Contains("AssetName1") && ${ListAssetsFieldNames.VENDOR_NAME}.Contains("VendorName1")`,
            });

            await datastore.query(query);

            expect(processlistAssetsQuerySpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    filter: "ModelName.Contains(\"ModelName1\") && AssetName.Contains(\"AssetName1\") && VendorName.Contains(\"VendorName1\")"
                }),
            );
        });

        test('ModelName, Name, VendorName field with single value negated', async () => {
            const query = buildListAssetsQuery({
                refId: '',
                type: AssetQueryType.ListAssets,
                outputType: OutputType.Properties,
                filter: `!(${ListAssetsFieldNames.MODEL_NAME}.Contains("ModelName1")) && !(${ListAssetsFieldNames.ASSET_NAME}.Contains("AssetName1")) && !(${ListAssetsFieldNames.VENDOR_NAME}.Contains("VendorName1"))`,
            });

            await datastore.query(query);

            expect(processlistAssetsQuerySpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    filter: "!(ModelName.Contains(\"ModelName1\")) && !(AssetName.Contains(\"AssetName1\")) && !(VendorName.Contains(\"VendorName1\"))"
                }),
            );
        });
    });

    describe('should transform multiple values for', () => {
        test('VendorName field', async () => {
            const query = buildListAssetsQuery({
                refId: '',
                type: AssetQueryType.ListAssets,
                outputType: OutputType.Properties,
                filter: `${ListAssetsFieldNames.VENDOR_NAME}.Contains("{VendorName1,VendorName2}")`,
            });

            await datastore.query(query);

            expect(processlistAssetsQuerySpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    filter: "(VendorName.Contains(\"VendorName1\") || VendorName.Contains(\"VendorName2\"))"
                }),
            );
        });

        test('VendorName field negated', async () => {
            const query = buildListAssetsQuery({
                refId: '',
                type: AssetQueryType.ListAssets,
                outputType: OutputType.Properties,
                filter: `!(${ListAssetsFieldNames.VENDOR_NAME}.Contains("{VendorName1,VendorName2}"))`,
            });

            await datastore.query(query);

            expect(processlistAssetsQuerySpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    filter: "(!(VendorName.Contains(\"VendorName1\")) && !(VendorName.Contains(\"VendorName2\")))"
                }),
            );
        });

        test('ModelName field', async () => {
            const query = buildListAssetsQuery({
                refId: '',
                type: AssetQueryType.ListAssets,
                outputType: OutputType.Properties,
                filter: `${ListAssetsFieldNames.MODEL_NAME}.Contains("{ModelName1,ModelName2}")`,
            });

            await datastore.query(query);

            expect(processlistAssetsQuerySpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    filter: "(ModelName.Contains(\"ModelName1\") || ModelName.Contains(\"ModelName2\"))"
                }),
            );
        });

        test('ModelName field negated', async () => {
            const query = buildListAssetsQuery({
                refId: '',
                type: AssetQueryType.ListAssets,
                outputType: OutputType.Properties,
                filter: `!(${ListAssetsFieldNames.MODEL_NAME}.Contains("{ModelName1,ModelName2}"))`,
            });

            await datastore.query(query);

            expect(processlistAssetsQuerySpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    filter: "(!(ModelName.Contains(\"ModelName1\")) && !(ModelName.Contains(\"ModelName2\")))"
                }),
            );
        });

        test('AssetName field', async () => {
            const query = buildListAssetsQuery({
                refId: '',
                type: AssetQueryType.ListAssets,
                outputType: OutputType.Properties,
                filter: `${ListAssetsFieldNames.ASSET_NAME}.Contains("{AssetName1,AssetName2}")`,
            });

            await datastore.query(query);

            expect(processlistAssetsQuerySpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    filter: "(AssetName.Contains(\"AssetName1\") || AssetName.Contains(\"AssetName2\"))"
                }),
            );
        });

        test('AssetName negated', async () => {
            const query = buildListAssetsQuery({
                refId: '',
                type: AssetQueryType.ListAssets,
                outputType: OutputType.Properties,
                filter: `!(${ListAssetsFieldNames.ASSET_NAME}.Contains("{AssetName1,AssetName2}"))`,
            });

            await datastore.query(query);

            expect(processlistAssetsQuerySpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    filter: "(!(AssetName.Contains(\"AssetName1\")) && !(AssetName.Contains(\"AssetName2\")))"
                }),
            );
        });
    });
})

describe('shouldRunQuery', () => {
    test('should not process query for hidden queries', async () => {
        const processlistAssetsQuerySpy = jest.spyOn(datastore, 'processListAssetsQuery').mockImplementation();
        const query = buildListAssetsQuery({
            refId: '',
            type: AssetQueryType.ListAssets,
            filter: `${ListAssetsFieldNames.LOCATION} = "Location1"`,
            hide: true
        });

        await datastore.query(query);

        expect(processlistAssetsQuerySpy).not.toHaveBeenCalled();
    });

    test('should process query for non-hidden queries', async () => {
        const processlistAssetsQuerySpy = jest.spyOn(datastore, 'processListAssetsQuery').mockImplementation();
        const query = buildListAssetsQuery({
            refId: '',
            type: AssetQueryType.ListAssets,
            filter: `${ListAssetsFieldNames.LOCATION} = "Location1"`,
            hide: false,
            outputType: OutputType.Properties,
        });

        await datastore.query(query);

        expect(processlistAssetsQuerySpy).toHaveBeenCalled();
    });

    test('should call queryAsset with returnCount set to true when outpuType is set to TotalCount', async () => {
        const query = buildListAssetsQuery({
            refId: '',
            type: AssetQueryType.ListAssets,
            filter: ``,
            outputType: OutputType.TotalCount,
            properties: [AssetFilterPropertiesOption.AssetIdentifier],
        });
        const queryAssetSpy = jest.spyOn(datastore, 'queryAssets');

        await datastore.query(query);

        expect(queryAssetSpy).toHaveBeenCalledWith('', 1, true, [AssetFilterPropertiesOption.AssetIdentifier]);
    })

    test('should call queryAsset with returnCount set to false when outpuType is set to Properties', async () => {
        const query = buildListAssetsQuery({
            refId: '',
            type: AssetQueryType.ListAssets,
            filter: ``,
            outputType: OutputType.Properties,
            properties: [AssetFilterPropertiesOption.AssetIdentifier],
        });
        const queryAssetSpy = jest.spyOn(datastore, 'queryAssets');

        await datastore.query(query);

        expect(queryAssetSpy).toHaveBeenCalledWith('', QUERY_LIMIT, false, ["AssetIdentifier"]);
    })

    test('should match snapshot for TotalCount outputType', async () => {
        jest.spyOn(datastore, 'queryAssets').mockResolvedValue(mockListAssets);

        const query = buildListAssetsQuery({
            refId: '',
            type: AssetQueryType.ListAssets,
            filter: ``,
            outputType: OutputType.TotalCount,
        });
        const result = await datastore.query(query);
        const data = result.data[0];

        expect(data.fields[0].values[0]).toBe(4);
        expect(data.fields).toMatchSnapshot();
    })

    test('should match snapshot for Properties outputType', async () => {
        jest.spyOn(datastore, 'queryAssets').mockResolvedValue(mockListAssets);

        const query = buildListAssetsQuery({
            refId: '',
            type: AssetQueryType.ListAssets,
            filter: ``,
            outputType: OutputType.Properties,
        });
        const result = await datastore.query(query);
        const data = result.data[0];

        expect(data.fields.length).toBeGreaterThan(0);
        expect(data.fields).toMatchSnapshot();
    })

    test('should call queryAsset with take set to 1000 by default', async () => {
        const query = buildListAssetsQuery({
            refId: '',
            type: AssetQueryType.ListAssets,
            filter: ``,
            outputType: OutputType.Properties,
            properties: [AssetFilterPropertiesOption.AssetIdentifier],
        });
        const queryAssetSpy = jest.spyOn(datastore, 'queryAssets');

        await datastore.query(query);

        expect(queryAssetSpy).toHaveBeenCalledWith('', 1000, false, ["AssetIdentifier"]);
    })

    test('should return empty data when take is invalid', async () => {
        const query = buildListAssetsQuery({
            refId: '',
            type: AssetQueryType.ListAssets,
            filter: ``,
            outputType: OutputType.Properties,
            take: undefined,
        });
        const queryAssetSpy = jest.spyOn(datastore, 'queryAssets');
        const result = await datastore.query(query);
        const data = result.data[0];

        expect(data.fields.length).toBe(0);
        expect(queryAssetSpy).not.toHaveBeenCalled();
    });

    test('should return empty data when take is less than 0', async () => {
        const query = buildListAssetsQuery({
            refId: '',
            type: AssetQueryType.ListAssets,
            filter: ``,
            outputType: OutputType.Properties,
            take: -1,
        });
        const queryAssetSpy = jest.spyOn(datastore, 'queryAssets');
        const result = await datastore.query(query);
        const data = result.data[0];

        expect(data.fields.length).toBe(0);
        expect(queryAssetSpy).not.toHaveBeenCalled();
    });

    test('should return empty data when take is greater than 10000', async () => {
        const query = buildListAssetsQuery({
            refId: '',
            type: AssetQueryType.ListAssets,
            filter: ``,
            outputType: OutputType.Properties,
            take: 10001,
        });
        const queryAssetSpy = jest.spyOn(datastore, 'queryAssets');
        const result = await datastore.query(query);
        const data = result.data[0];

        expect(data.fields.length).toBe(0);
        expect(queryAssetSpy).not.toHaveBeenCalled();
    });

    test('should return expected data when take is 0', async () => {
        const query = buildListAssetsQuery({
            refId: '',
            type: AssetQueryType.ListAssets,
            filter: ``,
            outputType: OutputType.Properties,
            take: 0,
        });
        jest.spyOn(datastore, 'queryAssets');

        const result = await datastore.query(query);
        const data = result.data[0];

        expect(data).toMatchSnapshot();
    });

    test('should return single asset when identifier is provided', async () => {
        const query = buildListAssetsQuery({
            refId: '',
            type: AssetQueryType.ListAssets,
            filter: `AssetIdentifier = "c44750b7-1f22-4fec-b475-73b10e966217"   `,
            outputType: OutputType.Properties,
            take: 1,
        });
        jest.spyOn(datastore, 'queryAssets');

        const result = await datastore.query(query);
        const data = result.data[0];

        expect(data).toMatchSnapshot();
    });

    test('should return expected data when take is 1000', async () => {
        const query = buildListAssetsQuery({
            refId: '',
            type: AssetQueryType.ListAssets,
            filter: ``,
            outputType: OutputType.Properties,
            take: 1000,
        });
        jest.spyOn(datastore, 'queryAssets');

        const result = await datastore.query(query);
        const data = result.data[0];

        expect(data).toMatchSnapshot();
    });

    test('should return expected data when take is 10000', async () => {
        const query = buildListAssetsQuery({
            refId: '',
            type: AssetQueryType.ListAssets,
            filter: ``,
            outputType: OutputType.Properties,
            take: 10000,
        });
        jest.spyOn(datastore, 'queryAssets');

        const result = await datastore.query(query);
        const data = result.data[0];

        expect(data).toMatchSnapshot();
    });

    test('should call queryAsset with properties set to the default', async () => {
        const query = buildListAssetsQuery({
            refId: '',
            type: AssetQueryType.ListAssets,
            filter: ``,
            outputType: OutputType.Properties,
        });
        const queryAssetSpy = jest.spyOn(datastore, 'queryAssets');

        await datastore.query(query);

        expect(queryAssetSpy).toHaveBeenCalledWith('', QUERY_LIMIT, false, Object.values(AssetFilterPropertiesOption));
    })

    test('should convert properties to Grafana fields', async () => {
        const query = buildListAssetsQuery({
            refId: '',
            type: AssetQueryType.ListAssets,
            filter: ``,
            outputType: OutputType.Properties,
            properties: [AssetFilterPropertiesOption.AssetIdentifier, AssetFilterPropertiesOption.AssetName],
        });
        const response = await datastore.query(query);
        const fields = response.data[0].fields as Field[];

        expect(fields).toMatchSnapshot();
    });

    test('should handle test plan custom properties', async () => {
        const query = buildListAssetsQuery({
            refId: '',
            type: AssetQueryType.ListAssets,
            filter: ``,
            outputType: OutputType.Properties,
            properties: [AssetFilterPropertiesOption.Properties],
        });
        const listAssetsResponse = {
            assets: [
                { properties: { aaaa: '11111' } },
                { properties: { bbbb: '22222', cccc: '33333' } },
            ], totalCount: 2
        }
        jest.spyOn(datastore, 'queryAssets').mockResolvedValue(listAssetsResponse as unknown as AssetsResponse)

        const response = await datastore.query(query);
        const data = response.data[0];

        expect(data.fields).toHaveLength(1);
        expect(data.fields[0].name).toEqual('properties');
        expect(data.fields[0].values).toEqual([
            JSON.stringify({ aaaa: '11111' }),
            JSON.stringify({ bbbb: '22222', cccc: '33333' }),
        ]);
    });

    test('should display empty cell when properties is empty', async () => {
        const query = buildListAssetsQuery({
            refId: '',
            type: AssetQueryType.ListAssets,
            filter: ``,
            outputType: OutputType.Properties,
            properties: [AssetFilterPropertiesOption.Properties],
        });
        const listAssetsResponse = {
            assets: [
                { properties: {} },
            ], totalCount: 1
        }
        jest.spyOn(datastore, 'queryAssets').mockResolvedValue(listAssetsResponse as unknown as AssetsResponse)

        const response = await datastore.query(query);
        const data = response.data[0];

        expect(data.fields).toHaveLength(1);
        expect(data.fields[0].name).toEqual('properties');
        expect(data.fields[0].values).toEqual(['{}']);
    });

    test('should display location property', async () => {
        datastore.locationCache.set('cabinet-3-id', { id: 'cabinet-3-id', name: 'Cabinet 3' });

        const query = buildListAssetsQuery({
            refId: '',
            type: AssetQueryType.ListAssets,
            filter: ``,
            outputType: OutputType.Properties,
            properties: [AssetFilterPropertiesOption.Location],
        });
        const listAssetsResponse = {
            assets: [
                {
                    location: {
                        physicalLocation: 'cabinet-3-id',
                        parent: '',
                        resourceUri: '',
                        slotNumber: -1,
                        state: {
                            assetPresence: 'PRESENT',
                            systemConnection: 'CONNECTED'
                        }
                    }
                },
            ], totalCount: 1
        }
        jest.spyOn(datastore, 'queryAssets').mockResolvedValue(listAssetsResponse as unknown as AssetsResponse)

        const response = await datastore.query(query);
        const data = response.data[0];

        expect(data.fields).toHaveLength(1);
        expect(data.fields[0].name).toEqual('location');
        expect(data.fields[0].values).toEqual(['Cabinet 3']);
    });

    test('should display minionID property', async () => {
        const query = buildListAssetsQuery({
            refId: '',
            type: AssetQueryType.ListAssets,
            filter: ``,
            outputType: OutputType.Properties,
            properties: [AssetFilterPropertiesOption.MinionId],
        });
        const listAssetsResponse = {
            assets: [
                {
                    location: {
                        minionId: 'Latitude_5550--SN-2Y7V954--MAC-A8-59-5F-B0-95-32',
                        parent: '',
                        resourceUri: '',
                        slotNumber: -1,
                        state: {
                            assetPresence: 'PRESENT',
                            systemConnection: 'CONNECTED'
                        }
                    }
                },
            ], totalCount: 1
        }
        jest.spyOn(datastore, 'queryAssets').mockResolvedValue(listAssetsResponse as unknown as AssetsResponse)

        const response = await datastore.query(query);
        const data = response.data[0];

        expect(data.fields).toHaveLength(1);
        expect(data.fields[0].name).toEqual('minionId');
        expect(data.fields[0].values).toEqual(['Latitude_5550--SN-2Y7V954--MAC-A8-59-5F-B0-95-32']);
    });

    test('should display parent property', async () => {
        const query = buildListAssetsQuery({
            refId: '',
            type: AssetQueryType.ListAssets,
            filter: ``,
            outputType: OutputType.Properties,
            properties: [AssetFilterPropertiesOption.ParentName],
        });
        const listAssetsResponse = {
            assets: [
                {
                    location: {
                        minionId: 'Latitude_5550--SN-2Y7V954--MAC-A8-59-5F-B0-95-32',
                        parent: 'HUDEBLT-2Y7V954',
                        resourceUri: 'c39915db-a81d-4710-82e7-14e0e9a95297',
                        slotNumber: -1,
                        state: {
                            assetPresence: 'PRESENT',
                            systemConnection: 'DISCONNECTED'

                        },
                    }
                },
            ], totalCount: 1
        }
        jest.spyOn(datastore, 'queryAssets').mockResolvedValue(listAssetsResponse as unknown as AssetsResponse)

        const response = await datastore.query(query);
        const data = response.data[0];

        expect(data.fields).toHaveLength(1);
        expect(data.fields[0].name).toEqual('parent name');
        expect(data.fields[0].values).toEqual(['HUDEBLT-2Y7V954']);
    });

    test('should display selfCalibrationDate property', async () => {
        const query = buildListAssetsQuery({
            refId: '',
            type: AssetQueryType.ListAssets,
            filter: ``,
            outputType: OutputType.Properties,
            properties: [AssetFilterPropertiesOption.SelfCalibration],
        });
        const listAssetsResponse = {
            assets: [
                {
                    selfCalibration: {
                        temperatureSensors: [],
                        isLimited: false,
                        date: '2016-10-07T13:09:49.000Z'
                    }
                },
            ], totalCount: 1
        }
        jest.spyOn(datastore, 'queryAssets').mockResolvedValue(listAssetsResponse as unknown as AssetsResponse)

        const response = await datastore.query(query);
        const data = response.data[0];

        expect(data.fields).toHaveLength(1);
        expect(data.fields[0].name).toEqual('self calibration');
        expect(data.fields[0].values).toEqual(['2016-10-07T13:09:49.000Z']);
    });

    test('should display externalCalibrationDate property', async () => {
        const query = buildListAssetsQuery({
            refId: '',
            type: AssetQueryType.ListAssets,
            filter: ``,
            outputType: OutputType.Properties,
            properties: [AssetFilterPropertiesOption.ExternalCalibrationDate],
        });
        const listAssetsResponse = {
            assets: [
                {
                    externalCalibration: {
                        temperatureSensors: [
                            {
                                name: "",
                                reading: 35.5480842590332
                            }
                        ],
                        isLimited: false,
                        date: '2016-10-07T13:09:49.000Z',
                        recommendedInterval: 24,
                        nextRecommendedDate: '2018-10-07T13:09:49.000Z',
                        resolvedDueDate: '2018-10-07T13:09:49.000Z',
                        comments: '',
                        entryType: 'AUTOMATIC'
                    }
                },
            ], totalCount: 1
        }
        jest.spyOn(datastore, 'queryAssets').mockResolvedValue(listAssetsResponse as unknown as AssetsResponse)

        const response = await datastore.query(query);
        const data = response.data[0];

        expect(data.fields).toHaveLength(1);
        expect(data.fields[0].name).toEqual('calibration due date');
        expect(data.fields[0].values).toEqual(['2018-10-07T13:09:49.000Z']);
    });

    test('should display keywords property', async () => {
        const query = buildListAssetsQuery({
            refId: '',
            type: AssetQueryType.ListAssets,
            filter: ``,
            outputType: OutputType.Properties,
            properties: [AssetFilterPropertiesOption.Keywords],
        });
        const listAssetsResponse = {
            assets: [
                {
                    keywords: [
                        'keyword0',
                        'keyword1',
                        'keyword2',
                        'keyword3',
                        'keyword4',]
                },
            ], totalCount: 1
        }
        jest.spyOn(datastore, 'queryAssets').mockResolvedValue(listAssetsResponse as unknown as AssetsResponse)

        const response = await datastore.query(query);
        const data = response.data[0];

        expect(data.fields).toHaveLength(1);
        expect(data.fields[0].name).toEqual('keywords');
        expect(data.fields[0].values).toEqual(['keyword0, keyword1, keyword2, keyword3, keyword4']);
    });

    test('should display scan code property', async () => {
        const query = buildListAssetsQuery({
            refId: '',
            type: AssetQueryType.ListAssets,
            filter: ``,
            outputType: OutputType.Properties,
            properties: [AssetFilterPropertiesOption.ScanCode],
        });
        jest.spyOn(datastore, 'queryAssets').mockResolvedValue(mockListAssets as unknown as AssetsResponse)

        const response = await datastore.query(query);
        const data = response.data[0];

        expect(data.fields).toHaveLength(1);
        expect(data.fields[0].name).toEqual('scan code');
        expect(data.fields[0].values).toEqual(['c44750b7-1f22-4fec-b475-73b10e966217']);
    });

    test('should convert workspaceIds to workspace names for workspace field', async () => {
        const query = buildListAssetsQuery({
            refId: '',
            type: AssetQueryType.ListAssets,
            filter: ``,
            outputType: OutputType.Properties,
            properties: [AssetFilterPropertiesOption.Workspace],
        });
        const response = await datastore.query(query);
        const data = response.data[0];

        expect(data.fields).toHaveLength(1);
        expect(data.fields[0].name).toEqual('workspace');
        expect(data.fields[0].values).toEqual(['Default']);
    });

    test('should set field names as expected', async () => {
        const query = buildListAssetsQuery({
            refId: '',
            type: AssetQueryType.ListAssets,
            filter: ``,
            outputType: OutputType.Properties,
            properties: [...Object.values(AssetFilterPropertiesOption)]
        });
        jest.spyOn(datastore, 'queryAssets');

        const response = await datastore.query(query);
        const data = response.data[0];

        expect(data.fields[0].name).toEqual('id');
        expect(data.fields[1].name).toEqual('serial number');
        expect(data.fields[2].name).toEqual('model name');
        expect(data.fields[3].name).toEqual('model number');
        expect(data.fields[4].name).toEqual('vendor name');
        expect(data.fields[5].name).toEqual('vendor number');
        expect(data.fields[6].name).toEqual('name');
        expect(data.fields[7].name).toEqual('asset type');
        expect(data.fields[8].name).toEqual('firmware version');
        expect(data.fields[9].name).toEqual('visa resource name');
        expect(data.fields[10].name).toEqual('part number');
        expect(data.fields[11].name).toEqual('last updated timestamp');
        expect(data.fields[12].name).toEqual('bus type');
        expect(data.fields[13].name).toEqual('is NI asset');
        expect(data.fields[14].name).toEqual('keywords');
        expect(data.fields[15].name).toEqual('properties');
        expect(data.fields[16].name).toEqual('location');
        expect(data.fields[17].name).toEqual('minionId');
        expect(data.fields[18].name).toEqual('parent name');
        expect(data.fields[19].name).toEqual('supports self calibration');
        expect(data.fields[20].name).toEqual('discovery type');
        expect(data.fields[21].name).toEqual('supports self test');
        expect(data.fields[22].name).toEqual('supports reset');
        expect(data.fields[23].name).toEqual('self calibration');
        expect(data.fields[24].name).toEqual('supports external calibration');
        expect(data.fields[25].name).toEqual('calibration due date');
        expect(data.fields[26].name).toEqual('is system controller');
        expect(data.fields[27].name).toEqual('workspace');
        expect(data.fields[28].name).toEqual('calibration status');
        expect(data.fields[29].name).toEqual('scan code');
        expect(data.fields.length).toBe(30);
    })
});
