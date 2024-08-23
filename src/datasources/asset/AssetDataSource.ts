import {
  DataFrameDTO,
  DataQueryRequest,
  DataSourceInstanceSettings,
  FieldDTO,
  TestDataSourceResponse,
} from '@grafana/data';
import { BackendSrv, getBackendSrv, getTemplateSrv, TemplateSrv } from '@grafana/runtime';
import { DataSourceBase } from 'core/DataSourceBase';
import {
  AssetCalibrationForecastGroupByType,
  AssetCalibrationForecastKey,
  AssetCalibrationForecastQuery,
  AssetFilterProperties,
  AssetMetadataQuery,
  AssetModel,
  AssetQuery,
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
    groupBy: []
  };

  async runQuery(query: AssetQuery, options: DataQueryRequest): Promise<DataFrameDTO> {
    switch (query.queryKind) {
      case AssetQueryType.Metadata:
        return await this.processMetadataQuery(query as AssetMetadataQuery);
      case AssetQueryType.CalibrationForecast:
        return await this.processCalibrationForecastQuery(query as AssetCalibrationForecastQuery, options);
      default:
        throw new Error(`Unknown query type: ${query.queryKind}`);
    }
  }

  async processMetadataQuery(query: AssetMetadataQuery) {
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

  async processCalibrationForecastQuery(query: AssetCalibrationForecastQuery, options: DataQueryRequest) {
    const result: DataFrameDTO = { refId: query.refId, fields: [] };
    const from = options.range!.from.toISOString();
    const to = options.range!.to.toISOString();

    const calibrationForecastResponse: CalibrationForecastResponse = await this.queryCalibrationForecast(query.groupBy, from, to);

    result.fields = calibrationForecastResponse.calibrationForecast.columns || [];
    result.fields = result.fields.map(field => this.formatField(field, query));

    return result;
  }

  formatField(field: FieldDTO, query: AssetCalibrationForecastQuery): FieldDTO {
    if (!field.values) {
      return field;
    }

    if (field.name === AssetCalibrationForecastKey.Time) {
      field.values = this.formatTimeField(field.values, query);
      field.name= 'Formatted Time';
      return field;
    }

    return field;
  }

  formatTimeField(values: string[], query: AssetCalibrationForecastQuery): string[] {
    const timeGrouping = query.groupBy.find(item =>
      [AssetCalibrationForecastGroupByType.Day,
      AssetCalibrationForecastGroupByType.Week,
      AssetCalibrationForecastGroupByType.Month].includes(item as AssetCalibrationForecastGroupByType)
    ) as AssetCalibrationForecastGroupByType | undefined;

    const formatFunctionMap = {
      [AssetCalibrationForecastGroupByType.Day]: this.formatDateForDay,
      [AssetCalibrationForecastGroupByType.Week]: this.formatDateForWeek,
      [AssetCalibrationForecastGroupByType.Month]: this.formatDateForMonth,
    };

    const formatFunction = formatFunctionMap[timeGrouping!] || ((v: string) => v);
    values = values.map(formatFunction);
    return values;
  }

  formatDateForDay(date: string): string {
    return new Date(date).toISOString().split('T')[0];
  }

  formatDateForWeek(date: string): string {
    const startDate = new Date(date);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
    return `${startDate.toISOString().split('T')[0]} : ${endDate.toISOString().split('T')[0]}`;
  }

  formatDateForMonth(date: string): string {
    return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
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

  async queryCalibrationForecast(groupBy: string[], startTime: string, endTime: string, filter = ''): Promise<CalibrationForecastResponse> {
    let data = { groupBy, startTime, endTime, filter };
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
