import {
  DataFrameDTO,
  DataQueryRequest,
  DataSourceInstanceSettings,
  FieldDTO,
  TestDataSourceResponse,
  dateTime
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
  AssetUtilizationHistory,
  AssetUtilizationHistoryResponse,
  AssetUtilizationOrderBy,
  AssetUtilizationQuery,
  CalibrationForecastResponse,
  EntityType, Interval,
  QueryAssetUtilizationHistoryRequest, ServicePolicyModel,
} from './types';
import { getWorkspaceName, replaceVariables } from "../../core/utils";
import { SystemMetadata } from "../system/types";
import { defaultOrderBy, defaultProjection } from "../system/constants";
import {
  calculateUtilization,
  divideTimeRangeToBusinessIntervals, extractTimestampsFromData,
  filterDataByTimeRange, groupDataByIntervals,
  mergeOverlappingIntervals,
  patchMissingEndTimestamps, patchZeroPoints
} from "./helper";
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
    queryKind: AssetQueryType.Metadata,
    workspace: '',
    assetIdentifiers: [],
    minionIds: [],
    entityType: EntityType.Asset,
    groupBy: []
  };

  async runQuery(query: AssetQuery, options: DataQueryRequest): Promise<DataFrameDTO> {
    switch (query.queryKind) {
      case AssetQueryType.Metadata:
        return await this.processMetadataQuery(query as AssetMetadataQuery);
      case AssetQueryType.CalibrationForecast:
        return await this.processCalibrationForecastQuery(query as AssetCalibrationForecastQuery, options);
      case AssetQueryType.Utilization:
        return await this.processUtilizationQuery(query as AssetUtilizationQuery, options)
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

  async processUtilizationQuery(query: AssetUtilizationQuery, options: DataQueryRequest) {
    const result: DataFrameDTO = { refId: query.refId, fields: [] };
    let workspaceId = this.templateSrv.replace(query.workspace);
    // fetch and process utilization raw data for chosen assets/systems
    const utilization_array = await this.fetchAndProcessUtilizationData(query, options);
    if (utilization_array.length) {
      let utilization_array_with_alias: Array<{ id: string, datetimes: number[], values: number[], alias: string }>;
      const idsArray = utilization_array.map((data) => {
        return data.id
      });
      // find and add aliases to data
      if (query.entityType === EntityType.System) {
        const filterArr: string[] = [];
        idsArray.forEach((id) => {
          filterArr.push(`id == "${id}" `);
        });
        const filterStr = workspaceId ? `(${filterArr.join(' or ')}) and workspace = "${workspaceId}"` : filterArr.join(' or ');
        const systems = await this.querySystems(filterStr, defaultProjection);
        utilization_array_with_alias = utilization_array.map(system_utilization_df => {
          const foundItem = systems.find((system: SystemMetadata) => system.id === system_utilization_df.id);
          return { ...system_utilization_df, alias: foundItem?.alias ? foundItem.alias : 'System' };
        });
      } else {
        const filterArr: string[] = [];
        idsArray.forEach((id) => {
          filterArr.push(`${AssetFilterProperties.AssetIdentifier} == "${id}"`);
        });
        const filterStr = workspaceId ? ` (${filterArr.join(' or ')}) and workspace = "${workspaceId}"` : filterArr.join(' or ');
        const assetsResponse = await this.queryAssets(filterStr, -1);
        utilization_array_with_alias = utilization_array.map(asset_utilization_df => {
          const foundItem = assetsResponse.find((asset: AssetModel) => asset.id === asset_utilization_df.id);
          return { ...asset_utilization_df, alias: foundItem ? foundItem.name : 'Asset' };
        });
      }
      result.fields = [
        { name: 'time', values: utilization_array_with_alias[0].datetimes },
      ];
      utilization_array_with_alias.forEach((data) => {
        result.fields.push(
          {
            name: data.id,
            values: data.values,
            // default configuration for visualizations
            config: {
              displayName: data.alias,
              unit: '%',
              min: 0,
              max: 100
            }
          }
        )
      })

      return result
    } else {
      return result
    }
  }

  formatField(field: FieldDTO, query: AssetCalibrationForecastQuery): FieldDTO {
    if (!field.values) {
      return field;
    }

    if (field.name === AssetCalibrationForecastKey.Time) {
      field.values = this.formatTimeField(field.values, query);
      field.name = 'Formatted Time';
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

  private async fetchAndProcessUtilizationData(query: AssetUtilizationQuery, options: DataQueryRequest): Promise<Array<{
    id: string,
    datetimes: number[],
    values: number[]
  }>> {
    const [from, to] = [options.range.from.valueOf(), options.range.to.valueOf()];
    const workspaceId = this.templateSrv.replace(query.workspace);
    let continuationToken = '';
    const {
      assetIdentifiers,
      minionIds
    } = query;
    const workingHoursPolicy = await this.getServicePolicy()
    let assets: string[] = replaceVariables(assetIdentifiers, this.templateSrv);
    let systems: string[] = replaceVariables(minionIds, this.templateSrv);
    let entityIds: string[];
    if (query.entityType === EntityType.Asset) {
      entityIds = assets
    } else {
      entityIds = systems
    }
    // filter empty values
    entityIds = entityIds.filter(Boolean);
    // retrieve the first 10 asset or system IDs to display some data, ensuring the utilization graph is not empty.
    if (!entityIds.length) {
      if (query.entityType === EntityType.Asset) {
        let conditions: string[] = [];
        if (workspaceId) {
          conditions.push(`workspace = "${workspaceId}"`);
        }
        if (systems.length) {
          const systemsCondition = systems.map(id => `${AssetFilterProperties.LocationMinionId} = "${id}"`)
          conditions.push(`(${systemsCondition.join(' or ')})`);
        }
        const assetFilter = conditions.join(' and ');
        const assetsResponse = await this.queryAssets(assetFilter, 10);
        entityIds = assetsResponse.map((asset) => {
          return asset.id;
        })
      } else {
        let filterString = '';
        if (query.workspace) {
          filterString += `workspace = "${query.workspace}"`;
        }
        let systemMetadata = await this.getSystems({
          filter: filterString,
          projection: `new(${defaultProjection.join()})`,
          orderBy: defaultOrderBy,
          take: 10
        })
        entityIds = systemMetadata.data.map((system) => {
          return system.id;
        })
      }
    }

    const resultArray: Array<{
      id: string,
      datetimes: number[],
      values: number[]
    }> = [];
    for (let index = 0; index < entityIds.length; index++) {
      let data: AssetUtilizationHistory[] = [];
      let requestCount = 0;
      do {
        try {
          let requestBody: QueryAssetUtilizationHistoryRequest = {
            utilizationFilter: '',
            continuationToken: continuationToken,
            orderBy: AssetUtilizationOrderBy.START_TIMESTAMP,
            orderByDescending: true
          }
          if (query.entityType === EntityType.Asset) {
            requestBody.assetFilter = `${AssetFilterProperties.AssetIdentifier} = "${entityIds[index]}"`;
          } else {
            requestBody.assetFilter = `${AssetFilterProperties.LocationMinionId} = "${entityIds[index]}" and ${AssetFilterProperties.IsSystemController} = true`;
          }
          const response: AssetUtilizationHistoryResponse = await this.post<AssetUtilizationHistoryResponse>(this.baseUrl + '/query-asset-utilization-history', requestBody);
          requestCount++;
          continuationToken = response.continuationToken || '';
          data = data.concat(response.assetUtilizations);
        } catch (error) {
          throw new Error(`An error occurred while retrieving utilization history: ${error}`);
        }
      } while (
        continuationToken && (requestCount < 25) &&
        //do not continue if currently out of interval range
        options.range.from.isBefore(dateTime(data[data.length - 1].startTimestamp))
        );
      data.sort(
        (a, b) =>
          new Date(a.startTimestamp).getTime() - new Date(b.startTimestamp).getTime()
      )
      let dataWithoutOverlaps: Array<Interval<number>> = [];
      if (data.length) {
        const extractedTimestamps = extractTimestampsFromData(data);
        // Fill missing endTimestamps
        const patchedData = patchMissingEndTimestamps(extractedTimestamps);
        // Removes data outside the grafana 'from' and 'to' range from an array
        const filteredData = filterDataByTimeRange(patchedData, from, to);
        if (filteredData.length) {
          // Merge overlapping utilizations
          dataWithoutOverlaps = mergeOverlappingIntervals(filteredData);
          // Divide given time range to peak/non-peak intervals
          const businessIntervals = divideTimeRangeToBusinessIntervals(new Date(from), new Date(to), {
            startTime: workingHoursPolicy.workingHoursPolicy.startTime,
            endTime: workingHoursPolicy.workingHoursPolicy.endTime
          }, peakDays);
          // Group raw utilization data by intervals
          const overlaps = groupDataByIntervals(businessIntervals, dataWithoutOverlaps);
          // Calculate utilization percentage by intervals
          const utilization = calculateUtilization(overlaps);
          // patch zero points to data for better visualisation
          const patchedUtilization = patchZeroPoints(utilization);

          let utilization_data: { id: string, datetimes: number[], values: number[] } =
            {
              id: entityIds[index],
              datetimes: patchedUtilization.map(v => dateTime(v.day).valueOf()),
              values: patchedUtilization.map(v => v.utilization)
            }
          resultArray.push(utilization_data);
        }
      }
    }

    return resultArray;
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
