import {
  DataFrameDTO,
  DataQueryRequest,
  DataSourceInstanceSettings,
  LegacyMetricFindQueryOptions,
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
import { QUERY_LIMIT } from './constants/constants';
import { transformComputedFieldsQuery } from 'core/query-builder.utils';
import { AssetVariableQuery } from './types/AssetVariableQuery.types';

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
    type: AssetQueryType.None,
  };

  async runQuery(query: AssetQuery, options: DataQueryRequest): Promise<DataFrameDTO> {
    if (query.type === AssetQueryType.AssetSummary) {
      return this.getAssetSummarySource().runQuery(query as AssetSummaryQuery, options);
    }
    if (query.type === AssetQueryType.CalibrationForecast) {
      return this.getCalibrationForecastSource().runQuery(query as CalibrationForecastQuery, options);
    }
    if (query.type === AssetQueryType.ListAssets) {
      return this.getListAssetsSource().runQuery(query as ListAssetsQuery, options);
    }
    throw new Error('Unknown query type');
  }

  shouldRunQuery(query: AssetQuery): boolean {
    if (query.type === AssetQueryType.AssetSummary) {
      return this.getAssetSummarySource().shouldRunQuery(query as AssetSummaryQuery);
    }
    if (query.type === AssetQueryType.CalibrationForecast) {
      return this.getCalibrationForecastSource().shouldRunQuery(query as CalibrationForecastQuery);
    }
    if (query.type === AssetQueryType.ListAssets) {
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

  async metricFindQuery(query: AssetVariableQuery, options: LegacyMetricFindQueryOptions): Promise<MetricFindValue[]> {
    let assetFilter = query?.filter ?? '';
    assetFilter = transformComputedFieldsQuery(
      this.templateSrv.replace(assetFilter, options.scopedVars),
      this.listAssetsDataSource.assetComputedDataFields,
      this.listAssetsDataSource.queryTransformationOptions
    );
    const assetsResponse: AssetModel[] = await this.listAssetsDataSource.queryAssets(assetFilter, QUERY_LIMIT);
    return assetsResponse.map(this.getAssetNameForMetricQuery);
  }

  private getAssetNameForMetricQuery(asset: AssetModel): MetricFindValue {
    let assetName = asset.name;
    const vendor = asset.vendorName ? asset.vendorName : asset.vendorNumber;
    const model = asset.modelName ? asset.modelName : asset.modelNumber;
    const serial = asset.serialNumber;

    if(!assetName) {
      assetName = `Vendor: ${vendor} - Model: ${model} - Serial: ${serial}`;
    }

    return {
      text: assetName,
      value: `Assets.${vendor}.${model}.${asset.serialNumber}`,
    };
  }
}
