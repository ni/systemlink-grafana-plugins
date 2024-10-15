import { DataQueryRequest, DataFrameDTO, DataSourceInstanceSettings } from '@grafana/data';
import { BackendSrv, getBackendSrv, getTemplateSrv, TemplateSrv } from '@grafana/runtime';

import { AssetSummaryQuery } from 'datasources/asset/types/AssetSummaryQuery.types';
import { assetSummaryFields } from 'datasources/asset-calibration/constants';
import { AssetQuery } from '../../../types/types';
import { AssetDataSourceBase } from '../AssetDataSourceBase';

export class AssetSummaryDataSource extends AssetDataSourceBase {
    constructor(
        readonly instanceSettings: DataSourceInstanceSettings,
        readonly backendSrv: BackendSrv = getBackendSrv(),
        readonly templateSrv: TemplateSrv = getTemplateSrv()
    ) {
        super(instanceSettings, backendSrv, templateSrv);
    }

    baseUrl = this.instanceSettings.url + '/niapm/v1';

    defaultQuery = {
    };

    async runQuery(query: AssetQuery, options: DataQueryRequest): Promise<DataFrameDTO> {
        return this.processMetadataQuery(query as AssetQuery);
    }

    shouldRunQuery(_: AssetQuery): boolean {
        return true;
    }

    async processMetadataQuery(query: AssetQuery) {
        const result: DataFrameDTO = { refId: query.refId, fields: [] };
        const assets: AssetSummaryQuery = await this.getAssetSummary();

        result.fields = [
            { name: assetSummaryFields.TOTAL, values: [assets.total] },
            { name: assetSummaryFields.ACTIVE, values: [assets.active] },
            { name: assetSummaryFields.NOT_ACTIVE, values: [assets.notActive] },
            { name: assetSummaryFields.APPROACHING_DUE_DATE, values: [assets.approachingRecommendedDueDate] },
            { name: assetSummaryFields.PAST_DUE_DATE, values: [assets.pastRecommendedDueDate] }
        ];
        return result;
    }

    async getAssetSummary(): Promise<AssetSummaryQuery> {
        return await this.get<AssetSummaryQuery>(this.baseUrl + '/asset-summary');
    }
}
