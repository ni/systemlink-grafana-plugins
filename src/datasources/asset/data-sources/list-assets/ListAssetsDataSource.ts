import { DataQueryRequest, DataFrameDTO, DataSourceInstanceSettings } from '@grafana/data';
import { BackendSrv, getBackendSrv, getTemplateSrv, TemplateSrv } from '@grafana/runtime';
import { AssetDataSourceBase } from '../AssetDataSourceBase';
import { AssetDataSourceOptions, AssetQuery, AssetQueryType } from '../../types/types';
import { ListAssetsQuery, OutputType, QueryListAssetRequestBody } from '../../types/ListAssets.types';
import { AssetModel, AssetsResponse } from '../../../asset-common/types';
import { getWorkspaceName } from '../../../../core/utils';
import { transformComputedFieldsQuery } from '../../../../core/query-builder.utils';
import { QUERY_LIMIT } from 'datasources/asset/constants/constants';

export class ListAssetsDataSource extends AssetDataSourceBase {
  private dependenciesLoadedPromise: Promise<void>;

  constructor(
    readonly instanceSettings: DataSourceInstanceSettings<AssetDataSourceOptions>,
    readonly backendSrv: BackendSrv = getBackendSrv(),
    readonly templateSrv: TemplateSrv = getTemplateSrv()
  ) {
    super(instanceSettings, backendSrv, templateSrv);
    this.dependenciesLoadedPromise = this.loadDependencies();
  }

  baseUrl = this.instanceSettings.url + '/niapm/v1';

  defaultQuery = {
    type: AssetQueryType.ListAssets,
    filter: '',
    take: 1000,
  };

  async runQuery(query: AssetQuery, options: DataQueryRequest): Promise<DataFrameDTO> {
    const listAssetsQuery = query as ListAssetsQuery;
    await this.dependenciesLoadedPromise;

    // eslint-disable-next-line no-console
    console.log("query initial:", listAssetsQuery);

    // if (!('take' in listAssetsQuery)) {
    //   // eslint-disable-next-line no-console
    //   console.log("adaugam take:", listAssetsQuery);
    //   listAssetsQuery.take = 1000;
    // }

    // if (!listAssetsQuery.outputType) {
    //   // eslint-disable-next-line no-console
    //   console.log("adaugam outputType:", listAssetsQuery);
    //   listAssetsQuery.outputType = OutputType.Properties;
    // }

    if (listAssetsQuery.filter) {
      listAssetsQuery.filter = transformComputedFieldsQuery(
        this.templateSrv.replace(listAssetsQuery.filter, options.scopedVars),
        this.assetComputedDataFields,
        this.queryTransformationOptions
      );
    }

    if (listAssetsQuery.outputType === OutputType.TotalCount) {
      // eslint-disable-next-line no-console
      console.log("am intrat aici", listAssetsQuery);
      return this.processTotalCountAssetsQuery(listAssetsQuery);
    };

    if (listAssetsQuery.outputType === OutputType.Properties && this.isTakeValid(listAssetsQuery)) {
      return this.processListAssetsQuery(listAssetsQuery);
    }

    return {
      refId: query.refId,
      name: query.refId,
      fields: [],
    };
  }

  shouldRunQuery(query: AssetQuery): boolean {
    return !query?.hide;
  }

  async processListAssetsQuery(query: ListAssetsQuery) {
    const result: DataFrameDTO = { refId: query.refId, fields: [] };
    const assetsResponse: AssetsResponse = await this.queryAssets(query.filter, query.take, false);
    const assets = assetsResponse.assets;
    const workspaces = this.getCachedWorkspaces();
    result.fields = [
      { name: 'id', values: assets.map(a => a.id) },
      { name: 'name', values: assets.map(a => a.name) },
      { name: 'vendor name', values: assets.map(a => a.vendorName) },
      { name: 'vendor number', values: assets.map(a => a.vendorNumber) },
      { name: 'model name', values: assets.map(a => a.modelName) },
      { name: 'model number', values: assets.map(a => a.modelNumber) },
      { name: 'serial number', values: assets.map(a => a.serialNumber) },
      { name: 'bus type', values: assets.map(a => a.busType) },
      { name: 'asset type', values: assets.map(a => a.assetType) },
      { name: 'is NI asset', values: assets.map(a => a.isNIAsset) },
      { name: 'part number', values: assets.map(a => a.partNumber) },
      { name: 'calibration status', values: assets.map(a => a.calibrationStatus) },
      { name: 'is system controller', values: assets.map(a => a.isSystemController) },
      { name: 'last updated timestamp', values: assets.map(a => a.lastUpdatedTimestamp) },
      { name: 'location', values: assets.map(a => this.getLocationFromAsset(a)) },
      { name: 'minionId', values: assets.map(a => a.location.minionId) },
      { name: 'parent name', values: assets.map(a => a.location.parent) },
      { name: 'workspace', values: assets.map(a => getWorkspaceName(workspaces, a.workspace)) },
      { name: 'supports self calibration', values: assets.map(a => a.supportsSelfCalibration) },
      { name: 'supports external calibration', values: assets.map(a => a.supportsExternalCalibration) },
      { name: 'visa resource name', values: assets.map(a => a.visaResourceName) },
      { name: 'firmware version', values: assets.map(a => a.firmwareVersion) },
      { name: 'discovery type', values: assets.map(a => a.discoveryType) },
      { name: 'supports self test', values: assets.map(a => a.supportsSelfTest) },
      { name: 'supports reset', values: assets.map(a => a.supportsReset) },
      { name: 'properties', values: assets.map(a => JSON.stringify(a.properties)) },
      { name: 'keywords', values: assets.map(a => a.keywords.join(', ')) },
      { name: 'self calibration', values: assets.map(a => a.selfCalibration?.date ?? '') },
      { name: 'calibration due date', values: assets.map(a => a.externalCalibration?.resolvedDueDate) }
    ];
    return result;
  }

  async processTotalCountAssetsQuery(query: ListAssetsQuery) {
    const response: AssetsResponse = await this.queryAssets(query.filter, QUERY_LIMIT, true);
    const result: DataFrameDTO = { refId: query.refId, fields: [{ name: "Total count", values: [response.totalCount] }] };
    return result;
  }

  async queryAssets(filter = '', take = -1, returnCount = false): Promise<AssetsResponse> {
    let data: QueryListAssetRequestBody = { filter, take, returnCount };
    try {
      const response = await this.post<AssetsResponse>(this.baseUrl + '/query-assets', data);
      return response;
    } catch (error) {
      throw new Error(`An error occurred while querying assets: ${error}`);
    }
  }

  private getLocationFromAsset(asset: AssetModel): string {
    if (asset.location.physicalLocation) {
      return asset.location.physicalLocation;
    }
    return this.systemAliasCache.get(asset.location.minionId)?.alias || '';
  }

  private isTakeValid(query: ListAssetsQuery): boolean {
    return query.take !== undefined && query.take >= 0 && query.take <= QUERY_LIMIT;
  }
}
