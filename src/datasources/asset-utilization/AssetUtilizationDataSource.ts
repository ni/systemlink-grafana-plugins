import {
    DataFrameDTO,
    DataQueryRequest,
    DataSourceInstanceSettings,
    dateTime,
} from '@grafana/data';
import {BackendSrv, getBackendSrv, getTemplateSrv, TemplateSrv, TestingStatus} from '@grafana/runtime';
import {DataSourceBase} from 'core/DataSourceBase';
import {
    AssetsResponse,
    AssetUtilizationHistory, AssetUtilizationHistoryResponse,
    AssetUtilizationQuery,
    IsNIAsset,
    IsPeak,
    ServicePolicyModel,
    UtilizationCategory,
    UtilizationTimeFrequency,
    ValidAssetUtilizationQuery,
    Weekday
} from './types';
import deepEqual from "fast-deep-equal";
import {
    calculateDailyUtilization, convertTimeToUTC, extractTimestampesFromData,
    filterDataByTimeRange,
    getBusinessHours, getLocalTimezoneOffsetInHours,
    getStartEndDates,
    mergeOverlappingIntervals,
    patchMissingEndTimestamps, splitIntervalsByDays
} from "./helper";

export class AssetUtilizationDataSource extends DataSourceBase<AssetUtilizationQuery> {
    constructor(
        readonly instanceSettings: DataSourceInstanceSettings,
        readonly backendSrv: BackendSrv = getBackendSrv(),
        readonly templateSrv: TemplateSrv = getTemplateSrv()
    ) {
        super(instanceSettings, backendSrv, templateSrv);
    }

    baseUrl = this.instanceSettings.url + '/niapm/v1';

    defaultQuery: Omit<ValidAssetUtilizationQuery, 'refId'> = {
        assetIdentifier: '',
        isNIAsset: IsNIAsset.BOTH,
        minionId: '',
        isPeak: IsPeak.PEAK,
        timeFrequency: UtilizationTimeFrequency.DAILY,
        utilizationCategory: UtilizationCategory.ALL,
        peakDays: [Weekday.Monday, Weekday.Tuesday, Weekday.Wednesday, Weekday.Thursday, Weekday.Friday],
    };

    async runQuery(query: AssetUtilizationQuery, options: DataQueryRequest): Promise<DataFrameDTO> {
        const processedQuery = this.processQuery(query);
        const {range} = options;
        const from = (new Date(range!.from.valueOf())).toISOString();
        const to = (new Date(range!.to.valueOf())).toISOString();

        query.assetIdentifier = getTemplateSrv().replace(query.assetIdentifier, options.scopedVars);
        // todo add time range logic to onLoadUtilizationHistory
        const result: DataFrameDTO = {refId: query.refId, fields: []};

        const utilization = await this.onLoadUtilizationHistory(processedQuery, new Date(from).getTime(), new Date(to).getTime())

        result.fields = [
            {name: 'time', values: utilization.datetimes},
            {name: `${query.assetIdentifier} - ${query.refId}`, values: utilization.values},
        ];
        console.log('result', result)
        return result;
    }

    shouldRunQuery(query: ValidAssetUtilizationQuery): boolean {
        return Boolean(query.assetIdentifier && query.minionId)
    }

    processQuery(query: AssetUtilizationQuery): ValidAssetUtilizationQuery {
        const migratedQuery = {...this.defaultQuery, ...query};
        // If we didn't make any changes to the query, then return the original object
        return deepEqual(migratedQuery, query) ? query as ValidAssetUtilizationQuery : migratedQuery
    };

    private async onLoadUtilizationHistory(query: ValidAssetUtilizationQuery, from: number, to: number): Promise<{
        datetimes: number[],
        values: number[]
    }> {
        let data: AssetUtilizationHistory[] = [];
        let continuationToken = null;
        let {assetIdentifier, utilizationCategory, isPeak, peakDays, timeFrequency} = query

        let workingHoursPolicy = (await this.getServiceWorkingHoursPolicy()).workingHoursPolicy
        let offset = getLocalTimezoneOffsetInHours()
        let workingHoursPolicyUTC = convertTimeToUTC(workingHoursPolicy.startTime, workingHoursPolicy.endTime, offset)
        let utilizationFilter = ""
        if (utilizationCategory === UtilizationCategory.TEST) {
            utilizationFilter = `Category = \"Test\" or Category = \"test\"`
        }
        do {
            try {
                const response: AssetUtilizationHistoryResponse = await this.post<AssetUtilizationHistoryResponse>(this.baseUrl + '/query-asset-utilization-history', {
                    "assetFilter": `AssetIdentifier = "${assetIdentifier}"`,
                    "utilizationFilter": utilizationFilter,
                    "continuationToken": continuationToken,
                    "take": 1000,
                    "orderBy": "START_TIMESTAMP",
                    "orderByDescending": false
                })

                if (response.continuationToken !== '') {
                    continuationToken = response.continuationToken;
                } else {
                    continuationToken = null;
                }

                data = data.concat(response.assetUtilizations);
            } catch (error) {
                console.error(`Error fetching 'query-asset-utilization-history':`, error);
                return {datetimes: [], values: []};
            }
        } while (continuationToken);

        if (data.length === 0) {
            return {
                datetimes: [],
                values: []
            }
        }

        const extractedTimestamps = extractTimestampesFromData(data)

        // Fill missing endTimestamps
        const patchedData = patchMissingEndTimestamps(extractedTimestamps)

        // Removes data outside the grafana 'from' and 'to' range from an array
        const filteredData = filterDataByTimeRange(patchedData, from, to)

        // Merge overlapping utilizations
        const dataWithoutOverlaps = mergeOverlappingIntervals(filteredData)

        //smallest startTimestamp and biggest endTimestamp
        const [smallestStartTimestamp, biggestEndTimestamp] = getStartEndDates(dataWithoutOverlaps)

        // todo add null utilization to chart if data not exists
        const dailyBusinessHoursArray = getBusinessHours(smallestStartTimestamp, biggestEndTimestamp, workingHoursPolicyUTC, isPeak, peakDays, timeFrequency)

        const overlaps = splitIntervalsByDays(dailyBusinessHoursArray, dataWithoutOverlaps, peakDays, isPeak)

        const utilization = calculateDailyUtilization(overlaps)

        return {
            datetimes: utilization.map(v => dateTime(v.day).valueOf()),
            values: utilization.map(v => v.utilization)
        }

    }

    private async getServiceWorkingHoursPolicy(): Promise<ServicePolicyModel> {
        return await this.get<ServicePolicyModel>(this.baseUrl + '/policy')
    }

    async queryAssets(filter: string, take = -1) {
        let data = {filter, take}
        try {
            let response = await this.post<AssetsResponse>(this.baseUrl + '/query-assets', data)
            console.log('queryAssets response', response)
            return response.assets
        } catch (e) {
            console.log('error', e)
            return []
        }
    }

    async testDatasource(): Promise<TestingStatus> {
        const testRequestBody = {
            "assetFilter": "IsNIAsset = true",
            "utilizationIntervals": [
                {
                    "startDate": "2019-05-01T00:00:00Z",
                    "endDate": "2023-07-24T12:22:56.570Z"
                }
            ]
        }
        this.post(this.baseUrl + '/query-asset-utilization', testRequestBody)
        return {status: 'success', message: 'Data source connected and authentication successful!'};
    }
}
