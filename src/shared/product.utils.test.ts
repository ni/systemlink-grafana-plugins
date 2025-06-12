import { BackendSrv } from '@grafana/runtime';
import { DataSourceInstanceSettings } from '@grafana/data';
import { ProductUtils } from './product.utils';
import { queryUntilComplete } from 'core/utils';
import { ProductPartNumberAndName } from './types/QueryProducts.types';

const products: ProductPartNumberAndName[] = [
    {
        partNumber: 'part-number-1',
        name: 'Product 1',
    },
    {
        partNumber: 'part-number-2',
        name: 'Product 2',
    }
];

jest.mock('core/utils', () => ({
    queryUntilComplete: jest.fn(() => {
        return Promise.resolve({ data: products, totalCount: 2 });
    })
}));

describe('ProductUtils', () => {
    let instanceSettings: DataSourceInstanceSettings;
    let backendSrv: BackendSrv;
    let productUtils: ProductUtils;

    beforeEach(() => {
        instanceSettings = { url: 'http://localhost' } as DataSourceInstanceSettings;
        backendSrv = {
            post: jest.fn()
        } as unknown as BackendSrv;

        productUtils = new ProductUtils(instanceSettings, backendSrv);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should load products and cache them', async () => {
        const result = await productUtils.getProductNamesAndPartNumbers();

        expect(result.size).toEqual(products.length);
        expect(result.get('part-number-1')).toEqual(products[0]);
        expect(result.get('part-number-2')).toEqual(products[1]);
    });

    it('should handle errors when loading products', async () => {
        (ProductUtils as any)['_productCache'] = undefined;
        jest.spyOn(console, 'error').mockImplementation(() => {});
        const error = new Error('Failed to fetch products');
        (queryUntilComplete as jest.Mock)
            .mockImplementationOnce(() => {
                return Promise.reject(error);
            });

        const result = await productUtils.getProductNamesAndPartNumbers();

        expect(console.error).toHaveBeenCalledTimes(1);
        expect(console.error).toHaveBeenCalledWith('Error in loading products:', error);
        expect(result).toEqual(new Map<string, ProductPartNumberAndName>());
    });

    it('should return cached products if already loaded', async () => {
        (ProductUtils as any)['_productCache'] = undefined;
        await productUtils.getProductNamesAndPartNumbers();
        jest.clearAllMocks();

        const cachedResult = await productUtils.getProductNamesAndPartNumbers();

        expect(queryUntilComplete).not.toHaveBeenCalled();
        expect(cachedResult.size).toEqual(products.length);
        expect(cachedResult.get('part-number-1')).toEqual(products[0]);
        expect(cachedResult.get('part-number-2')).toEqual(products[1]);
    });
});
