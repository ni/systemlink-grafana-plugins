import { AssetUtils } from './asset.utils';
import { BackendSrv } from '@grafana/runtime';
import { DataSourceInstanceSettings } from '@grafana/data';
import { AssetProjectionProperties, QueryAssetsResponse } from './types/QueryAssets.types';

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
                        const mockResponse: QueryAssetsResponse = {
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

        it('should build the projection from the provided properties', async () => {
            (backendSrv.post as jest.Mock).mockResolvedValueOnce({ assets: [], totalCount: 0 });

            await assetUtils.queryAssetsInBatches(
                ['1'],
                [AssetProjectionProperties.ID, AssetProjectionProperties.NAME]
            );

            expect(backendSrv.post).toHaveBeenCalledWith(
                `${instanceSettings.url}/niapm/v1/query-assets`,
                {
                    filter: `new[]{"1"}.Contains(AssetIdentifier)`,
                    projection: 'new(id, name)',
                    take: 1,
                    returnCount: true
                },
                { showErrorAlert: false }
            );
        });

        it('should omit the projection field from the request when no properties are provided', async () => {
            (backendSrv.post as jest.Mock).mockResolvedValueOnce({ assets: [], totalCount: 0 });

            await assetUtils.queryAssetsInBatches(['1']);

            const requestBody = (backendSrv.post as jest.Mock).mock.calls[0][1];

            expect(requestBody).toStrictEqual({
                filter: `new[]{"1"}.Contains(AssetIdentifier)`,
                take: 1,
                returnCount: true
            });
        });

        it('should escape quotes and backslashes in ids', async () => {
            (backendSrv.post as jest.Mock).mockResolvedValueOnce({ assets: [], totalCount: 0 });

            await assetUtils.queryAssetsInBatches(['asset"1', 'asset\\2']);

            expect(backendSrv.post).toHaveBeenCalledWith(
                `${instanceSettings.url}/niapm/v1/query-assets`,
                {
                    filter: 'new[]{"asset\\"1", "asset\\\\2"}.Contains(AssetIdentifier)',
                    take: 2,
                    returnCount: true
                },
                { showErrorAlert: false }
            );
        });

        it('should return an empty array without calling backendSrv.post when ids is empty',
            async () => {
            const result = await assetUtils.queryAssetsInBatches([]);

            expect(result).toEqual([]);
            expect(backendSrv.post).not.toHaveBeenCalled();
        });

        it('should deduplicate ids before querying assets', async () => {
            (backendSrv.post as jest.Mock).mockResolvedValueOnce({ assets: [], totalCount: 0 });

            await assetUtils.queryAssetsInBatches(['1', '1', '2']);

            expect(backendSrv.post).toHaveBeenCalledTimes(1);
            expect(backendSrv.post).toHaveBeenCalledWith(
                `${instanceSettings.url}/niapm/v1/query-assets`,
                {
                    filter: `new[]{"1", "2"}.Contains(AssetIdentifier)`,
                    take: 2,
                    returnCount: true
                },
                { showErrorAlert: false }
            );
        });

        it('should return assets from other chunks when one chunk request fails', async () => {
            jest.spyOn(console, 'error').mockImplementation(() => {});
            (backendSrv.post as jest.Mock)
                .mockResolvedValueOnce({
                    assets: [{ id: '1', name: 'Asset 1', serialNumber: 'SN1' }],
                    totalCount: 1
                })
                .mockRejectedValueOnce(new Error('network error'));
            const ids = [
                ...Array.from({ length: 10 }, (_, i) => `${i + 1}`),
                ...Array.from({ length: 10 }, (_, i) => `${i + 11}`)
            ];

            const result = await assetUtils.queryAssetsInBatches(ids);

            expect(backendSrv.post).toHaveBeenCalledTimes(2);
            expect(result).toEqual([{ id: '1', name: 'Asset 1', serialNumber: 'SN1' }]);
            expect(console.error).toHaveBeenCalledWith(
                'Error fetching assets for chunk:',
                expect.objectContaining({
                    message: 'An error occurred while querying assets: Error: network error'
                })
            );
            (console.error as jest.Mock).mockRestore();
        });
    });
});
