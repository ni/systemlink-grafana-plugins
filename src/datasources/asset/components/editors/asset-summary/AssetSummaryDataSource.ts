import { DataQueryRequest, DataFrameDTO, DataSourceInstanceSettings } from '@grafana/data';
import { BackendSrv, getBackendSrv, getTemplateSrv, TemplateSrv } from '@grafana/runtime';

import { AssetSummaryQuery } from 'datasources/asset/types/AssetSummaryQuery.types';
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
            { name: 'Total', values: [assets.total] },
            { name: 'Active', values: [assets.active] },
            { name: 'Not active', values: [assets.notActive] },
            { name: 'Approaching due date', values: [assets.approachingRecommendedDueDate] },
            { name: 'Past due date', values: [assets.pastRecommendedDueDate] }
        ];
        return result;
    }

    async getAssetSummary(): Promise<AssetSummaryQuery> {
        try {
            let response = await this.get<AssetSummaryQuery>(this.baseUrl + '/asset-summary');
            return response;
        } catch (error) {
            throw new Error(`An error occurred while getting asset summary: ${error}`);
        }
    }
}
