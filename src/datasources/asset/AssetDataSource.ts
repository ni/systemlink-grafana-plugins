import { DataFrameDTO, DataQueryRequest, DataSourceInstanceSettings, dateTime, MetricFindValue, } from '@grafana/data';
import { BackendSrv, getBackendSrv, getTemplateSrv, TemplateSrv, TestingStatus } from '@grafana/runtime';
import { DataSourceBase } from 'core/DataSourceBase';
import {
  AssetModel, AssetQuery,
  AssetQueryType,
  AssetsResponse,
  AssetUtilizationHistory,
  AssetUtilizationHistoryResponse,
  AssetUtilizationOrderBy,
  AssetVariableQuery,
  EntityType,
  Interval,
  IsNIAsset,
  IsPeak,
  PolicyOption,
  QueryAssetUtilizationHistoryRequest,
  ServicePolicyModel,
  TimeFrequency,
  UtilizationCategory,
  Weekday
} from './types';
import {
  calculateUtilization,
  divideTimeRangeToBusinessIntervals,
  extractTimestampsFromData,
  filterDataByTimeRange,
  groupDataByIntervals,
  mergeOverlappingIntervals,
  momentToTime,
  patchMissingEndTimestamps,
  patchZeroPoints
} from "./helper";
import { replaceVariables } from "../../core/utils";
import { SystemMetadata } from "../system/types";
import { defaultOrderBy, defaultProjection } from "../system/constants";
import { isPeakLabels, timeFrequencyLabels } from "./constants";

export class AssetDataSource extends DataSourceBase<AssetQuery> {
  constructor(
    readonly instanceSettings: DataSourceInstanceSettings,
    readonly backendSrv: BackendSrv = getBackendSrv(),
    readonly templateSrv: TemplateSrv = getTemplateSrv()
  ) {
    super(instanceSettings, backendSrv, templateSrv);
  }

  baseUrl = this.instanceSettings.url + '/niapm/v1';
  sysmgmtUrl = this.instanceSettings.url + '/nisysmgmt/v1'

  defaultQuery = {
    assetQueryType: AssetQueryType.METADATA,
    workspace: '',
    entityType: EntityType.ASSET,
    assetIdentifier: '',
    isNIAsset: IsNIAsset.BOTH,
    minionId: '',
    isPeak: IsPeak.PEAK,
    timeFrequency: TimeFrequency.DAILY,
    utilizationCategory: UtilizationCategory.ALL,
    peakDays: [Weekday.Monday, Weekday.Tuesday, Weekday.Wednesday, Weekday.Thursday, Weekday.Friday],
    policyOption: PolicyOption.DEFAULT,
    peakStart: undefined,
    nonPeakStart: undefined
  };

  async runQuery(query: AssetQuery, options: DataQueryRequest): Promise<DataFrameDTO> {
    const result: DataFrameDTO = { refId: query.refId, fields: [] };

    if (query.assetQueryType === AssetQueryType.METADATA) {
      let workspace_id = this.templateSrv.replace(query.workspace);
      let minion_id = this.templateSrv.replace(query.minionId);
      const conditions = [];
      if (workspace_id) {
        conditions.push(`workspace = "${workspace_id}"`);
      }
      if (minion_id) {
        conditions.push(`location.MinionId = "${minion_id}"`);
      }
      const assetFilter = conditions.join(' and ');
      let assetResponse: AssetModel[] = await this.queryAssets(assetFilter);
      result.fields = [
        { name: 'id', values: assetResponse.map(a => a.id) },
        { name: 'name', values: assetResponse.map(a => a.name) },
        { name: 'model name', values: assetResponse.map(a => a.modelName) },
        { name: 'serial number', values: assetResponse.map(a => a.serialNumber) },
        { name: 'bus type', values: assetResponse.map(a => a.busType) },
        { name: 'asset type', values: assetResponse.map(a => a.assetType) },
        { name: 'is NI asset', values: assetResponse.map(a => a.isNIAsset) },
        { name: 'calibration status', values: assetResponse.map(a => a.calibrationStatus) },
        { name: 'is system controller', values: assetResponse.map(a => a.isSystemController) },
        { name: 'workspace', values: assetResponse.map(a => a.workspace) },
        { name: 'last updated timestamp', values: assetResponse.map(a => a.lastUpdatedTimestamp) },
        { name: 'minionId', values: assetResponse.map(a => a.location.minionId) },
        { name: 'parent name', values: assetResponse.map(a => a.location.parent) },
        { name: 'system name', values: assetResponse.map(a => a.location.systemName) },
        {
          name: 'calibration due date',
          values: assetResponse.map(a => a.externalCalibration?.nextRecommendedDate)
        },
      ];
      return result;
    } else {
      let workspace_id = this.templateSrv.replace(query.workspace);
      // fetch and process utilization raw data for chosen assets/systems
      const utilization_array = await this.fetchAndProcessUtilizationData(query, options);
      let utilization_array_with_alias: Array<{ id: string, datetimes: number[], values: number[], alias: string }>;
      const idsArray = utilization_array.map((data) => {
        return data.id
      });
      // find and add aliases to data
      if (query.entityType === EntityType.SYSTEM) {
        const filterArr: string[] = [];
        idsArray.forEach((id) => {
          filterArr.push(`id == "${id}" `);
        });
        const filterStr = workspace_id ? `(${filterArr.join(' or ')}) and workspace = "${workspace_id}"` : filterArr.join(' or ');
        const systems = await this.querySystems(filterStr, defaultProjection);
        utilization_array_with_alias = utilization_array.map(system_utilization_df => {
          const foundItem = systems.find((system: SystemMetadata) => system.id === system_utilization_df.id);
          return { ...system_utilization_df, alias: foundItem ? foundItem.alias : 'System' };
        });
      } else {
        const filterArr: string[] = [];
        idsArray.forEach((id) => {
          filterArr.push(`AssetIdentifier == "${id}"`);
        });
        const filterStr = workspace_id ? ` (${filterArr.join(' or ')}) and workspace = "${workspace_id}"` : filterArr.join(' or ');
        const assetsResponse = await this.queryAssets(filterStr, -1);
        utilization_array_with_alias = utilization_array.map(asset_utilization_df => {
          const foundItem = assetsResponse.find((asset: AssetModel) => asset.id === asset_utilization_df.id);
          return { ...asset_utilization_df, alias: foundItem ? foundItem.name : 'Asset' };
        });
      }
      const suffix = `${isPeakLabels[query.isPeak]} ${timeFrequencyLabels[query.timeFrequency]}`;
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
              displayName: `${data.alias} ${suffix}`,
              unit: '%',
              min: 0,
              max: 100
            }
          }
        )
      })
      return result;
    }
  }

  shouldRunQuery(_: AssetQuery): boolean {
    return true;
  }

  private async fetchAndProcessUtilizationData(query: AssetQuery, options: DataQueryRequest): Promise<Array<{
    id: string,
    datetimes: number[],
    values: number[]
  }>> {
    const [from, to] = [options.range.from.valueOf(), options.range.to.valueOf()];
    const workspace_id = this.templateSrv.replace(query.workspace);
    const minion_id = this.templateSrv.replace(query.minionId);
    // this value is set in the Datasource -> Query options -> Max data points
    const maxDataPoints = options.maxDataPoints;
    let continuationToken = '';
    const {
      assetIdentifier,
      minionId,
      utilizationCategory,
      isPeak,
      peakDays,
      timeFrequency
    } = query;
    const workingHoursPolicy = {
      'startTime': momentToTime(dateTime(query.peakStart)),
      'endTime': momentToTime(dateTime(query.nonPeakStart))
    }
    const utilizationFilter: string = utilizationCategory === UtilizationCategory.TEST ? `Category = \"Test\" or Category = \"test\"` : '';
    let arrayOfEntityIds: string[];
    if (query.entityType === EntityType.ASSET) {
      arrayOfEntityIds = replaceVariables([assetIdentifier], this.templateSrv);
    } else {
      arrayOfEntityIds = replaceVariables([minionId], this.templateSrv);
    }
    // filter empty values
    arrayOfEntityIds = arrayOfEntityIds.filter(Boolean);
    const resultArray: Array<{
      id: string,
      datetimes: number[],
      values: number[]
    }> = [];
    if (!arrayOfEntityIds.length) {
      if (query.entityType === EntityType.ASSET) {
        let conditions: string[] = [];
        if (workspace_id) {
          conditions.push(`workspace = "${workspace_id}"`);
        }
        if (minion_id) {
          conditions.push(`Location.MinionId = "${minion_id}"`);
        }
        const assetFilter = conditions.join(' and ');
        const assetsResponse = await this.queryAssets(assetFilter, 25);
        arrayOfEntityIds = assetsResponse.map((asset) => {
          return asset.id;
        })
      } else {
        let filterString = '';
        if (query.workspace) {
          filterString += `workspace = "${query.workspace}"`;
        }
        let systemMetadata = await this.post<{ data: SystemMetadata[] }>(this.sysmgmtUrl + '/query-systems', {
          filter: filterString,
          projection: `new(${defaultProjection.join()})`,
          orderBy: defaultOrderBy,
          take: 10
        });
        arrayOfEntityIds = systemMetadata.data.map((system) => {
          return system.id;
        })
      }
    }
    for (let index = 0; index < arrayOfEntityIds.length; index++) {
      let data: AssetUtilizationHistory[] = [];
      let requestCount = 0;
      do {
        try {
          let requestBody: QueryAssetUtilizationHistoryRequest = {
            "utilizationFilter": utilizationFilter,
            "continuationToken": continuationToken,
            "orderBy": AssetUtilizationOrderBy.START_TIMESTAMP,
            "orderByDescending": false
          }
          if (query.entityType === EntityType.ASSET) {
            requestBody.assetFilter = `assetIdentifier = "${arrayOfEntityIds[index]}"`;
          } else {
            requestBody.assetFilter = `Location.MinionId = "${arrayOfEntityIds[index]}" and isSystemController = true`;
          }
          const response: AssetUtilizationHistoryResponse = await this.post<AssetUtilizationHistoryResponse>(this.baseUrl + '/query-asset-utilization-history', requestBody);
          requestCount++;
          continuationToken = response.continuationToken || '';
          data = data.concat(response.assetUtilizations);
        } catch (error) {
          throw new Error(`An error occurred while retrieving utilization history: ${error}`);
        }
      } while (continuationToken && (maxDataPoints && requestCount < maxDataPoints));

      // let utilization_data: { id: string, datetimes: Date, values: number[] };
      let dataWithoutOverlaps: Array<Interval<number>> = [];
      if (data.length) {
        const extractedTimestamps = extractTimestampsFromData(data);
        // Fill missing endTimestamps
        const patchedData = patchMissingEndTimestamps(extractedTimestamps);
        // Removes data outside the grafana 'from' and 'to' range from an array
        const filteredData = filterDataByTimeRange(patchedData, from, to);
        // Merge overlapping utilizations
        dataWithoutOverlaps = mergeOverlappingIntervals(filteredData);
      }
      // Divide given time range to peak/non-peak intervals
      const businessIntervals = divideTimeRangeToBusinessIntervals(new Date(from), new Date(to), workingHoursPolicy, peakDays, timeFrequency);
      // Group raw utilization data by intervals
      const overlaps = groupDataByIntervals(businessIntervals, dataWithoutOverlaps, peakDays, isPeak);
      // Calculate utilization percentage by intervals
      const utilization = calculateUtilization(overlaps);
      // patch zero points to data for better visualisation
      const patchedUtilization = patchZeroPoints(utilization, new Date(from), new Date(to), timeFrequency);

      let utilization_data: { id: string, datetimes: number[], values: number[] } =
        {
          id: arrayOfEntityIds[index],
          datetimes: patchedUtilization.map(v => dateTime(v.day).valueOf()),
          values: patchedUtilization.map(v => v.utilization)
        }
      resultArray.push(utilization_data);
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

  async querySystems(filter = '', projection = defaultProjection): Promise<SystemMetadata[]> {
    try {
      let response = await this.post<{ data: SystemMetadata[] }>(this.sysmgmtUrl + '/query-systems', {
        filter: filter,
        projection: `new(${projection.join()})`,
        orderBy: defaultOrderBy,
      });
      return response.data;
    } catch (error) {
      throw new Error(`An error occurred while querying systems: ${error}`);
    }
  }

  async testDatasource(): Promise<TestingStatus> {
    await this.get(this.baseUrl + '/assets');
    return { status: 'success', message: 'Data source connected and authentication successful!' };
  }

  async metricFindQuery({ minionId }: AssetVariableQuery): Promise<MetricFindValue[]> {
    const minionID = this.templateSrv.replace(minionId);
    const filter = minionID ? `Location.MinionId = \"${minionID}\"` : '';
    const assetsResponse: AssetModel[] = await this.queryAssets(filter);
    return assetsResponse.map((asset: AssetModel) => ({ text: asset.name, value: asset.id }));
  }
}
