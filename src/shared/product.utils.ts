import { DataSourceInstanceSettings } from "@grafana/data";
import { BackendSrv } from "@grafana/runtime";
import { QueryResponse } from "core/types";
import { queryUntilComplete } from "core/utils";
import { QUERY_PRODUCTS_MAX_TAKE, QUERY_PRODUCTS_REQUEST_PER_SECOND } from "./constants/QueryProducts.constants";
import { ProductResponseProperties, Properties, QueryProductResponse } from "datasources/products/types";


export class ProductUtils {
    private _productCache: Promise<Map<string, ProductResponseProperties>> | null = null;

    private readonly queryProductsUrl = `${this.instanceSettings.url}/nitestmonitor/v2/query-products`;

    constructor(
        readonly instanceSettings: DataSourceInstanceSettings,
        readonly backendSrv: BackendSrv
    ) {
        this.loadProducts();
    }

    get productsCache(): Promise<Map<string, ProductResponseProperties>> {
        return this._productCache ?? this.loadProducts();
    }

    private async loadProducts(): Promise<Map<string, ProductResponseProperties>> {
        if (this._productCache) {
            return this._productCache;
        }

        this._productCache = this.queryProductsInBatches()
            .then(products => {
                const productMap = new Map<string, ProductResponseProperties>();
                if (products) {
                    products.forEach(product => productMap.set(product.partNumber, product));
                }
                return productMap;
            })
            .catch(error => {
                console.error('Error in loading products:', error);
                return new Map<string, ProductResponseProperties>();
            });

        return this._productCache;
    }

    private async queryProductsInBatches(): Promise<ProductResponseProperties[]> {
        const queryRecord = async (currentTake: number, token?: string): Promise<QueryResponse<ProductResponseProperties>> => {
            const response = await this.queryProducts(currentTake, token);
            return {
                data: response.products,
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
        descending = false,
        returnCount = true
    ): Promise<QueryProductResponse> {
        try {
            const response = await this.backendSrv.post<QueryProductResponse>(this.queryProductsUrl, {
                descending,
                projection: [Properties.partNumber, Properties.name],
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
