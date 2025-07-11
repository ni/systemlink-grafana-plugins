import { FilterExpressions, FilterOperations } from "core/query-builder.constants";

export function sourceExpressionBuilderCallback(_: string, operation: string, value: string): string {
    const operationExpressionMap: { [key: string]: string } = {
        [FilterOperations.SourceEquals]: FilterExpressions.SourceEquals,
    };

    const expressionTemplate = operationExpressionMap[operation];
    if (!expressionTemplate) {
        return '';
    }
    return expressionTemplate.replace(/\{0\}/g, value);
}

export function sourceExpressionReaderCallback(_expression: string, bindings: string[]): { fieldName: string, value: string} {
    return { fieldName: 'PartNumber', value: bindings[0] }
}
