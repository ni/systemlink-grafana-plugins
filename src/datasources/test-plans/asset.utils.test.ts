import { AssetUtils } from './asset.utils';
import { BackendSrv } from '@grafana/runtime';
import { DataSourceInstanceSettings } from '@grafana/data';
import { QueryAssetNameResponse } from './types';

jest.mock('./constants/QueryAssets.constants', () => ({
    QUERY_ASSETS_BATCH_SIZE: 10,
    QUERY_ASSETS_REQUEST_PER_SECOND: 2
}));

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

        it('should query assets in multiple requests when ids length is greater than QUERY_ASSETS_BATCH_SIZE', async () => {
            (backendSrv.post as jest.Mock)
                .mockResolvedValueOnce({
                    assets: [],
                    totalCount: 10
                })
                .mockResolvedValueOnce({
                    assets: [],
                    totalCount: 10
                });

            const ids = Array.from({ length: 20 }, (_, i) => `${i + 1}`);
            const idsCopy = [...ids]
            const result = await assetUtils.queryAssetsInBatches(ids);

            expect(backendSrv.post).toHaveBeenCalledTimes(2);
            const mockRequest1 = {
                filter: `new[]{${idsCopy.slice(0, 10).map(id => `"${id}"`).join(', ')}}.Contains(AssetIdentifier)`,
                take: 10,
                returnCount: true
            }
            const mockRequest2 = {
                filter: `new[]{${idsCopy.slice(10).map(id => `"${id}"`).join(', ')}}.Contains(AssetIdentifier)`,
                take: 10,
                returnCount: true
            }
            expect(backendSrv.post).toHaveBeenNthCalledWith(1, `${instanceSettings.url}/niapm/v1/query-assets`, mockRequest1, { showErrorAlert: false });
            expect(backendSrv.post).toHaveBeenNthCalledWith(2, `${instanceSettings.url}/niapm/v1/query-assets`, mockRequest2, { showErrorAlert: false });

            expect(result).toEqual([]);
        });

        it('should delay between batches if requests exceed QUERY_ASSETS_REQUEST_PER_SECOND', async () => {
            jest.useFakeTimers();
            (backendSrv.post as jest.Mock)
                .mockResolvedValueOnce({
                    assets: [],
                    totalCount: 10
                })
                .mockResolvedValueOnce({
                    assets: [],
                    totalCount: 10
                })
                .mockResolvedValueOnce({
                    assets: [],
                    totalCount: 10
                });

            const ids = Array.from({ length: 30 }, (_, i) => `${i + 1}`);
            const result = assetUtils.queryAssetsInBatches(ids);
            jest.advanceTimersByTime(1000);
            await result;

            expect(backendSrv.post).toHaveBeenCalledTimes(3);
            jest.useRealTimers();
        });
    });
});
