import {
  DataFrameDTO,
  DataQueryRequest,
  DataSourceInstanceSettings,
  TestDataSourceResponse,
} from '@grafana/data';
import { BackendSrv, getBackendSrv, getTemplateSrv, TemplateSrv } from '@grafana/runtime';
import { DataSourceBase } from 'core/DataSourceBase';
import {
  AssetCalibrationForecastGroupByType,
  AssetFilterProperties,
  AssetModel, AssetQuery,
  AssetQueryType,
  AssetsResponse,
  CalibrationForecastResponse,
} from './types';
import { getWorkspaceName, replaceVariables } from "../../core/utils";
import { SystemMetadata } from "../system/types";
import { defaultOrderBy, defaultProjection } from "../system/constants";

export class AssetDataSource extends DataSourceBase<AssetQuery> {
  constructor(
    readonly instanceSettings: DataSourceInstanceSettings,
    readonly backendSrv: BackendSrv = getBackendSrv(),
    readonly templateSrv: TemplateSrv = getTemplateSrv()
  ) {
    super(instanceSettings, backendSrv, templateSrv);
  }

  baseUrl = this.instanceSettings.url + '/niapm/v1';

  defaultQuery = {
    queryKind: AssetQueryType.Metadata,
    workspace: '',
    minionIds: [],
    groupBy: [AssetCalibrationForecastGroupByType.Month]
  };

  async runQuery(query: AssetQuery, options: DataQueryRequest): Promise<DataFrameDTO> {
    switch (query.queryKind) {
      case AssetQueryType.Metadata:
        return await this.processMetadataQuery(query); 
      case AssetQueryType.CalibrationForecast:
        return await this.processCalibrationForecastQuery(query, options);
      default:
        throw new Error(`Unknown query type: ${query.queryKind}`);
    }
  }

  async processMetadataQuery(query: AssetQuery) {
    const result: DataFrameDTO = { refId: query.refId, fields: [] };
    const minionIds = replaceVariables(query.minionIds, this.templateSrv);
    let workspaceId = this.templateSrv.replace(query.workspace);
    const conditions = [];
    if (minionIds.length) {
      const systemsCondition = minionIds.map(id => `${AssetFilterProperties.LocationMinionId} = "${id}"`)
      conditions.push(`(${systemsCondition.join(' or ')})`);
    }
    if (workspaceId) {
      conditions.push(`workspace = "${workspaceId}"`);
    }
    const assetFilter = conditions.join(' and ');
    const assets: AssetModel[] = await this.queryAssets(assetFilter, 1000);
    const workspaces = await this.getWorkspaces();
    result.fields = [
      { name: 'id', values: assets.map(a => a.id) },
      { name: 'name', values: assets.map(a => a.name) },
      { name: 'model name', values: assets.map(a => a.modelName) },
      { name: 'serial number', values: assets.map(a => a.serialNumber) },
      { name: 'bus type', values: assets.map(a => a.busType) },
      { name: 'asset type', values: assets.map(a => a.assetType) },
      { name: 'is NI asset', values: assets.map(a => a.isNIAsset) },
      { name: 'calibration status', values: assets.map(a => a.calibrationStatus) },
      { name: 'is system controller', values: assets.map(a => a.isSystemController) },
      { name: 'last updated timestamp', values: assets.map(a => a.lastUpdatedTimestamp) },
      { name: 'minionId', values: assets.map(a => a.location.minionId) },
      { name: 'parent name', values: assets.map(a => a.location.parent) },
      { name: 'workspace', values: assets.map(a => getWorkspaceName(workspaces, a.workspace)) },
    ];
    return result;
  }

  async processCalibrationForecastQuery(query: AssetQuery, options: DataQueryRequest) {
    const result: DataFrameDTO = { refId: query.refId, fields: [] };
    const from = options.range!.from.toISOString();
    const to = options.range!.to.toISOString();

    const calibrationForecastResponse: CalibrationForecastResponse = await this.queryCalibrationForecast(query.groupBy, from, to);

    result.fields = calibrationForecastResponse.calibrationForecast.columns;
    return result;
  }

  shouldRunQuery(_: AssetQuery): boolean {
    return true;
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

  async queryCalibrationForecast(groupBy: string[], startDate: string, endDate: string, filter = ''): Promise<CalibrationForecastResponse> {
    let data = { groupBy, startDate, endDate, filter };
    try {
      let response = await this.post<CalibrationForecastResponse>(this.baseUrl + '/assets/calibration-forecast', data);
      return response;
    } catch (error) {
      throw new Error(`An error occurred while querying assets calibration forecast: ${error}`);
    }
  }

  async querySystems(filter = '', projection = defaultProjection): Promise<SystemMetadata[]> {
    try {
      let response = await this.getSystems({
        filter: filter,
        projection: `new(${projection.join()})`,
        orderBy: defaultOrderBy,
      })

      return response.data;
    } catch (error) {
      throw new Error(`An error occurred while querying systems: ${error}`);
    }
  }

  async testDatasource(): Promise<TestDataSourceResponse> {
    await this.get(this.baseUrl + '/assets?take=1');
    return { status: 'success', message: 'Data source connected and authentication successful!' };
  }
}
