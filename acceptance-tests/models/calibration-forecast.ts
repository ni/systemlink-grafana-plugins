export interface CalibrationForecastResponse {
    calibrationForecast: {
        columns: (TimeColumn | CountColumn)[];
    };
}

export interface TimeColumn {
    name: string;
    columnDescriptors: Array<{ type: 'Time'; value: string }>;
    values: string[];
}

export interface CountColumn {
    name: string;
    columnDescriptors: Array<{ type: 'Count'; value: string }>;
    values: number[];
}
