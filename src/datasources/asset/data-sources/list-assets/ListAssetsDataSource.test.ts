import {
    getQueryBuilder,
    setupDataSource,
} from "test/fixtures";
import { AssetQueryType } from "../../types/types";
import { ListAssetsDataSource } from "./ListAssetsDataSource";
import { ListAssetsQuery } from "../../types/ListAssets.types";
import { ListAssetsFieldNames } from "../../constants/ListAssets.constants";

let datastore: ListAssetsDataSource;

beforeEach(() => {
    [datastore] = setupDataSource(ListAssetsDataSource);
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
        });

        await datastore.query(query);

        expect(processlistAssetsQuerySpy).toHaveBeenCalledWith(
            expect.objectContaining({
                filter: "(Location.MinionId = \"Location1\" || Location.MinionId = \"Location2\")"
            })
        );
    });
});
