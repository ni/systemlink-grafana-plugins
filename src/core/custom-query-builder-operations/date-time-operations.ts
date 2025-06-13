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
