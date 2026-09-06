import { AssetUtils } from './asset.utils';
import { BackendSrv } from '@grafana/runtime';
import { DataSourceInstanceSettings } from '@grafana/data';
import { QueryAssetNameResponse } from './types/QueryAssets.types';

describe('AssetUtils', () => {
    let instanceSettings: DataSourceInstanceSettings;
    let backendSrv: BackendSrv;
    let assetUtils: AssetUtils;

    beforeEach(() => {
        instanceSettings = { url: 'http://localhost' } as DataSourceInstanceSettings;
        backendSrv = {
            post: jest.fn()
        } as unknown as BackendSrv;
        assetUtils = new AssetUtils(instanceSettings, backendSrv);
    });

    describe('queryAssetsInBatches', () => {
        it('should query all assets in a single request when ids length is less than QUERY_ASSETS_BATCH_SIZE', async () => {
            const mockResponse: QueryAssetNameResponse = {
                assets: [
                    { id: '1', name: 'Asset 1', serialNumber: 'SN1' },
                    { id: '2', name: 'Asset 2', serialNumber: 'SN2' }
                ],
                totalCount: 2
            };

            (backendSrv.post as jest.Mock).mockResolvedValueOnce(mockResponse);

            const ids = ['1', '2'];
            const result = await assetUtils.queryAssetsInBatches(ids);

            expect(result).toEqual([
                { id: '1', name: 'Asset 1', serialNumber: 'SN1' },
                { id: '2', name: 'Asset 2', serialNumber: 'SN2' }
            ]);
        });

        it('should query assets in multiple requests when ids exceed the batch size', async () => {
            (backendSrv.post as jest.Mock)
                .mockResolvedValueOnce({
                    assets: [],
                    totalCount: 100
                })
                .mockResolvedValueOnce({
                    assets: [],
                    totalCount: 1
                });

            const ids = Array.from({ length: 101 }, (_, i) => `${i + 1}`);
            const idsCopy = [...ids]
            const result = await assetUtils.queryAssetsInBatches(ids);

            expect(backendSrv.post).toHaveBeenCalledTimes(2);
            const mockRequest1 = {
                filter: `new[]{${idsCopy.slice(0, 100).map(id => `"${id}"`).join(', ')}}.Contains(AssetIdentifier)`,
                take: 100,
                returnCount: true
            }
            const mockRequest2 = {
                filter: `new[]{${idsCopy.slice(100).map(id => `"${id}"`).join(', ')}}.Contains(AssetIdentifier)`,
                take: 1,
                returnCount: true
            }
            expect(backendSrv.post).toHaveBeenNthCalledWith(1, `${instanceSettings.url}/niapm/v1/query-assets`, mockRequest1, { showErrorAlert: false });
            expect(backendSrv.post).toHaveBeenNthCalledWith(2, `${instanceSettings.url}/niapm/v1/query-assets`, mockRequest2, { showErrorAlert: false });

            expect(result).toEqual([]);
        });

    });
});
