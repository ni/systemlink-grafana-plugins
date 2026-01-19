import { COLUMN_OPTIONS_LIMIT } from 'datasources/data-frame/constants';

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
    queryByResultProperties: 'Query by result properties',
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
    queryType: 'This field specifies the type of query that searches the data tables. The query can retrieve row data or metadata.',
    queryByDataTableProperties: 'This field applies a datatable properties filter while searching data tables.',
    queryByResultProperties: 'This field applies a results filter while searching data tables.',
    queryByColumnProperties: 'This field applies a column filter while searching data tables.',
    take: 'This field sets the maximum number of records to return from the query.',
    undecimatedRecordCount: 'This field sets the maximum number of rows to return from the query.',
    columns: 'Specifies the columns to include in the response data.',
    filterNulls: `Specifies whether to filter out null and NaN values before decimating the data.`,
    includeIndexColumns: 'Specifies whether to include index columns in the response data.',
    dataTableProperties: 'This field specifies the data table properties to be queried.',
    columnProperties: 'This field specifies the column properties to be queried.',
    decimationMethod: 'Specifies the method used to decimate the data.',
    xColumn: `Specifies the column to use as the x-axis when decimating the data. If this field is left blank, INDEX column will be used.`,
    useTimeRange: `Applies the dashboard time range to the selected x-column or alternatively to INDEX column (if either is a timestamp).`,
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
        greaterOrEqualToZero: 'Enter a value greater than or equal to 1.',
        lessOrEqualToTakeLimit: 'Enter a value less than or equal to {TAKE_LIMIT}.'
    },
    columnLimitExceeded: `The tables query returned too many columns. Only the first ${COLUMN_OPTIONS_LIMIT} columns are shown in the selection list.`,
    xColumnLimitExceeded: `The tables query returned too many columns. Only the first ${COLUMN_OPTIONS_LIMIT} columns are shown in the x-column selection list.`,
    xColumnSelectionInvalid: 'The selected x-column is not available in all the tables matching the query.',
    propertiesNotSelected: 'At least one data table property or column property must be selected.',
};

/**
 * Informational messages for the DataFrameQueryEditorV2 component
 */
export const infoMessage = {
    queryOptimization: {
        title: 'Query optimization',
        message: `Queries may significantly impact resource utilization.`,
        linkText: 'Click this link to learn more about data frame query optimization.',
        linkUrl: 'https://www.ni.com/r/dfs-db-query-performance',
    },
    datasourceHelp: 'For more information, refer to the datasource help documentation.',
    width: 88.75,
}
