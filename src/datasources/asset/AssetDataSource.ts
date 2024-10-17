import {
  DataFrameDTO,
  DataQueryRequest,
  DataSourceInstanceSettings,
  MetricFindValue,
  TestDataSourceResponse,
} from '@grafana/data';
import { BackendSrv, getBackendSrv, getTemplateSrv, TemplateSrv } from '@grafana/runtime';
import { DataSourceBase } from 'core/DataSourceBase';
import {
  AssetDataSourceOptions,
  AssetQuery,
  AssetQueryType,
} from './types/types';
import { CalibrationForecastDataSource } from './data-sources/calibration-forecast/CalibrationForecastDataSource';
import { AssetSummaryQuery } from './types/AssetSummaryQuery.types';
import { CalibrationForecastQuery } from './types/CalibrationForecastQuery.types';
import { ListAssetsQuery } from './types/ListAssets.types';
import { ListAssetsDataSource } from './data-sources/list-assets/ListAssetsDataSource';
import { AssetSummaryDataSource } from './data-sources/asset-summary/AssetSummaryDataSource';
import { AssetModel } from 'datasources/asset-common/types';

export class AssetDataSource extends DataSourceBase<AssetQuery, AssetDataSourceOptions> {
  private assetSummaryDataSource: AssetSummaryDataSource;
  private calibrationForecastDataSource: CalibrationForecastDataSource;
  private listAssetsDataSource: ListAssetsDataSource;

  constructor(
    readonly instanceSettings: DataSourceInstanceSettings<AssetDataSourceOptions>,
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
    queryType: AssetQueryType.None,
  };

  async runQuery(query: AssetQuery, options: DataQueryRequest): Promise<DataFrameDTO> {
    if (query.queryType === AssetQueryType.AssetSummary) {
      return this.getAssetSummarySource().runQuery(query as AssetSummaryQuery, options);
    }
    if (query.queryType === AssetQueryType.CalibrationForecast) {
      return this.getCalibrationForecastSource().runQuery(query as CalibrationForecastQuery, options);
    }
    if (query.queryType === AssetQueryType.ListAssets) {
      return this.getListAssetsSource().runQuery(query as ListAssetsQuery, options);
    }
    throw new Error('Unknown query type');
  }

  shouldRunQuery(query: AssetQuery): boolean {
    if (query.queryType === AssetQueryType.AssetSummary) {
      return this.getAssetSummarySource().shouldRunQuery(query as AssetSummaryQuery);
    }
    if (query.queryType === AssetQueryType.CalibrationForecast) {
      return this.getCalibrationForecastSource().shouldRunQuery(query as CalibrationForecastQuery);
    }
    if (query.queryType === AssetQueryType.ListAssets) {
      return this.getListAssetsSource().shouldRunQuery(query as ListAssetsQuery);
    }
    return false;
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

  async metricFindQuery(query: AssetQuery): Promise<MetricFindValue[]> {
    console.log(query);
    const assetFilter = query as ListAssetsQuery;
    const assetsResponse: AssetModel[] = await this.getListAssetsSource().queryAssets(assetFilter?.filter ?? '', 1000);
    return assetsResponse.map((asset: AssetModel) => ({ text: asset.name, value: `Asset.${asset.vendorName}.${asset.modelName}.${asset.serialNumber}` }));
  }
}
