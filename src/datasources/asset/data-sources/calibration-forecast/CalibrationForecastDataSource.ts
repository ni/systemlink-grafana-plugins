import { DataQueryRequest, DataFrameDTO, DataSourceInstanceSettings, FieldDTO, TestDataSourceResponse, DataLink } from '@grafana/data';
import { AssetDataSourceOptions, AssetQuery, AssetQueryType, AssetType, AssetTypeOptions, BusType, BusTypeOptions } from '../../types/types';
import { BackendSrv, getBackendSrv, getTemplateSrv, TemplateSrv, locationService } from '@grafana/runtime';
import { AssetDataSourceBase } from '../AssetDataSourceBase';
import { AssetCalibrationForecastKey, AssetCalibrationTimeBasedGroupByType, CalibrationForecastQuery, CalibrationForecastResponse, ColumnDescriptorType, FieldDTOWithDescriptor } from '../../types/CalibrationForecastQuery.types';
import { transformComputedFieldsQuery } from '../../../../core/query-builder.utils';
import { AssetModel, AssetsResponse } from '../../../asset-common/types';
import { from, map, Observable, switchMap } from 'rxjs';

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

    runQuery(query: AssetQuery, options: DataQueryRequest): Observable<DataFrameDTO> {
        const calibrationForecastQuery = query as CalibrationForecastQuery;

        return from(this.dependenciesLoadedPromise).pipe(
            switchMap(() => {
                this.validateQueryRange(calibrationForecastQuery, options);

                if (calibrationForecastQuery.filter) {
                    calibrationForecastQuery.filter = transformComputedFieldsQuery(
                        this.templateSrv.replace(calibrationForecastQuery.filter, options.scopedVars),
                        this.assetComputedDataFields,
                        this.queryTransformationOptions
                    );
                }

                return this.processCalibrationForecastQuery$(calibrationForecastQuery, options);
            }));
    }

    shouldRunQuery(query: CalibrationForecastQuery): boolean {
        return !query.hide && (query.groupBy.length > 0);
    }

    async testDatasource(): Promise<TestDataSourceResponse> {
        await this.get(this.baseUrl + '/assets?take=1');
        return { status: 'success', message: 'Data source connected and authentication successful!' };
    }

    processCalibrationForecastQuery$(query: CalibrationForecastQuery, options: DataQueryRequest): Observable<DataFrameDTO> {
        const result: DataFrameDTO = { refId: query.refId, fields: [] };
        const from = options.range!.from.utc().toISOString();
        const to = options.range!.to.utc().toISOString();

        return this.queryCalibrationForecast$(
            query.groupBy,
            from,
            to,
            query.filter
        ).pipe(
            map((calibrationForecastResponse: CalibrationForecastResponse) => {
                result.fields = calibrationForecastResponse.calibrationForecast.columns || [];

                const timeGrouping = this.getTimeGroup(query);
                if (timeGrouping) {
                    this.processResultsGroupedByTime(result, timeGrouping, options);
                } else {
                    this.processResultsGroupedByProperties(result);
                }

                return result;}));
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

    processResultsGroupedByTime(result: DataFrameDTO, timeGrouping: AssetCalibrationForecastKey, options: DataQueryRequest) {
        const originalValuesMap = this.constructDataLinkValuesMap(result, options);
        result.fields.forEach(field => {
            field.name = this.createColumnNameFromDescriptor(field as FieldDTOWithDescriptor);
            const formatter = this.forecastDateFormatterMap.get(field.name as AssetCalibrationForecastKey);

            if (formatter) {
                field.values = field.values!.map(formatter);
            }

            if (!formatter) {
                field.config = { links: this.createDataLinks(timeGrouping, originalValuesMap) };
            }
        });
    }

    private constructDataLinkValuesMap(result: DataFrameDTO, options: DataQueryRequest): Map<string, { from: number, to: number }> {
        const originalValuesMap = new Map<string, { from: number, to: number }>();
        if (result.fields.length > 0) {
            const field = result.fields[0];
            const originalValues = field.values as string[] ?? [];
            const formatter = this.forecastDateFormatterMap.get(field.name as AssetCalibrationForecastKey);
            if (formatter) {
                let value = { from: 0, to: 0 }
                const formattedValues: string[] = field.values!.map(formatter);
                if (originalValues.length === 0) {
                    return originalValuesMap;
                }
                else if (originalValues.length === 1) {
                    value.from = options.range.from.utc().toDate().valueOf();
                    value.to = options.range.to.utc().toDate().valueOf();

                    originalValuesMap.set(formattedValues![0], value);
                } else {
                    for (let i = 0; i < originalValues!.length; i++) {
                        value = { from: 0, to: 0 }
                        if (i === 0) {
                            value.from = options.range.from.utc().toDate().valueOf();
                            value.to = new Date(originalValues[i + 1]).valueOf();
                        }
                        else if (i === originalValues!.length - 1) {
                            value.from = new Date(originalValues[i]).valueOf();
                            value.to = options.range.to.utc().toDate().valueOf();
                        }
                        else {
                            value.from = new Date(originalValues[i]).valueOf();
                            value.to = new Date(originalValues[i + 1]).valueOf();
                        }
                        originalValuesMap.set(formattedValues![i], value);
                    }
                }
            }
        }

        return originalValuesMap;
    }

    private constructDataLinkBaseUrl() {
        const pathname = locationService.getLocation().pathname;
        return pathname + '?orgId=${__org.id}&${__all_variables}';
    }

    private createDataLinks(timeGrouping: AssetCalibrationForecastKey, originalValuesMap: Map<string, { from: any, to: any }>): DataLink[] {
        const url = this.constructDataLinkBaseUrl();
        return [
            {
                title: `View ${timeGrouping}`, targetBlank: false, url: `${url}`,
                onBuildUrl: function (options) {
                    if (!options.replaceVariables) {
                        return url;
                    }
                    const value = options.replaceVariables(`\${__data.fields.${timeGrouping}}`);
                    if (!value) {
                        return url;
                    }
                    const valueAsDate = originalValuesMap.get(value)!;
                    return `${url}&from=${valueAsDate?.from}&to=${valueAsDate?.to}`;
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
        const startDate = new Date(date);
        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        return `${startDate.toISOString().split('T')[0]} : ${endDate.toISOString().split('T')[0]}`;
    }

    formatDateForMonth(date: string): string {
        return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', timeZone: 'UTC' });
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

    queryCalibrationForecast$(groupBy: string[], startTime: string, endTime: string, filter = '', includeOnlyDataInTimeRange = true): Observable<CalibrationForecastResponse> {
        let data = { groupBy, startTime, endTime, filter, includeOnlyDataInTimeRange };
        try {
            let response = this.post$<CalibrationForecastResponse>(this.baseUrl + '/assets/calibration-forecast', data);
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
