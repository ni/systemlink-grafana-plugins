import {
  DataFrameDTO,
  DataQueryRequest,
  DataSourceInstanceSettings,
  TestDataSourceResponse,
} from '@grafana/data';
import { BackendSrv, getBackendSrv, getTemplateSrv, TemplateSrv } from '@grafana/runtime';
import { DataSourceBase } from 'core/DataSourceBase';
import {
  ListAssetsQuery,
  AssetQuery,
  AssetQueryType,
  AssetSummaryQuery,
  CalibrationForecastQuery,
} from './types';
import { ListAssetsDataSource } from './components/editors/list-assets/ListAssetsDataSource';
import { CalibrationForecastDataSource } from './components/editors/calibration-forecast/CalibrationForecastDataSource';
import { AssetSummaryDataSource } from './components/editors/asset-summary/AssetSummaryDataSource';
import { defaultAssetQuery, defaultAssetQueryType } from './defaults';

export class AssetDataSource extends DataSourceBase<AssetQuery> {
  private assetSummaryDataSource: AssetSummaryDataSource;
  private calibrationForecastDataSource: CalibrationForecastDataSource;
  private listAssetsDataSource: ListAssetsDataSource;

  constructor(
    readonly instanceSettings: DataSourceInstanceSettings,
    readonly backendSrv: BackendSrv = getBackendSrv(),
    readonly templateSrv: TemplateSrv = getTemplateSrv()
  ) {
    super(instanceSettings, backendSrv, templateSrv);
    this.assetSummaryDataSource = new AssetSummaryDataSource(instanceSettings, backendSrv, templateSrv);
    this.calibrationForecastDataSource = new CalibrationForecastDataSource(instanceSettings, backendSrv, templateSrv);
    this.listAssetsDataSource = new ListAssetsDataSource(instanceSettings, backendSrv, templateSrv);
  }

  baseUrl = this.instanceSettings.url + '/niapm/v1';

  defaultQuery = {
    queryType: defaultAssetQueryType,
    ...defaultAssetQuery
  };

  async runQuery(query: AssetQuery, options: DataQueryRequest): Promise<DataFrameDTO> {
    if (query.queryType === AssetQueryType.AssetSummary) {
      return this.getAssetSummarySource().runQuery(query as AssetSummaryQuery, options);
    }
    else if (query.queryType === AssetQueryType.CalibrationForecast) {
      return this.getCalibrationForecastSource().runQuery(query as CalibrationForecastQuery, options);
    }
    else {
      return this.getListAssetsSource().runQuery(query as ListAssetsQuery, options);
    }
  }

  shouldRunQuery(query: AssetQuery): boolean {
    if (query.queryType === AssetQueryType.AssetSummary) {
      return this.getAssetSummarySource().shouldRunQuery(query as AssetSummaryQuery);
    }
    else if (query.queryType === AssetQueryType.CalibrationForecast) {
      return this.getCalibrationForecastSource().shouldRunQuery(query as CalibrationForecastQuery);
    }
    else {
      return this.getListAssetsSource().shouldRunQuery(query as ListAssetsQuery);
    }
  }

  async testDatasource(): Promise<TestDataSourceResponse> {
    await this.get(this.baseUrl + '/assets?take=1');
    return { status: 'success', message: 'Data source connected and authentication successful!' };
  }

  getAssetSummarySource(): AssetSummaryDataSource {
    return this.assetSummaryDataSource;
  }

  getCalibrationForecastSource(): CalibrationForecastDataSource {
    return this.calibrationForecastDataSource;
  }

  getListAssetsSource(): ListAssetsDataSource {
    return this.listAssetsDataSource;
  }
}
