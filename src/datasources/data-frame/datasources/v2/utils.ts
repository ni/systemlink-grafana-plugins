/**
 * Utility functions for DataFrameDataSourceV2
 */

const FILTER_MAX_LENGTH = 20000;

export interface CombinedFilterResult {
    filter: string;
    substitutions: string[];
    isValid: boolean;
    errorMessage?: string;
}

/**
 * Combines result IDs, data table filter, and columns filter into a single LINQ filter expression
 * @param resultIds - Array of result IDs from query-results API
 * @param dataTableFilter - LINQ filter for data table properties
 * @param columnsFilter - LINQ filter for column properties
 * @returns Combined filter with substitutions and validation status
 */
export function buildCombinedFilter(
    resultIds: string[] = [],
    dataTableFilter?: string,
    columnsFilter?: string
): CombinedFilterResult {
    const filterParts: string[] = [];
    const substitutions: string[] = [];

    // Add result IDs filter if available
    if (resultIds.length > 0) {
        const placeholders = resultIds.map((_, index) => `@${index}`).join(', ');
        filterParts.push(`new[] {${placeholders}}.Contains(testResultId)`);
        substitutions.push(...resultIds);
    }

    // Add data table filter if available
    if (dataTableFilter && dataTableFilter.trim() !== '') {
        filterParts.push(`(${dataTableFilter})`);
    }

    // Add columns filter if available
    if (columnsFilter && columnsFilter.trim() !== '') {
        // Convert column name filter to LINQ Any expression
        // Example: name == "columnName" becomes columns.Any(it.Name == "columnName")
        const columnsFilterExpression = convertToColumnsAnyExpression(columnsFilter);
        filterParts.push(`(${columnsFilterExpression})`);
    }

    // Combine all filters with AND operator
    const combinedFilter = filterParts.join(' && ');

    // Validate filter length
    if (combinedFilter.length > FILTER_MAX_LENGTH) {
        return {
            filter: '',
            substitutions: [],
            isValid: false,
            errorMessage: `Filter string exceeds maximum length of ${FILTER_MAX_LENGTH} characters. Current length: ${combinedFilter.length}. Please reduce the number of filters or result IDs.`
        };
    }

    return {
        filter: combinedFilter,
        substitutions,
        isValid: true
    };
}

/**
 * Converts a column name filter expression to a LINQ Any expression
 * @param columnsFilter - Original filter expression for column names
 * @returns LINQ Any expression for columns collection
 */
function convertToColumnsAnyExpression(columnsFilter: string): string {
    // Replace field name 'name' with 'it.Name' for the Any expression
    // This is a simplified conversion - may need to be more sophisticated based on actual filter structure
    const anyExpression = columnsFilter
        .replace(/\bname\b/gi, 'it.Name')
        .trim();
    
    return `columns.Any(${anyExpression})`;
}

/**
 * Builds a filter string for querying tables by result IDs only
 * @param resultIds - Array of result IDs
 * @returns Filter expression with substitutions
 */
export function buildResultIdFilter(resultIds: string[]): CombinedFilterResult {
    if (resultIds.length === 0) {
        return {
            filter: '',
            substitutions: [],
            isValid: true
        };
    }

    const placeholders = resultIds.map((_, index) => `@${index}`).join(', ');
    const filter = `new[] {${placeholders}}.Contains(testResultId)`;

    if (filter.length > FILTER_MAX_LENGTH) {
        return {
            filter: '',
            substitutions: [],
            isValid: false,
            errorMessage: `Result ID filter exceeds maximum length. Too many result IDs (${resultIds.length}).`
        };
    }

    return {
        filter,
        substitutions: resultIds,
        isValid: true
    };
}
