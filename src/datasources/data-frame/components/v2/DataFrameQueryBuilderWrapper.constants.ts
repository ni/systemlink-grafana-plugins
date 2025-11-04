export const labels = {
    queryByResultsProperties: 'Query by results properties',
    queryByDataTableProperties: 'Query by data table properties',
    queryByColumnProperties: 'Query by column properties',
};

export const tooltips = {
    queryByResultsProperties: 'This optional field applies a filter to query results associated with the data tables.',
    queryByDataTableProperties: 'This optional field applies a filter to a query while searching the data tables.',
    queryByColumnProperties: 'This optional field applies a filter to query columns within the data tables. At least one filter must be configured in the results query builder before column name filters can be applied.',
};

/**
 * Layout constants following Grafana's 8px grid system.
 * These default values can be overridden by parent components.
 */
export const defaultLabelWidth = 25;
export const defaultValueWidth = 65.5;
