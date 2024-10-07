import { FieldDTO } from '@grafana/data'
import { DataQuery } from '@grafana/schema'

export interface CalibrationForecastQuery extends DataQuery {
}

export interface CalibrationForecastResponse {
    calibrationForecast: CalibrationForecastModel
}

export interface CalibrationForecastModel {
    columns: FieldDTO[],
}