import { TAKE_LIMIT } from 'datasources/data-frame/constants';

export const labels = {
    queryType: 'Query type',
    dataTableProperties: 'Data table properties',
    columnProperties: 'Column properties',
    queryConfigurations: 'Query configurations',
    columnConfigurations: 'Column configurations',
    decimationSettings: 'Decimation settings',
    columns: 'Columns',
    filterNulls: 'Filter nulls',
    includeIndexColumns: 'Include index columns',
    decimationMethod: 'Decimation method',
    xColumn: 'X-column',
    useTimeRange: 'Use time range',
    take: 'Take',
};

export const tooltips = {
    queryType: 'This field specifies the type for the query that searches the data tables. The query can retrieve row data or metadata.',
    take: 'This field sets the maximum number of records to return from the query.',
    columns: 'Specifies the columns to include in the response data.',
    filterNulls: 'Specifies whether to filter out null and NaN values before decimating the data.',
    includeIndexColumns: 'Specifies whether to include index columns in the response data.',
    dataTableProperties: 'This field specifies the data table properties to be queried.',
    columnProperties: 'This field specifies the column properties to be queried.',
    decimationMethod: 'Specifies the method used to decimate the data.',
    xColumn: 'Specifies the column to use for the x-axis when decimating the data.',
    useTimeRange: 'Specifies whether to query only for data within the dashboard time range if the table index is a timestamp. Enable when interacting with your data on a graph.',
};

export const placeholders = {
    dataTableProperties: 'Select data table properties to fetch',
    columnProperties: 'Select column properties to fetch',
    take: 'Enter record count',
    columns: 'Select columns',
    xColumn: 'Select x-column',
};

export const errorMessages = {
    take: {
        greaterOrEqualToZero: 'The take value must be greater than or equal to 0.',
        lessOrEqualToTakeLimit: `The take value must be less than or equal to ${TAKE_LIMIT}.`,
    },
};

/**
 * Converts Grafana grid units to pixels.
 * Grafana uses an 8px grid system, so 1 unit = 8 pixels.
 */
export const getValuesInPixels = (valueInGrafanaUnits: number): string => {
    return valueInGrafanaUnits * 8 + 'px';
};

/**
 * Layout constants following Grafana's 8px grid system.
 * Each unit represents 8 pixels (e.g., 25 units = 200px).
 */
export const inlineLabelWidth = 25;
export const valueFieldWidth = 65.5;
export const inlineMarginBetweenLabelAndField = 0.5;
export const sectionWidth = inlineLabelWidth + valueFieldWidth + inlineMarginBetweenLabelAndField;
