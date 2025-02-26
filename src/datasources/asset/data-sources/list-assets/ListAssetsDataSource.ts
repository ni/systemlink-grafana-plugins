import { DataQueryRequest, DataFrameDTO, DataSourceInstanceSettings } from '@grafana/data';
import { BackendSrv, getBackendSrv, getTemplateSrv, TemplateSrv } from '@grafana/runtime';
import { AssetDataSourceBase } from '../AssetDataSourceBase';
import { AssetDataSourceOptions, AssetQuery, AssetQueryType } from '../../types/types';
import { ListAssetsQuery } from '../../types/ListAssets.types';
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
    filter: ''
  };

  async runQuery(query: AssetQuery, options: DataQueryRequest): Promise<DataFrameDTO> {
    const listAssetsQuery = query as ListAssetsQuery;
    await this.dependenciesLoadedPromise;
  
    if (listAssetsQuery.filter) {
      listAssetsQuery.filter = transformComputedFieldsQuery(
        this.templateSrv.replace(listAssetsQuery.filter, options.scopedVars),
        this.assetComputedDataFields,
        this.queryTransformationOptions
      );
    }

    return this.processListAssetsQuery(listAssetsQuery);
  }

  shouldRunQuery(query: AssetQuery): boolean {
    return true;
  }

  async processListAssetsQuery(query: ListAssetsQuery) {
    const result: DataFrameDTO = { refId: query.refId, fields: [] };
    const assets: AssetModel[] = await this.queryAssets(query.filter, QUERY_LIMIT);
    const workspaces = this.getCachedWorkspaces();
    result.fields = [
      { name: 'id', values: assets.map(a => a.id) },
      { name: 'name', values: assets.map(a => a.name) },
      { name: 'model name', values: assets.map(a => a.modelName) },
      { name: 'serial number', values: assets.map(a => a.serialNumber) },
      { name: 'bus type', values: assets.map(a => a.busType) },
      { name: 'asset type', values: assets.map(a => a.assetType) },
      { name: 'is NI asset', values: assets.map(a => a.isNIAsset) },
      { name: 'part number', values: assets.map(a => a.partNumber) },
      { name: 'calibration status', values: assets.map(a => a.calibrationStatus) },
      { name: 'is system controller', values: assets.map(a => a.isSystemController) },
      { name: 'last updated timestamp', values: assets.map(a => a.lastUpdatedTimestamp) },
      { name: 'location', values: assets.map(a => this.getLocationFromAsset(a))},
      { name: 'minionId', values: assets.map(a => a.location.minionId) },
      { name: 'parent name', values: assets.map(a => a.location.parent) },
      { name: 'workspace', values: assets.map( a => getWorkspaceName( workspaces, a.workspace ) ) },
      { name: 'calibration due date', values: assets.map(a => a.externalCalibration?.resolvedDueDate) }
    ];
    return result;
  }

  async queryAssets(filter = '', take = -1): Promise<AssetModel[]> {
    let data = { filter, take };
    try {
      let response = await this.post<AssetsResponse>(this.baseUrl + '/query-assets', data);
      return response.assets;
    } catch (error) {
      throw new Error(`An error occurred while querying assets: ${error}`);
    }
  }

  private getLocationFromAsset(asset: AssetModel): string
  {
    if (asset.location.physicalLocation)
    {
      return asset.location.physicalLocation;
    }
    return this.systemAliasCache.get(asset.location.minionId)?.alias || '';
  }
}
