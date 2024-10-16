import { FieldDTO } from '@grafana/data'
import { DataQuery } from '@grafana/schema'
import { AssetQueryType } from './types';

export interface CalibrationForecastQuery extends DataQuery {
    queryType: AssetQueryType;
}

export interface CalibrationForecastResponse {
    calibrationForecast: CalibrationForecastModel
}

export interface CalibrationForecastModel {
    columns: FieldDTO[],
}
