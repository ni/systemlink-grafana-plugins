import { TAKE_LIMIT } from 'datasources/data-frame/constants';

/**
 * Converts Grafana grid units to pixels
 * @param valueInGrafanaUnits Value in Grafana's grid system units (multiples of 8)
 * @returns The pixel value as a string
 */
export const getValuesInPixels = (valueInGrafanaUnits: number) => {
    return valueInGrafanaUnits * 8 + 'px';
};

/**
 * Layout constants for the DataFrameQueryEditorV2 component.
 * The following values are multiples of 8 to align with Grafana's grid system.
 * For example, 25 in Grafana units is equal to 25*8 = 200px.
 */
export const INLINE_LABEL_WIDTH = 25;
export const VALUE_FIELD_WIDTH = 65.5;
export const INLINE_MARGIN_BETWEEN_LABEL_AND_FIELD = 0.5;
export const DEFAULT_MARGIN_BOTTOM = 1;
export const SECTION_WIDTH = INLINE_LABEL_WIDTH + VALUE_FIELD_WIDTH + INLINE_MARGIN_BETWEEN_LABEL_AND_FIELD;

/**
 * UI labels for the DataFrameQueryEditorV2 component
 */
export const labels = {
    queryType: 'Query type',
    dataTableProperties: 'Data table properties',
    columnProperties: 'Column properties',
    queryConfigurations: 'Query configurations',
    columnConfigurations: 'Column configurations',
    decimationSettings: 'Decimation settings',
    queryByDataTableProperties: 'Query by data table properties',
    queryByResults: 'Query by results',
    queryByColumnProperties: 'Query by column properties',
    columns: 'Columns',
    filterNulls: 'Filter nulls',
    includeIndexColumns: 'Include index columns',
    decimationMethod: 'Decimation method',
    xColumn: 'X-column',
    useTimeRange: 'Use time range',
    take: 'Take',
};

/**
 * Tooltips for the DataFrameQueryEditorV2 component
 */
export const tooltips = {
    queryType: 'This field specifies the type for the query that searches the data tables. The query can retrieve row data or metadata.',
    queryByDataTableProperties: 'This optional field applies a filter to a query while searching the data tables.',
    queryByResults: 'This optional field applies a filter to a results query while searching the data tables.',
    queryByColumnProperties: 'This optional field applies a filter to a columns query while searching the data tables.',
    take: 'This field sets the maximum number of records to return from the query.',
    columns: 'Specifies the columns to include in the response data.',
    filterNulls: `Specifies whether to filter out null and NaN values before decimating the data.`,
    includeIndexColumns: 'Specifies whether to include index columns in the response data.',
    dataTableProperties: 'This field specifies the data table properties to be queried.',
    columnProperties: 'This field specifies the column properties to be queried.',
    decimationMethod: 'Specifies the method used to decimate the data.',
    xColumn: 'Specifies the column to use for the x-axis when decimating the data.',
    useTimeRange: `Specifies whether to query only for data within the dashboard time range if the
                table index is a timestamp. Enable when interacting with your data on a graph.`,
};

/**
 * Placeholders for the DataFrameQueryEditorV2 component
 */
export const placeholders = {
    dataTableProperties: 'Select data table properties to fetch',
    columnProperties: 'Select column properties to fetch',
    take: 'Enter record count',
    columns: 'Select columns',
    xColumn: 'Select x-column',
};

/**
 * Error messages for the DataFrameQueryEditorV2 component
 */
export const errorMessages = {
    take: {
        greaterOrEqualToZero: 'The take value must be greater than or equal to 0.',
        lessOrEqualToTakeLimit: `The take value must be less than or equal to ${TAKE_LIMIT}.`
    }
};
