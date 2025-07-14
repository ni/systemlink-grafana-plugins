import { FilterExpressions, FilterOperations } from "core/query-builder.constants";

export function dateTimeExpressionBuilderCallback(dataField: string, operation: string): string {
    const operationExpressionMap: { [key: string]: string } = {
        [FilterOperations.DateTimeIsBlank]: FilterExpressions.DateTimeIsBlank,
        [FilterOperations.DateTimeIsNotBlank]: FilterExpressions.DateTimeIsNotBlank,
    };

    const expressionTemplate = operationExpressionMap[operation];
    if (!expressionTemplate) {
        return '';
    }
    return expressionTemplate.replace(/\{0\}/g, dataField);
}

export function dateTimeExpressionReaderCallback(expression: string, bindings: string[]): { fieldName: string; value: string } {
    const matches = expression.match(/"([^"]*)"/g)?.map(m => m.slice(1, -1)) ?? [];
    if (matches.length < 1) {
        return { fieldName: bindings[0], value: '' };
    }
    return { fieldName: bindings[0], value: matches[0] };
};
