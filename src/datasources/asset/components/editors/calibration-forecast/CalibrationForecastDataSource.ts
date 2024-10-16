import { DataQueryRequest, DataFrameDTO, DataSourceInstanceSettings, FieldDTO, TestDataSourceResponse } from '@grafana/data';
import { AssetDataSourceOptions, AssetQuery, AssetQueryType } from '../../../types/types';
import { BackendSrv, getBackendSrv, getTemplateSrv, TemplateSrv } from '@grafana/runtime';
import { AssetDataSourceBase } from '../AssetDataSourceBase';
import { AssetCalibrationForecastKey, AssetCalibrationTimeBasedGroupByType, AssetType, AssetTypeOptions, BusType, BusTypeOptions, CalibrationForecastQuery, CalibrationForecastResponse, ColumnDescriptorType, FieldDTOWithDescriptor } from '../../../types/CalibrationForecastQuery.types';
import { ExpressionTransformFunction, transformComputedFieldsQuery } from '../../../../../core/query-builder.utils';
import { AssetModel, AssetsResponse } from '../../../../asset-common/types';
import { AssetCalibrationFieldNames } from '../../../constants';
import { QueryBuilderOperations } from '../../../../../core/query-builder.constants';

export class CalibrationForecastDataSource extends AssetDataSourceBase {
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
        queryType: AssetQueryType.CalibrationForecast,
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

        return await this.processCalibrationForecastQuery(calibrationForecastQuery, options);
    }

    shouldRunQuery(calibrationQuery: CalibrationForecastQuery): boolean {
        return calibrationQuery.groupBy.length > 0;
    }

    async testDatasource(): Promise<TestDataSourceResponse> {
        await this.get(this.baseUrl + '/assets?take=1');
        return { status: 'success', message: 'Data source connected and authentication successful!' };
    }

    private readonly assetComputedDataFields = new Map<AssetCalibrationFieldNames, ExpressionTransformFunction>([
        ...Object.values(AssetCalibrationFieldNames).map(field => [field, this.multipleValuesQuery(field)] as [AssetCalibrationFieldNames, ExpressionTransformFunction]),
        [
            AssetCalibrationFieldNames.LOCATION,
            (value: string, operation: string, options?: Map<string, unknown>) => {
                let values = [value];

                if (this.isMultiSelectValue(value)) {
                    values = this.getMultipleValuesArray(value);
                }

                if (values.length > 1) {
                    return `(${values.map(val => `Location.MinionId ${operation} "${val}"`).join(` ${this.getLocicalOperator(operation)} `)})`;
                }

                if (options?.has(value)) {
                    return `Location.MinionId ${operation} "${value}"`
                }

                return `(Location.MinionId ${operation} "${value}" ${this.getLocicalOperator(operation)} Location.PhysicalLocation ${operation} "${value}")`;
            }
        ]
    ]);

    private multipleValuesQuery(field: AssetCalibrationFieldNames): ExpressionTransformFunction {
        return (value: string, operation: string, _options?: any) => {
            if (this.isMultiSelectValue(value)) {
                const query = this.getMultipleValuesArray(value)
                    .map(val => `${field} ${operation} "${val}"`)
                    .join(` ${this.getLocicalOperator(operation)} `);

                return `(${query})`;
            }

            return `${field} ${operation} "${value}"`
        }
    }

    private isMultiSelectValue(value: string): boolean {
        return value.startsWith('{') && value.endsWith('}');
    }

    private getMultipleValuesArray(value: string): string[] {
        return value.replace(/({|})/g, '').split(',');
    }

    private getLocicalOperator(operation: string): string {
        return operation === QueryBuilderOperations.EQUALS.name ? '||' : '&&';
    }

    private readonly queryTransformationOptions = new Map<AssetCalibrationFieldNames, Map<string, unknown>>([
        [AssetCalibrationFieldNames.LOCATION, this.systemAliasCache]
    ]);

    async processCalibrationForecastQuery(query: CalibrationForecastQuery, options: DataQueryRequest) {
        const result: DataFrameDTO = { refId: query.refId, fields: [] };
        const from = options.range!.from.toISOString();
        const to = options.range!.to.toISOString();

        const calibrationForecastResponse: CalibrationForecastResponse = await this.queryCalibrationForecast(query.groupBy, from, to, query.filter);

        result.fields = calibrationForecastResponse.calibrationForecast.columns || [];
        if (this.isGroupByTime(query)) {
            this.processResultsGroupedByTime(result)
        } else {
            this.processResultsGroupedByProperties(result)
        }

        return result;
    }

    isGroupByTime(query: CalibrationForecastQuery) {
        return query.groupBy.includes(AssetCalibrationTimeBasedGroupByType.Day) ||
            query.groupBy.includes(AssetCalibrationTimeBasedGroupByType.Week) ||
            query.groupBy.includes(AssetCalibrationTimeBasedGroupByType.Month);
    }

    processResultsGroupedByTime(result: DataFrameDTO) {
        result.fields.forEach(field => {
            field.name = this.createColumnNameFromDescriptor(field as FieldDTOWithDescriptor);
            switch (field.name) {
                case AssetCalibrationForecastKey.Day:
                    field.values = field.values!.map(this.formatDateForDay)
                    break;
                case AssetCalibrationForecastKey.Week:
                    field.values = field.values!.map(this.formatDateForWeek)
                    break;
                case AssetCalibrationForecastKey.Month:
                    field.values = field.values!.map(this.formatDateForMonth)
                    break;
                default:
                    break;
            }
        });
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

    async queryCalibrationForecast(groupBy: string[], startTime: string, endTime: string, filter = ''): Promise<CalibrationForecastResponse> {
        let data = { groupBy, startTime, endTime, filter };
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
