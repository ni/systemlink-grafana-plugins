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
  AssetCalibrationForecastKey,
  AssetCalibrationQuery,
  AssetCalibrationTimeBasedGroupByType,
  CalibrationForecastResponse,
} from './types';
import { transformComputedFieldsQuery } from 'core/query-builder.utils';
import { AssetComputedDataFields } from './constants';
import { AssetModel, AssetsResponse } from 'datasources/asset-common/types';

export class AssetCalibrationDataSource extends DataSourceBase<AssetCalibrationQuery> {
  public defaultQuery = {
    groupBy: [],
    filter: ''
  };

  constructor(
    readonly instanceSettings: DataSourceInstanceSettings,
    readonly backendSrv: BackendSrv = getBackendSrv(),
    readonly templateSrv: TemplateSrv = getTemplateSrv(),
  ) {
    super(instanceSettings, backendSrv, templateSrv);
  }

  baseUrl = this.instanceSettings.url + '/niapm/v1';

  async runQuery(query: AssetCalibrationQuery, options: DataQueryRequest): Promise<DataFrameDTO> {
    if (query.filter) {
      query.filter = this.templateSrv.replace(transformComputedFieldsQuery(query.filter, AssetComputedDataFields), options.scopedVars);
    }

    return await this.processCalibrationForecastQuery(query as AssetCalibrationQuery, options);
  }

  async processCalibrationForecastQuery(query: AssetCalibrationQuery, options: DataQueryRequest) {
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

  isGroupByTime(query: AssetCalibrationQuery) {
    return query.groupBy.includes(AssetCalibrationTimeBasedGroupByType.Day) ||
      query.groupBy.includes(AssetCalibrationTimeBasedGroupByType.Week) ||
      query.groupBy.includes(AssetCalibrationTimeBasedGroupByType.Month);
  }

  processResultsGroupedByTime(result: DataFrameDTO) {
    result.fields.forEach(field => {
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
      formattedFields[0].values!.push(result.fields[columnIndex].name)
      formattedFields[1].values!.push(result.fields[columnIndex].values?.at(0))
    }

    result.fields = formattedFields;
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

  shouldRunQuery(calibrationQuery: AssetCalibrationQuery): boolean {
    return calibrationQuery.groupBy.length > 0;
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

  async testDatasource(): Promise<TestDataSourceResponse> {
    await this.get(this.baseUrl + '/assets?take=1');
    return { status: 'success', message: 'Data source connected and authentication successful!' };
  }
}
