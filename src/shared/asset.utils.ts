import { DataSourceInstanceSettings } from '@grafana/data';
import { BackendSrv } from '@grafana/runtime';
import {
  QUERY_ASSETS_BATCH_SIZE,
  QUERY_ASSETS_REQUEST_PER_SECOND,
} from './constants/QueryAssets.constants';
import { Asset, AssetProjectionProperties, QueryAssetNameResponse } from './types/QueryAssets.types';

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
      const requests: Array<Promise<QueryAssetNameResponse>> = [];

      for (
        let request = 0;
        request < QUERY_ASSETS_REQUEST_PER_SECOND && remainingIds.length > 0;
        request++
      ) {
        const idsChunk = remainingIds.splice(0, QUERY_ASSETS_BATCH_SIZE);
        requests.push(this.queryAssets(idsChunk, projection));
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

  private async queryAssets(ids: string[], projection?: string): Promise<QueryAssetNameResponse> {
    const serializedIds = ids.map(id => JSON.stringify(id)).join(', ');
    const filter = `new[]{${serializedIds}}.Contains(AssetIdentifier)`;
    return this.backendSrv.post<QueryAssetNameResponse>(
      this.queryAssetsUrl,
      {
        filter,
        projection,
        take: ids.length,
        returnCount: true,
      },
      { showErrorAlert: false }
    );
  }
}
