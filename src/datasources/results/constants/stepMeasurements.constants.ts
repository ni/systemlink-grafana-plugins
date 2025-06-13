export enum MeasurementProperties {
    NAME = 'name',
    STATUS = 'status',
    UNITS = 'units',
    MEASUREMENT = 'measurement',
    LOW_LIMIT = 'lowLimit',
    HIGH_LIMIT = 'highLimit'
};

export const measurementProperties: MeasurementProperties[] = [
    MeasurementProperties.NAME,
    MeasurementProperties.STATUS,
    MeasurementProperties.LOW_LIMIT,
    MeasurementProperties.HIGH_LIMIT
];

export const measurementColumnLabelSuffix: Record<MeasurementProperties, string> = {
    [MeasurementProperties.NAME]: '',
    [MeasurementProperties.STATUS]: 'Status',
    [MeasurementProperties.UNITS]: '',
    [MeasurementProperties.MEASUREMENT]: '',
    [MeasurementProperties.LOW_LIMIT]: 'Low Limit',
    [MeasurementProperties.HIGH_LIMIT]: 'High Limit'
};

export const MEASUREMENT_NAME_COLUMN = MeasurementProperties.NAME;
export const MEASUREMENT_UNITS_COLUMN = MeasurementProperties.UNITS;


const MEASUREMENT_COLUMN_NAME_FORMAT = '{name} ({unit})';

export function formatMeasurementValueColumnName(measurementName: string, unit: string): string {
    if (!unit) {
        return measurementName;
    }
    return MEASUREMENT_COLUMN_NAME_FORMAT.replace('{name}', measurementName).replace('{unit}', unit);
}

const COLUMN_NAME_FORMAT = '{name}-{suffix}';

export function formatMeasurementColumnName(name: string, suffix: string): string {
    if(!suffix) {
        return name;
    }
    return COLUMN_NAME_FORMAT.replace('{name}', name).replace('{suffix}', suffix);
};
