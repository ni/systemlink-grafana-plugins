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

    test('should transform LOCATION field with single value and cache hit', async () => {
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

    test('should transform LOCATION field with multiple values and cache hit', async () => {
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
});

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
        });
        const queryAssetSpy = jest.spyOn(datastore, 'queryAssets');

        await datastore.query(query);

        expect(queryAssetSpy).toHaveBeenCalledWith('', 1000, true, Object.values(AssetFilterPropertiesOption));
    })

    test('should call queryAsset with returnCount set to false when outpuType is set to Properties', async () => {
        const query = buildListAssetsQuery({
            refId: '',
            type: AssetQueryType.ListAssets,
            filter: ``,
            outputType: OutputType.Properties,
        });
        const queryAssetSpy = jest.spyOn(datastore, 'queryAssets');

        await datastore.query(query);

        expect(queryAssetSpy).toHaveBeenCalledWith('', 1000, false, Object.values(AssetFilterPropertiesOption));
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
        });
        const queryAssetSpy = jest.spyOn(datastore, 'queryAssets');

        await datastore.query(query);

        expect(queryAssetSpy).toHaveBeenCalledWith('', 1000, false, Object.values(AssetFilterPropertiesOption));
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
});
