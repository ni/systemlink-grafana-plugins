import { DataQueryRequest, DataFrameDTO, DataSourceInstanceSettings } from '@grafana/data';
import { AssetDataSourceOptions, AssetQuery, AssetQueryType } from '../../../types/types';
import { BackendSrv, getBackendSrv, getTemplateSrv, TemplateSrv } from '@grafana/runtime';
import { AssetDataSourceBase } from '../AssetDataSourceBase';

export class CalibrationForecastDataSource extends AssetDataSourceBase {
    constructor(
        readonly instanceSettings: DataSourceInstanceSettings<AssetDataSourceOptions>,
        readonly backendSrv: BackendSrv = getBackendSrv(),
        readonly templateSrv: TemplateSrv = getTemplateSrv()
    ) {
        super(instanceSettings, backendSrv, templateSrv);
    }

    baseUrl = this.instanceSettings.url + '/niapm/v1';

    defaultQuery = {
        queryType: AssetQueryType.CalibrationForecast,
    };

    runQuery(query: AssetQuery, options: DataQueryRequest): Promise<DataFrameDTO> {
        throw new Error("Method not implemented.");
    }
    shouldRunQuery(query: AssetQuery): boolean {
        throw new Error("Method not implemented.");
    }
}
