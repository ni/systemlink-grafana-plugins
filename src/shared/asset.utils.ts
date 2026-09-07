import { DataSourceInstanceSettings } from '@grafana/data';
import { BackendSrv } from '@grafana/runtime';
import {
  QUERY_ASSETS_BATCH_SIZE,
  QUERY_ASSETS_REQUEST_PER_SECOND,
} from './constants/QueryAssets.constants';
import { Asset, AssetProjectionProperties, QueryAssetsResponse } from './types/QueryAssets.types';

export { Asset, AssetProjectionProperties } from './types/QueryAssets.types';

export class AssetUtils {
  private readonly queryAssetsUrl = `${this.instanceSettings.url}/niapm/v1/query-assets`;

  constructor(
    readonly instanceSettings: DataSourceInstanceSettings,
    readonly backendSrv: BackendSrv
  ) {}

  async queryAssetsInBatches(
    ids: string[],
    properties?: AssetProjectionProperties[]
  ): Promise<Asset[]> {
    const projection = this.buildProjection(properties);
    const uniqueIds = [...new Set(ids)];
    const assets: Asset[] = [];
    const remainingIds = [...uniqueIds];

    while (remainingIds.length > 0) {
      const startTime = Date.now();
      const requests: Array<Promise<QueryAssetsResponse>> = [];

      for (
        let request = 0;
        request < QUERY_ASSETS_REQUEST_PER_SECOND && remainingIds.length > 0;
        request++
      ) {
        const idsChunk = remainingIds.splice(0, QUERY_ASSETS_BATCH_SIZE);
        requests.push(
          this.queryAssets(idsChunk, projection).catch(error => {
            // Isolate chunk failures so other chunks still return their assets
            console.error('Error fetching assets for chunk:', error);
            return { assets: [], totalCount: 0 };
          })
        );
      }

      const responses = await Promise.all(requests);
      responses.forEach(response => assets.push(...response.assets));

      const elapsedTime = Date.now() - startTime;
      if (remainingIds.length > 0 && elapsedTime < 1000) {
        await new Promise(resolve => setTimeout(resolve, 1000 - elapsedTime));
      }
    }

    return assets;
  }

  private buildProjection(properties?: AssetProjectionProperties[]): string | undefined {
    return properties && properties.length > 0 ? `new(${properties.join(', ')})` : undefined;
  }

  private async queryAssets(ids: string[], projection?: string): Promise<QueryAssetsResponse> {
    const serializedIds = ids.map(id => JSON.stringify(id)).join(', ');
    const filter = `new[]{${serializedIds}}.Contains(AssetIdentifier)`;
    const body = {
      filter,
      take: ids.length,
      returnCount: true,
      ...(projection && { projection }),
    };

    return this.backendSrv.post<QueryAssetsResponse>(
      this.queryAssetsUrl,
      body,
      { showErrorAlert: false }
    );
  }
}
