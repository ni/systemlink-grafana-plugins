import { DataQueryRequest, DataFrameDTO, DataSourceInstanceSettings, FieldType } from '@grafana/data';
import { BackendSrv, getBackendSrv, getTemplateSrv, TemplateSrv } from '@grafana/runtime';
import { AssetDataSourceBase } from '../AssetDataSourceBase';
import { AssetDataSourceOptions, AssetQuery, AssetQueryType } from '../../types/types';
import { AssetFilterProperties, AssetFilterPropertiesOption, ListAssetsQuery, OutputType, QueryListAssetRequestBody } from '../../types/ListAssets.types';
import { AssetModel, AssetsResponse } from '../../../asset-common/types';
import { transformComputedFieldsQuery } from '../../../../core/query-builder.utils';
import { QUERY_LIMIT } from 'datasources/asset/constants/constants';
import { defaultListAssetsQuery, defaultListAssetsQueryForOldPannels } from 'datasources/asset/defaults';
import { TAKE_LIMIT } from 'datasources/asset/constants/ListAssets.constants';
import { getWorkspaceName } from 'core/utils';

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
    const listAssetsQuery = this.patchListAssetQuery(query);
    await this.dependenciesLoadedPromise;

    if (listAssetsQuery.filter) {
      listAssetsQuery.filter = transformComputedFieldsQuery(
        this.templateSrv.replace(listAssetsQuery.filter, options.scopedVars),
        this.assetComputedDataFields,
        this.queryTransformationOptions
      );
    }

    if (listAssetsQuery.outputType === OutputType.TotalCount) {
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
    const assetsResponse: AssetsResponse = await this.queryAssets(query.filter, query.take, false, query.properties);
    const assets = assetsResponse.assets;
    const workspaces = this.getCachedWorkspaces();
    const mappedFields = query.properties?.map(property => {
      const { field, label, value } = AssetFilterProperties[property];
      const fieldType = FieldType.string;

      const fieldValues = assets.map(asset => {
        switch (value) {
          case AssetFilterPropertiesOption.Workspace:
            return getWorkspaceName(workspaces, asset.workspace)
          case AssetFilterPropertiesOption.Location:
            return this.getLocationFromAsset(asset)
          case AssetFilterPropertiesOption.Properties:
            return JSON.stringify(asset.properties);
          case AssetFilterPropertiesOption.MinionId:
            return asset.location.minionId
          case AssetFilterPropertiesOption.ParentName:
            return asset.location.parent
          case AssetFilterPropertiesOption.SelfCalibration:
            return asset.selfCalibration?.date ?? '';
          case AssetFilterPropertiesOption.ExternalCalibrationDate:
            return asset.externalCalibration?.resolvedDueDate
          case AssetFilterPropertiesOption.Keywords:
            return asset.keywords.join(', ')
          default:
            return asset[field];
        }
      });

      return { name: label, values: fieldValues, type: fieldType };
    });

    return {
      refId: query.refId,
      name: query.refId,
      fields: mappedFields ?? [],
    };
  }

  async processTotalCountAssetsQuery(query: ListAssetsQuery) {
    const response: AssetsResponse = await this.queryAssets(query.filter, QUERY_LIMIT, true, query.properties);
    const result: DataFrameDTO = { refId: query.refId, fields: [{ name: "Total count", values: [response.totalCount] }] };
    return result;
  }

  async queryAssets(filter = '', take = -1, returnCount = false, projectionFields?: string[]): Promise<AssetsResponse> {
    const projection = `new(${projectionFields})`;
    let data: QueryListAssetRequestBody = { filter, take, returnCount, projection };
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

  public patchListAssetQuery(query: AssetQuery): ListAssetsQuery {
    const newQuery = query as ListAssetsQuery
    if (!newQuery.properties) {
      return { ...defaultListAssetsQueryForOldPannels, ...query } as ListAssetsQuery;
    }
    return { ...defaultListAssetsQuery, ...query } as ListAssetsQuery;
  }

  private isTakeValid(query: ListAssetsQuery): boolean {
    return query.take !== undefined && query.take >= 0 && query.take <= TAKE_LIMIT;
  }
}
