import {
  DataFrameDTO,
  DataQueryRequest,
  DataSourceInstanceSettings,
  TestDataSourceResponse,
  dateTime, MetricFindValue
} from '@grafana/data';
import { BackendSrv, getBackendSrv, getTemplateSrv, TemplateSrv } from '@grafana/runtime';
import { DataSourceBase } from 'core/DataSourceBase';
import {
  AssetFilterProperties,
  AssetMetadataQuery,
  AssetModel,
  AssetQuery,
  AssetQueryType,
  AssetsResponse,
  AssetUtilizationHistory,
  AssetUtilizationHistoryResponse,
  AssetUtilizationOrderBy,
  AssetUtilizationQuery,
  EntityType, TimeSeriesUtilization, TimeSeriesUtilizationWithAlias,
  QueryAssetUtilizationHistoryRequest, ServicePolicyModel, TimestampedUtilization,
} from './types';
import { getWorkspaceName, replaceVariables } from "../../core/utils";
import { SystemMetadata } from "../system/types";
import { defaultOrderBy, defaultProjection } from "../system/constants";
import {
  buildEntityFilterString,
  calculateUtilization,
  divideTimeRangeToBusinessIntervals, extractTimestampsFromData,
  filterDataByTimeRange, groupDataByIntervals,
  mergeOverlappingIntervals,
  patchMissingEndTimestamps, patchZeroPoints, prepareFields
} from "./utils";
import { peakDays } from "./constants";

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
    type: AssetQueryType.Metadata,
    workspace: '',
    assetIdentifiers: [],
    minionIds: [],
    entityType: EntityType.Asset,
  };

  async runQuery(query: AssetQuery, options: DataQueryRequest): Promise<DataFrameDTO> {
    switch (query.type) {
      case AssetQueryType.Metadata:
        return await this.handleMetadataQuery(query as AssetMetadataQuery);
      case AssetQueryType.Utilization:
        return await this.handleUtilizationQuery(query as AssetUtilizationQuery, options);
      default:
        throw new Error(`Unknown query type: ${query.type}`);
    }
  }

  async handleMetadataQuery(query: AssetMetadataQuery) {
    const result: DataFrameDTO = { refId: query.refId, fields: [] };
    const minionIds = replaceVariables(query.minionIds, this.templateSrv);
    let workspaceId = this.templateSrv.replace(query.workspace);
    const conditions = [];
    if (minionIds.length) {
      const systemsCondition = minionIds.map(id => `${AssetFilterProperties.LocationMinionId} = "${id}"`);
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

  async handleUtilizationQuery(query: AssetUtilizationQuery, options: DataQueryRequest) {
    const result: DataFrameDTO = { refId: query.refId, fields: [] };
    let workspaceId = this.templateSrv.replace(query.workspace);
    const timeSeriesUtilization = await this.fetchAndProcessUtilizationData(query, options, workspaceId);
    if (timeSeriesUtilization.length) {
      let timeSeriesUtilizationWithAlias: TimeSeriesUtilizationWithAlias[] = await this.addAliasesToData(query.entityType, timeSeriesUtilization, workspaceId)
      result.fields = prepareFields(timeSeriesUtilizationWithAlias);
    }
    return result
  }

  shouldRunQuery(_: AssetQuery): boolean {
    return true;
  }

  private async fetchAndProcessUtilizationData(query: AssetUtilizationQuery, options: DataQueryRequest, workspaceId: string): Promise<TimeSeriesUtilization[]> {
    const [from, to] = [options.range.from.valueOf(), options.range.to.valueOf()];
    const workingHoursPolicy = await this.getServicePolicy();
    let entityIds = await this.getEntityIds(query, workspaceId);
    return await this.processEntities(entityIds, query, from, to, workingHoursPolicy, options);
  }

  private async getEntityIds(query: AssetUtilizationQuery, workspaceId: string): Promise<string[]> {
    const assets = replaceVariables(query.assetIdentifiers, this.templateSrv);
    const systems = replaceVariables(query.minionIds, this.templateSrv);
    let entityIds = query.entityType === EntityType.Asset ? assets : systems;
    entityIds = entityIds.filter(Boolean);

    if (!entityIds.length) {
      if (query.entityType === EntityType.Asset) {
        return await this.retrieveAssetIds(workspaceId, query.minionIds);
      } else {
        return await this.retrieveSystemIds(query.workspace);
      }
    }
    return Promise.resolve(entityIds);
  }

  private async retrieveAssetIds(workspaceId: string, systems: string[]): Promise<string[]> {
    let conditions: string[] = [];
    if (workspaceId) {
      conditions.push(`workspace = "${workspaceId}"`);
    }
    if (systems.length) {
      const systemsCondition = systems.map(id => `${AssetFilterProperties.LocationMinionId} = "${id}"`);
      conditions.push(`(${systemsCondition.join(' or ')})`);
    }
    const assetFilter = conditions.join(' and ');
    const assetsResponse = await this.queryAssets(assetFilter, 10);
    return assetsResponse.map(asset => asset.id);
  }

  private async retrieveSystemIds(workspace: string): Promise<string[]> {
    const filterString = workspace ? `workspace = "${workspace}"` : '';
    const systemMetadata = await this.getSystems({
      filter: filterString,
      projection: `new(${defaultProjection.join()})`,
      orderBy: defaultOrderBy,
      take: 10
    });
    return systemMetadata.data.map(system => system.id);
  }

  private async processEntities(entityIds: string[], query: AssetUtilizationQuery, from: number, to: number, workingHoursPolicy: ServicePolicyModel, options: DataQueryRequest): Promise<TimeSeriesUtilization[]> {
    const timeSeriesUtilizations: TimeSeriesUtilization[] = [];

    for (const entityId of entityIds) {
      const utilizationData = await this.processEntity(entityId, query, from, to, workingHoursPolicy, options);
      if (utilizationData) {
        timeSeriesUtilizations.push(utilizationData);
      }
    }

    return timeSeriesUtilizations;
  }

  private async processEntity(entityId: string, query: AssetUtilizationQuery, from: number, to: number, workingHoursPolicy: ServicePolicyModel, options: DataQueryRequest): Promise<TimeSeriesUtilization | null> {
    let continuationToken = '';
    let history: AssetUtilizationHistory[] = [];
    let requestCount = 0;

    do {
      const response = await this.fetchUtilizationHistory({
        utilizationFilter: '',
        continuationToken,
        orderBy: AssetUtilizationOrderBy.START_TIMESTAMP,
        orderByDescending: true,
        assetFilter: query.entityType === EntityType.Asset
          ? `${AssetFilterProperties.AssetIdentifier} = "${entityId}"`
          : `${AssetFilterProperties.LocationMinionId} = "${entityId}" and ${AssetFilterProperties.IsSystemController} = true`
      });
      continuationToken = response.continuationToken || '';
      history = history.concat(response.assetUtilizations);
      requestCount++;
    } while (continuationToken && requestCount < 25 && options.range.from.isBefore(dateTime(history[history.length - 1].startTimestamp)));

    if (!history.length) {
      return null;
    }
    history.sort(
      (a, b) =>
        new Date(a.startTimestamp).getTime() - new Date(b.startTimestamp).getTime()
    )
    const timestampedUtilizations = this.filterAndProcessHistory(history, from, to, workingHoursPolicy);
    if (!timestampedUtilizations.length) {
      return null;
    }

    return this.prepareTimeSeriesUtilization(entityId, timestampedUtilizations);
  }

  private async fetchUtilizationHistory(requestBody: QueryAssetUtilizationHistoryRequest): Promise<AssetUtilizationHistoryResponse> {
    try {
      return await this.post<AssetUtilizationHistoryResponse>(this.baseUrl + '/query-asset-utilization-history', requestBody);
    } catch (error) {
      throw new Error(`Error retrieving utilization history: ${error}`);
    }
  }

  private filterAndProcessHistory(data: AssetUtilizationHistory[], from: number, to: number, workingHoursPolicy: ServicePolicyModel): TimestampedUtilization[] {
    const extractedTimestamps = extractTimestampsFromData(data);
    const patchedData = patchMissingEndTimestamps(extractedTimestamps);
    const filteredData = filterDataByTimeRange(patchedData, from, to);
    if (!filteredData.length) {
      return [];
    }
    const dataWithoutOverlaps = mergeOverlappingIntervals(filteredData);
    const businessIntervals = divideTimeRangeToBusinessIntervals(new Date(from), new Date(to), {
      startTime: workingHoursPolicy.workingHoursPolicy.startTime,
      endTime: workingHoursPolicy.workingHoursPolicy.endTime
    }, peakDays);

    const overlaps = groupDataByIntervals(businessIntervals, dataWithoutOverlaps);
    return patchZeroPoints(calculateUtilization(overlaps));
  }

  private prepareTimeSeriesUtilization(entityId: string, utilizationData: TimestampedUtilization[]): TimeSeriesUtilization {
    return {
      id: entityId,
      datetimes: utilizationData.map(v => dateTime(v.day).valueOf()),
      values: utilizationData.map(v => v.utilization)
    };
  }

  async addAliasesToData(query: EntityType, utilizations: TimeSeriesUtilization[], workspaceId: string): Promise<TimeSeriesUtilizationWithAlias[]> {
    if (query === EntityType.System) {
      return await this.addSystemAliases(utilizations, workspaceId);
    } else {
      return await this.addAssetAliases(utilizations, workspaceId);
    }
  }

  private async addSystemAliases(utilizations: TimeSeriesUtilization[], workspaceId?: string) {
    const filterStr = buildEntityFilterString(utilizations, 'id', workspaceId);
    const systems = await this.querySystems(filterStr, defaultProjection);

    return utilizations.map(df => {
      const foundItem = systems.find((system: SystemMetadata) => system.id === df.id);
      return { ...df, alias: foundItem?.alias ? foundItem.alias : 'System' };
    });
  }

  private async addAssetAliases(utilizations: TimeSeriesUtilization[], workspaceId?: string) {
    const filterStr = buildEntityFilterString(utilizations, AssetFilterProperties.AssetIdentifier, workspaceId);
    const assetsResponse = await this.queryAssets(filterStr, -1);

    return utilizations.map(df => {
      const foundItem = assetsResponse.find((asset: AssetModel) => asset.id === df.id);
      return { ...df, alias: foundItem ? foundItem.name : 'Asset' };
    });
  }

  async getServicePolicy(): Promise<ServicePolicyModel> {
    return await this.get<ServicePolicyModel>(this.baseUrl + '/policy');
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

  async metricFindQuery({ minionIds, workspace }: AssetMetadataQuery): Promise<MetricFindValue[]> {
    const conditions = [];
    if (minionIds?.length) {
      minionIds = replaceVariables(minionIds, this.templateSrv);
      const systemsCondition = minionIds.map(id => `${AssetFilterProperties.LocationMinionId} = "${id}"`);
      conditions.push(`(${systemsCondition.join(' or ')})`);
    }
    workspace = this.templateSrv.replace(workspace);
    if (workspace) {
      conditions.push(`workspace = "${workspace}"`);
    }
    const assetFilter = conditions.join(' and ');
    const assetsResponse: AssetModel[] = await this.queryAssets(assetFilter, 1000);
    return assetsResponse.map((asset: AssetModel) => ({ text: asset.name, value: asset.id }));
  }

  async testDatasource(): Promise<TestDataSourceResponse> {
    await this.get(this.baseUrl + '/assets?take=1');
    return { status: 'success', message: 'Data source connected and authentication successful!' };
  }

}
