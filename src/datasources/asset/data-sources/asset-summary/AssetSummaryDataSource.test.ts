import {
    getQueryBuilder,
    setupDataSource,
} from "test/fixtures";
import { AssetQueryType } from "../../types/types";
import { AssetSummaryDataSource } from "./AssetSummaryDataSource";
import { AssetSummaryQuery } from "datasources/asset/types/AssetSummaryQuery.types";
import { firstValueFrom } from "rxjs";

let datastore: AssetSummaryDataSource;

beforeEach(() => {
    [datastore] = setupDataSource(AssetSummaryDataSource);
});

const buildAssetSummaryQuery = getQueryBuilder<AssetSummaryQuery>()({
    refId: '',
});

describe('Process summary queries', () => {
    let processSummaryQuerySpy: jest.SpyInstance;

    beforeEach(() => {
        processSummaryQuerySpy = jest.spyOn(datastore, 'processSummaryQuery').mockImplementation();
    });

    test('should process query if query is not hidden', async () => {
        const query = buildAssetSummaryQuery({
            refId: '',
            type: AssetQueryType.AssetSummary,
            hide: false
        });

        await firstValueFrom(datastore.query(query));

        expect(processSummaryQuerySpy).toHaveBeenCalled();
    });

    test('should not process query if query is hidden', async () => {
        const query = buildAssetSummaryQuery({
            refId: '',
            type: AssetQueryType.AssetSummary,
            hide: true
        });

        await firstValueFrom(datastore.query(query));

        expect(processSummaryQuerySpy).not.toHaveBeenCalled();
    });
});
