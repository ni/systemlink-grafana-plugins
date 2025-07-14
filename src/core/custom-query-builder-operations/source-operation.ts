import { FilterExpressions, FilterOperations } from "core/query-builder.constants";

export function sourceExpressionBuilderCallback(_: string, operation: string, value: string): string {
    const operationExpressionMap: { [key: string]: string } = {
        [FilterOperations.SourceEquals]: FilterExpressions.SourceEquals,
    };

    const expressionTemplate = operationExpressionMap[operation];
    if (!expressionTemplate) {
        return '';
    }
    console.log(expressionTemplate.replace(/\{0\}/g, value));
    return expressionTemplate.replace(/\{0\}/g, value);
}

export function sourceExpressionReaderCallback(expression: string, bindings: string[]): { fieldName: string, value: string} {
    console.log(expression);
    return { fieldName: 'PartNumber', value: bindings[0] }
}
