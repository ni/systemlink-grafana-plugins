export enum UnaryOperator {
    StringIsBlank = 'strisblank',
    StringIsNotBlank = 'strisnotblank',
    ListIsEmpty = 'list_is_empty',
    ListIsNotEmpty = 'list_is_not_empty'
}

export enum BinaryOperator {
    Equals = '===', NotEquals = '!==',
    BooleanEquals = 'boolean_equals', BooleanDoesNotEqual = 'boolean_not_equals',
    IsGreaterThan = '>', IsGreaterThanOrEqual = '>=', IsSmallerThan = '<', IsSmallerThanOrEqual = '<=',
    StringIncludes = 'strincludes', StringDoesNotInclude = 'strnotincludes',
    IsInList = 'is_in_list', IsNotInList = 'is_not_in_list',
    ListElementContains = 'list_element_contains', NoListElementContains = 'no_list_element_contains',
    ContainsKey = 'contains_key', NotContainsKey = 'not_contains_key',
    StartsWith = 'startswith'
}

export enum DateOperator {
    DateIsGreaterThan = 'date>',
    DateIsGreaterThanOrEqual = 'date>=',
    DateIsSmallerThan = 'date<',
    DateIsSmallerThanOrEqual = 'date<='
}

export enum DateTimeOperator {
    DateTimeIsGreaterThan = 'datetime>',
    DateTimeIsSmallerThan = 'datetime<',
    DateTimeIsEmpty = 'datetime_is_blank',
    DateTimeIsNotEmpty = 'datetime_is_not_blank'
}

export enum KeyValueOperator {
    KeyValueMatches = 'key_value_matches',
    KeyValueDoesNotMatch = 'key_value_not_matches',
    KeyValueContains = 'key_value_contains',
    KeyValueDoesNotContain = 'key_value_not_contains',
    KeyValueIsGreaterThan = 'key_value_>',
    KeyValueIsGreaterThanOrEqual = 'key_value_>=',
    KeyValueIsLessThan = 'key_value_<',
    KeyValueIsLessThanOrEqual = 'key_value_<=',
    KeyValueIsNumericallyEqual = 'key_value_===',
    KeyValueIsNumericallyNotEqual = 'key_value_!==',
    KeyValueStartsWith = 'key_value_starts_with',
    KeyValueDoesNotStartWith = 'key_value_not_starts_with'
}

export enum LogicalOperator {
    And = 'and',
    Or = 'or'
}

export type BinaryOperand = string | boolean | number;
export type DateOperand = string;
export interface KeyValueOperand {
    key: string; 
    value: string | number;
}

export type QueryExpression = [string, UnaryOperator | string]
    | [string, BinaryOperator | string, BinaryOperand]
    | [string, DateOperator | DateTimeOperator | string, DateOperand]
    | [string, KeyValueOperator | string, KeyValueOperand];

export type FirstLevelQueryObject = LogicalOperator | QueryExpression;
export type FirstLevelQueryObjects = FirstLevelQueryObject[];

export type QueryFilterObject = LogicalOperator | FirstLevelQueryObjects;
export type QueryFilterObjects = QueryFilterObject[];

export function isOperatorInEnum(operator: string, enumType: any): boolean {
    return Object.values(enumType).includes(operator);
}

export function binaryOperandToString(operand: BinaryOperand): string {
    switch (typeof operand) {
        case 'string':
            return operand;
        case 'number':
            return `${operand}`;
        case 'boolean':
            return operand ? 'true' : 'false';
        default:
            throw new Error(`Unsupported type on a BinaryOperand: ${typeof operand}`);
    }
}

export function keyValueOperandToString(operand: KeyValueOperand): string {
    switch (typeof operand.value) {
        case 'string':
            return operand.value;
        case 'number':
            return `${operand.value}`;
        default:
            throw new Error(`Unsupported type on a KeyValueOperand: ${typeof operand.value}`);
    }
}

/**
 * Used to check for an empty filter. Evaluates whether query filter objects
 * has any actual queries (does not equal [], [[]] or [[[]]]).
 */
export function isEmptyFilter(queryFilterObjects: QueryFilterObjects | undefined | null): boolean {
    return !queryFilterObjects?.[0]?.[0];
}

/**
 * Provides common filter object filters for clients
 */
export class QueryFilterObjectFilters {
    /**
     * Provides a value to set to clear a filter.
     */
    public static get emptyFilter(): QueryFilterObjects {
        return [
            []
        ];
    }
}
