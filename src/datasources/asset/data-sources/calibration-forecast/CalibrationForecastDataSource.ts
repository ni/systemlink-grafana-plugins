import { DataQueryRequest, DataFrameDTO, DataSourceInstanceSettings, FieldDTO, TestDataSourceResponse, DataLink } from '@grafana/data';
import { AssetDataSourceOptions, AssetQuery, AssetQueryType, AssetType, AssetTypeOptions, BusType, BusTypeOptions } from '../../types/types';
import { BackendSrv, getBackendSrv, getTemplateSrv, TemplateSrv } from '@grafana/runtime';
import { AssetDataSourceBase } from '../AssetDataSourceBase';
import { AssetCalibrationForecastKey, AssetCalibrationTimeBasedGroupByType, CalibrationForecastQuery, CalibrationForecastResponse, ColumnDescriptorType, FieldDTOWithDescriptor } from '../../types/CalibrationForecastQuery.types';
import { transformComputedFieldsQuery } from '../../../../core/query-builder.utils';
import { AssetModel, AssetsResponse } from '../../../asset-common/types';

export class CalibrationForecastDataSource extends AssetDataSourceBase {
    private dependenciesLoadedPromise: Promise<void>;

    private readonly forecastDateFormatterMap = new Map<AssetCalibrationForecastKey, (date: string) => string>([
        [AssetCalibrationForecastKey.Day, this.formatDateForDay],
        [AssetCalibrationForecastKey.Week, this.formatDateForWeek],
        [AssetCalibrationForecastKey.Month, this.formatDateForMonth]
    ]);

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
        type: AssetQueryType.CalibrationForecast,
        groupBy: [],
        filter: ''
    };

    public readonly busTypeCache = new Map<BusType, string>([
        ...BusTypeOptions.map(busType => [busType.value, busType.label]) as Array<[BusType, string]>
    ]);
    public readonly assetTypeCache = new Map<AssetType, string>([
        ...AssetTypeOptions.map(assetType => [assetType.value, assetType.label]) as Array<[AssetType, string]>
    ]);

    async runQuery(query: AssetQuery, options: DataQueryRequest): Promise<DataFrameDTO> {
        const calibrationForecastQuery = query as CalibrationForecastQuery;
        await this.dependenciesLoadedPromise;
        this.validateQueryRange(calibrationForecastQuery, options);

        if (calibrationForecastQuery.filter) {
            calibrationForecastQuery.filter = transformComputedFieldsQuery(
                this.templateSrv.replace(calibrationForecastQuery.filter, options.scopedVars),
                this.assetComputedDataFields,
                this.queryTransformationOptions
            );
        }

        calibrationForecastQuery.IncludeOnlyDataInTimeRange = this.getQueryParam('IncludeOnlyDataInTimeRange')?.toLowerCase() === 'true';
        return await this.processCalibrationForecastQuery(calibrationForecastQuery, options);
    }

    shouldRunQuery(calibrationQuery: CalibrationForecastQuery): boolean {
        return calibrationQuery.groupBy.length > 0;
    }

    async testDatasource(): Promise<TestDataSourceResponse> {
        await this.get(this.baseUrl + '/assets?take=1');
        return { status: 'success', message: 'Data source connected and authentication successful!' };
    }

    async processCalibrationForecastQuery(query: CalibrationForecastQuery, options: DataQueryRequest) {
        const result: DataFrameDTO = { refId: query.refId, fields: [] };
        const from = options.range!.from.toISOString();
        const to = options.range!.to.toISOString();

        const calibrationForecastResponse: CalibrationForecastResponse = await this.queryCalibrationForecast(
            query.groupBy,
            from,
            to,
            query.filter,
            query.IncludeOnlyDataInTimeRange
        );

        result.fields = calibrationForecastResponse.calibrationForecast.columns || [];

        const timeGrouping = this.getTimeGroup(query);
        if (timeGrouping) {
            this.processResultsGroupedByTime(result, timeGrouping)
        } else {
            this.processResultsGroupedByProperties(result)
        }

        return result;
    }

    getTimeGroup(query: CalibrationForecastQuery) {
        if (query.groupBy.includes(AssetCalibrationTimeBasedGroupByType.Day)) {
            return AssetCalibrationForecastKey.Day;
        }
        if (query.groupBy.includes(AssetCalibrationTimeBasedGroupByType.Week)) {
            return AssetCalibrationForecastKey.Week;
        }
        if (query.groupBy.includes(AssetCalibrationTimeBasedGroupByType.Month)) {
            return AssetCalibrationForecastKey.Month;
        }
        return null;
    }

    processResultsGroupedByTime(result: DataFrameDTO, timeGrouping: AssetCalibrationForecastKey) {
        const timeFieldFirstValue = result.fields.find(field => field.name === timeGrouping)?.values?.at(0);
        const startDate = this.forecastDateFormatterMap.get(timeGrouping)!(timeFieldFirstValue);

        result.fields.forEach(field => {
            field.name = this.createColumnNameFromDescriptor(field as FieldDTOWithDescriptor);
            const formatter = this.forecastDateFormatterMap.get(field.name as AssetCalibrationForecastKey);

            if (formatter) {
                field.values = field.values!.map(formatter);
            }
            
            if (!formatter && !Boolean(this.getQueryParam('IncludeOnlyDataInTimeRange'))) {
                field.config = { links: this.createDataLinks(timeGrouping, startDate) };
            }
        });
    }

    private createDataLinks(timeGrouping: AssetCalibrationForecastKey, startDate: string): DataLink[] {
        const url = '/d/${__dashboard.uid}/${__dashboard}?orgId=${__org.id}&${__all_variables}';

        return [
            {
                title: `View ${timeGrouping}`, targetBlank: true, url: `${url}`,
                onBuildUrl: function (options) {
                    if (!options.replaceVariables) {
                        return url;
                    }

                    const value = options.replaceVariables(`\${__data.fields.${timeGrouping}}`);
                    const IncludeOnlyDataInTimeRange = value !== startDate;

                    let from, to;

                    const parseDate = (dateStr: string) => {
                        const date = new Date(dateStr);
                        date.setUTCHours(0);
                        return date;
                    };

                    switch (timeGrouping) {
                        case AssetCalibrationForecastKey.Day:
                            const dayDate = parseDate(value);
                            from = dayDate.valueOf();
                            dayDate.setUTCDate(dayDate.getUTCDate() + 1);
                            to = dayDate.valueOf();
                            break;
                        case AssetCalibrationForecastKey.Week:
                            [from, to] = value.split(' : ').map(dateStr => parseDate(dateStr).valueOf());
                            break;
                        case AssetCalibrationForecastKey.Month:
                            const monthDate = parseDate(value);
                            monthDate.setUTCDate(monthDate.getUTCDate() + 1);
                            from = monthDate.valueOf();
                            monthDate.setUTCMonth(monthDate.getUTCMonth() + 1);
                            to = monthDate.valueOf();
                            break;
                    }

                    return `${url}&from=${from}&to=${to}&IncludeOnlyDataInTimeRange=${IncludeOnlyDataInTimeRange}`;
                }
            }
        ];
    }

    processResultsGroupedByProperties(result: DataFrameDTO) {
        const formattedFields = [] as FieldDTO[];
        formattedFields.push({ name: "Group", values: [] } as FieldDTO);
        formattedFields.push({ name: "Assets", values: [] } as FieldDTO);

        for (let columnIndex = 0; columnIndex < result.fields.length; columnIndex++) {
            const columnName = this.createColumnNameFromDescriptor(result.fields[columnIndex] as FieldDTOWithDescriptor);
            const columnValue = result.fields[columnIndex].values?.at(0);
            formattedFields[0].values!.push(columnName);
            formattedFields[1].values!.push(columnValue);
        }

        result.fields = formattedFields;
    }

    createColumnNameFromDescriptor(field: FieldDTOWithDescriptor): string {
        return field.columnDescriptors.map(descriptor => {
            switch (descriptor.type) {
                case ColumnDescriptorType.MinionId:
                    return this.systemAliasCache.get(descriptor.value)?.alias || descriptor.value;
                case ColumnDescriptorType.WorkspaceId:
                    return this.workspacesCache.get(descriptor.value)?.name || descriptor.value
                case ColumnDescriptorType.AssetType:
                    return this.assetTypeCache.get(descriptor.value as AssetType) || descriptor.value;
                case ColumnDescriptorType.BusType:
                    return this.busTypeCache.get(descriptor.value as BusType) || descriptor.value;
                default:
                    return descriptor.value;
            }
        }).join(' - ');
    }

    formatDateForDay(date: string): string {
        return new Date(date).toISOString().split('T')[0];
    }

    formatDateForWeek(date: string): string {
        console.log(date);
        const startDate = new Date(date);
        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        console.log(startDate)
        return `${startDate.toISOString().split('T')[0]} : ${endDate.toISOString().split('T')[0]}`;
    }

    formatDateForMonth(date: string): string {
        return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
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

    async queryCalibrationForecast(groupBy: string[], startTime: string, endTime: string, filter = '', IncludeOnlyDataInTimeRange = false): Promise<CalibrationForecastResponse> {
        let data = { groupBy, startTime, endTime, filter, IncludeOnlyDataInTimeRange };
        try {
            let response = await this.post<CalibrationForecastResponse>(this.baseUrl + '/assets/calibration-forecast', data);
            return response;
        } catch (error) {
            throw new Error(`An error occurred while querying assets calibration forecast: ${error}`);
        }
    }

    private validateQueryRange(query: CalibrationForecastQuery, options: DataQueryRequest): void {
        const MILLISECONDS_IN_A_DAY = 1000 * 60 * 60 * 24;
        const DAYS_IN_A_MONTH = 31;
        const DAYS_IN_A_YEAR = 366;

        const from = options.range!.from;
        const to = options.range!.to;
        const numberOfDays = Math.abs(to.valueOf() - from.valueOf()) / MILLISECONDS_IN_A_DAY;

        const rangeLimits = [
            { type: AssetCalibrationTimeBasedGroupByType.Day, limit: DAYS_IN_A_MONTH * 3, groupingMethod: '3 months' },
            { type: AssetCalibrationTimeBasedGroupByType.Week, limit: DAYS_IN_A_YEAR * 2, groupingMethod: '2 years' },
            { type: AssetCalibrationTimeBasedGroupByType.Month, limit: DAYS_IN_A_YEAR * 5, groupingMethod: '5 years' }
        ];

        rangeLimits.forEach(({ type, limit, groupingMethod }) => {
            if (query.groupBy.includes(type.valueOf()) && numberOfDays > limit) {
                throw new Error(`Query range exceeds range limit of ${type} grouping method: ${groupingMethod}`);
            }
        });
    }
}
