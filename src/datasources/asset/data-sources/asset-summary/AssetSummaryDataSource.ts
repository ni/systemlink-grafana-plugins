import { DataQueryRequest, DataFrameDTO, DataSourceInstanceSettings } from '@grafana/data';
import { BackendSrv, getBackendSrv, getTemplateSrv, TemplateSrv } from '@grafana/runtime';

import { AssetSummaryResponse } from 'datasources/asset/types/AssetSummaryQuery.types';
import { AssetDataSourceBase } from '../AssetDataSourceBase';
import { AssetDataSourceOptions, AssetQuery, AssetQueryType } from '../../types/types';
import { assetSummaryFields } from '../../constants/AssetSummaryQuery.constants';
import { QueryBuilderType } from 'datasources/asset/constants/constants';
export class AssetSummaryDataSource extends AssetDataSourceBase
{
    constructor (
        readonly instanceSettings: DataSourceInstanceSettings<AssetDataSourceOptions>,
        readonly backendSrv: BackendSrv = getBackendSrv(),
        readonly templateSrv: TemplateSrv = getTemplateSrv()
    )
    {
        super(instanceSettings, backendSrv, templateSrv);
    }

    baseUrl = this.instanceSettings.url + '/niapm/v1';

    defaultQuery = {
        type: AssetQueryType.AssetSummary,
        queryBuilderType: QueryBuilderType.Simple,
    };

    async runQuery (query: AssetQuery, options: DataQueryRequest): Promise<DataFrameDTO>
    {
        return this.processSummaryQuery(query as AssetQuery);
    }

    shouldRunQuery (_: AssetQuery): boolean
    {
        return true;
    }

    async processSummaryQuery (query: AssetQuery)
    {
        const assets: AssetSummaryResponse = await this.getAssetSummary();

        return {
            refId: query.refId,
            fields: [
                { name: assetSummaryFields.TOTAL, values: [ assets.total ] },
                { name: assetSummaryFields.ACTIVE, values: [ assets.active ] },
                { name: assetSummaryFields.NOT_ACTIVE, values: [ assets.notActive ] },
                { name: assetSummaryFields.APPROACHING_DUE_DATE, values: [ assets.approachingRecommendedDueDate ] },
                { name: assetSummaryFields.PAST_DUE_DATE, values: [ assets.pastRecommendedDueDate ] }
            ]
        };
    }

    async getAssetSummary (): Promise<AssetSummaryResponse>
    {
        try
        {
            return await this.get<AssetSummaryResponse>(this.baseUrl + '/asset-summary');
        } catch (error)
        {
            throw new Error(`An error occurred while getting asset summary: ${ error }`);
        }
    }
}
