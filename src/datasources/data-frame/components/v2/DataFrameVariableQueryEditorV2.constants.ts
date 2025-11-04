export const labels = {
    queryType: 'Query type',
};

export const tooltips = {
    queryType: 'This field specifies the type of variable query. "List data tables" returns data table IDs or names, while "List data table columns" returns column names from matching data tables.',
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
