import { DataSourceInstanceSettings } from "@grafana/data";
import { BackendSrv } from "@grafana/runtime";
import { QueryResponse } from "core/types";
import { queryUntilComplete } from "core/utils";
import { QUERY_PRODUCTS_MAX_TAKE, QUERY_PRODUCTS_REQUEST_PER_SECOND } from "./constants/QueryProducts.constants";
import { Properties, QueryProductResponse } from "datasources/products/types";
import { ProductPartNumberAndName } from "./types/QueryProducts.types";


export class ProductUtils {
    private static _productCache?: Promise<Map<string, ProductPartNumberAndName>>;

    private readonly queryProductsUrl = `${this.instanceSettings.url}/nitestmonitor/v2/query-products`;

    constructor(
        readonly instanceSettings: DataSourceInstanceSettings,
        readonly backendSrv: BackendSrv
    ) {}

    async getProductNamesAndPartNumbers(): Promise<Map<string, ProductPartNumberAndName>> {
        if (!ProductUtils._productCache) {
            ProductUtils._productCache = this.loadProducts();
        }
        return await ProductUtils._productCache;
    }

    private async loadProducts(): Promise<Map<string, ProductPartNumberAndName>> {
        try {
            const products = await this.queryProductsInBatches();
            const productMap = new Map<string, ProductPartNumberAndName>();
            if (products) {
                products.forEach(product => productMap.set(product.partNumber, product));
            }
            return productMap;
        } catch (error) {
            console.error('Error in loading products:', error);
            return new Map<string, ProductPartNumberAndName>();
        }
    }

    private async queryProductsInBatches(): Promise<ProductPartNumberAndName[]> {
        const queryRecord = async (currentTake: number, token?: string): Promise<QueryResponse<ProductPartNumberAndName>> => {
            const response = await this.queryProducts(currentTake, token);
            return {
                data: response.products as ProductPartNumberAndName[],
                continuationToken: response.continuationToken,
                totalCount: response.totalCount
            };
        };
        const batchQueryConfig = {
            maxTakePerRequest: QUERY_PRODUCTS_MAX_TAKE,
            requestsPerSecond: QUERY_PRODUCTS_REQUEST_PER_SECOND
        };
        const response = await queryUntilComplete(queryRecord, batchQueryConfig);

        return response.data;
    }

    async queryProducts(
        take?: number,
        continuationToken?: string,
        projection = [Properties.id, Properties.partNumber, Properties.name],
        descending = false,
        returnCount = true
    ): Promise<QueryProductResponse> {
        try {
            const response = await this.backendSrv.post<QueryProductResponse>(this.queryProductsUrl, {
                descending,
                projection,
                take,
                continuationToken,
                returnCount
            });
            return response;
        } catch (error) {
            throw new Error(`An error occurred while querying products: ${error} `);
        }
    }
}
