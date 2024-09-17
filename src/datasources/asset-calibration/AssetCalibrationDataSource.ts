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
  AssetCalibrationQuery,
  AssetModel,
  AssetsResponse,
  CalibrationForecastResponse,
} from './types';
import { SystemMetadata } from "../system/types";
import { defaultOrderBy, defaultProjection } from "../system/constants";

export class AssetCalibrationDataSource extends DataSourceBase<AssetCalibrationQuery> {
  constructor(
    readonly instanceSettings: DataSourceInstanceSettings,
    readonly backendSrv: BackendSrv = getBackendSrv(),
    readonly templateSrv: TemplateSrv = getTemplateSrv()
  ) {
    super(instanceSettings, backendSrv, templateSrv);
  }

  defaultQuery = {
    groupBy: [],
  };

  baseUrl = this.instanceSettings.url + '/niapm/v1';

  async runQuery(query: AssetCalibrationQuery, options: DataQueryRequest): Promise<DataFrameDTO> {
    return await this.processCalibrationForecastQuery(query as AssetCalibrationQuery, options);
  }
  async processCalibrationForecastQuery(query: AssetCalibrationQuery, options: DataQueryRequest) {
    const result: DataFrameDTO = { refId: query.refId, fields: [] };
    const from = options.range!.from.toISOString();
    const to = options.range!.to.toISOString();

    const calibrationForecastResponse: CalibrationForecastResponse = await this.queryCalibrationForecast(query.groupBy, from, to);

    result.fields = calibrationForecastResponse.calibrationForecast.columns || [];
    result.fields = result.fields.map(field => this.formatField(field, query));
    result.fields = this.formatResultsWhenNoTimeSpecified(result, query);

    return result;
  }

  formatResultsWhenNoTimeSpecified(result: DataFrameDTO, query: AssetCalibrationQuery): FieldDTO[] {
    if (query.groupBy.includes(AssetCalibrationForecastGroupByType.Day) ||
      query.groupBy.includes(AssetCalibrationForecastGroupByType.Week) ||
      query.groupBy.includes(AssetCalibrationForecastGroupByType.Month)) {

      return result.fields;
    }

    const formattedFields = [] as FieldDTO[];
    formattedFields.push({ name: "Group", values: [] } as FieldDTO);
    formattedFields.push({ name: "Assets", values: [] } as FieldDTO);

    for (let columnIndex = 0; columnIndex < result.fields.length; columnIndex++) {
      formattedFields[0].values?.push(result.fields[columnIndex].name)
      formattedFields[1].values?.push(result.fields[columnIndex].values?.at(0))
    }

    return formattedFields;
  }

  formatField(field: FieldDTO, query: AssetCalibrationQuery): FieldDTO {
    if (!field.values) {
      return field;
    }

    if ([AssetCalibrationForecastKey.Day,
      AssetCalibrationForecastKey.Week,
      AssetCalibrationForecastKey.Month].includes(field.name as AssetCalibrationForecastKey)) {
      field.values = this.formatTimeField(field.values, query);
      return field;
    }

    return field;
  }

  formatTimeField(values: string[], query: AssetCalibrationQuery): string[] {
    const timeGrouping = query.groupBy.find(item =>
      [AssetCalibrationForecastGroupByType.Day,
      AssetCalibrationForecastGroupByType.Week,
      AssetCalibrationForecastGroupByType.Month].includes(item as AssetCalibrationForecastGroupByType)
    ) as AssetCalibrationForecastGroupByType | undefined;

    const formatFunctionMap = {
      [AssetCalibrationForecastGroupByType.Day]: this.formatDateForDay,
      [AssetCalibrationForecastGroupByType.Week]: this.formatDateForWeek,
      [AssetCalibrationForecastGroupByType.Month]: this.formatDateForMonth,
      [AssetCalibrationForecastGroupByType.Location]: (v: string) => v,
      [AssetCalibrationForecastGroupByType.Model]: (v: string) => v,
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

  shouldRunQuery(_: AssetCalibrationQuery): boolean {
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
