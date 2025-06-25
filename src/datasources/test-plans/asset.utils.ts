import { DataSourceInstanceSettings } from "@grafana/data";
import { BackendSrv } from "@grafana/runtime";
import { QUERY_ASSETS_BATCH_SIZE, QUERY_ASSETS_REQUEST_PER_SECOND } from "./constants/QueryAssets.constants";
import { Asset, QueryAssetNameResponse } from "./types";

export class AssetUtils {
    private readonly queryAssetsUrl = `${this.instanceSettings.url}/niapm/v1/query-assets`;

    constructor(
        readonly instanceSettings: DataSourceInstanceSettings,
        readonly backendSrv: BackendSrv
    ) {}

    async queryAssetsInBatches(ids: string[]): Promise<Asset[]> {
        const queryRecord = async (idsChunk: string[]): Promise<QueryAssetNameResponse> => {
            return await this.queryAssets(idsChunk, idsChunk.length);
        };

        const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
        const response: Asset[] = [];

        while (ids.length > 0) {
            const start = Date.now();
            const promises: Array<Promise<void>> = [];

            for (let i = 0; i < QUERY_ASSETS_REQUEST_PER_SECOND && ids.length > 0; i++) {
                const idsToQuery = ids.splice(0, QUERY_ASSETS_BATCH_SIZE);

                const promise = queryRecord(idsToQuery).then(result => {
                    response.push(...result.assets);
                }).catch(error => {
                    console.error(`Error fetching assets for chunk:`, error);
                });

                promises.push(promise);
            }

            await Promise.all(promises);

            const elapsed = Date.now() - start;
            if (ids.length > 0 && elapsed < 1000) {
                await delay(1000 - elapsed);
            }
        }

        return response;
    }

    private async queryAssets(ids: string[], take: number): Promise<QueryAssetNameResponse> {
        const filter = `new[]{${ids.map(id => `"${id}"`).join(', ')}}.Contains(AssetIdentifier)`;
        const body = {
            filter,
            take,
            returnCount: true
        };
        try {
            let response = await this.backendSrv.post<QueryAssetNameResponse>(
                this.queryAssetsUrl,
                body,
                { showErrorAlert: false }
            );
            return response;
        } catch (error) {
            throw new Error(`An error occurred while querying assets: ${error}`);
        }
    }
}
