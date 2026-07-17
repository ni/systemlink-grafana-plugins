import { DataSourceInstanceSettings } from '@grafana/data';
import { BackendSrv } from '@grafana/runtime';

const QUERY_ASSETS_BATCH_SIZE = 100;
const QUERY_ASSETS_REQUEST_PER_SECOND = 5;

export interface AssetNameEntry {
  id: string;
  name: string;
}

interface QueryAssetsResponse {
  assets: AssetNameEntry[];
  totalCount: number;
}

export class AssetUtils {
  private readonly queryAssetsUrl = `${this.instanceSettings.url}/niapm/v1/query-assets`;

  constructor(
    readonly instanceSettings: DataSourceInstanceSettings,
    readonly backendSrv: BackendSrv
  ) {}

  async queryAssetsInBatches(ids: string[]): Promise<Map<string, string>> {
    const uniqueIds = [...new Set(ids.filter(Boolean))];
    if (uniqueIds.length === 0) {
      return new Map();
    }

    const nameMap = new Map<string, string>();
    const remaining = [...uniqueIds];

    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    while (remaining.length > 0) {
      const start = Date.now();
      const promises: Array<Promise<void>> = [];

      for (let i = 0; i < QUERY_ASSETS_REQUEST_PER_SECOND && remaining.length > 0; i++) {
        const chunk = remaining.splice(0, QUERY_ASSETS_BATCH_SIZE);

        const promise = this.queryAssets(chunk).then(result => {
          for (const asset of result.assets) {
            nameMap.set(asset.id, asset.name);
          }
        }).catch(error => {
          console.error('Error fetching asset names for chunk:', error);
        });

        promises.push(promise);
      }

      await Promise.all(promises);

      const elapsed = Date.now() - start;
      if (remaining.length > 0 && elapsed < 1000) {
        await delay(1000 - elapsed);
      }
    }

    return nameMap;
  }

  private async queryAssets(ids: string[]): Promise<QueryAssetsResponse> {
    const filter = `new[]{${ids.map(id => `"${id}"`).join(', ')}}.Contains(AssetIdentifier)`;
    const body = {
      filter,
      take: ids.length,
      returnCount: true,
    };
    return await this.backendSrv.post<QueryAssetsResponse>(
      this.queryAssetsUrl,
      body,
      { showErrorAlert: false }
    );
  }
}
