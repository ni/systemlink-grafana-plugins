import { QueryBuilderCustomOperation } from "smart-webcomponents-react";
import { QBField, QueryBuilderOption } from "./types";
import { QueryBuilderOperations } from "./query-builder.constants";

/**
 * Should be used when looking to build a custom expression for a field
 * @param value The value to be transformed
 * @param operation The operation to be performed
 * @param options The options to be used in the transformation
 * @returns The transformed value
 */
export type ExpressionTransformFunction = (value: string, operation: string, options?: Map<string, unknown>) => string;

/**
 * Supported operations for computed fields
 */
export const computedFieldsupportedOperations = ['=', '!=', '>', '>=', '<', '<='];

const startEndOperations = ['StartsWith', 'EndsWith'];

/**
 * The function will replace the computed fields with their transformation
 * Example: object = "value" => object1.prop1 = "value" || object1.prop2 = "value"
 * @param query Query builder provided string
 * @param computedDataFields Object with computed fields and their transformations
 * @param options Object with options for the computed fields
 * @returns Updated query with computed fields transformed
 */
export function transformComputedFieldsQuery(
  query: string,
  computedDataFields: Map<string, ExpressionTransformFunction>,
  options?: Map<string, Map<string, unknown>>
) {
  for (const [field, transformation] of computedDataFields.entries()) {
    query = transformBasedOnComputedFieldSupportedOperations(query, field, transformation, options);
    query = transformBasedOnBlankOperations(query, field, transformation, options);
    query = transformBasedOnContainsOperations(query, field, transformation, options);
    query = transformListContainsOperations(query, field, transformation, options);
    query = transformBasedOnStartAndEndOperations(query, field, transformation, options);
  }

  return query;
}

function transformBasedOnComputedFieldSupportedOperations(query: string, field: string, transformation: ExpressionTransformFunction, options?: Map<string, Map<string, unknown>>) {
  const regex = new RegExp(String.raw`\b${field}\s*(${computedFieldsupportedOperations.join('|')})\s*"([^"]*)"`, 'g');

  return query.replace(regex, (_match, operation, value) => {
    return transformation(value, operation, options?.get(field));
  });
}

function transformBasedOnBlankOperations(query: string, field: string, transformation: ExpressionTransformFunction, options?: Map<string, Map<string, unknown>>) {
  const nullOrEmptyRegex = new RegExp(String.raw`(!)?string\.IsNullOrEmpty\(${field}\)`, 'g');

  return query.replace(nullOrEmptyRegex, (_match, negation) => {
    const operation = negation
      ? QueryBuilderOperations.IS_NOT_BLANK.name
      : QueryBuilderOperations.IS_BLANK.name;
    return transformation(field, operation, options?.get(field));
  });
}

function transformBasedOnContainsOperations(query: string, field: string, transformation: ExpressionTransformFunction, options?: Map<string, Map<string, unknown>>) {
  const containsRegex = new RegExp(String.raw`(?:!(\(${field}\.Contains\("([^"]*)"\)\))|(${field}\.Contains\("([^"]*)"\)))`, 'g');

  return query.replace(containsRegex, (_match, _negatedMatch, negatedValue, _positiveMatch, positiveValue) => {
    const isNegated = negatedValue !== undefined;
    const extractedValue = negatedValue || positiveValue;

    const operation = isNegated
      ? QueryBuilderOperations.DOES_NOT_CONTAIN.name
      : QueryBuilderOperations.CONTAINS.name;
    return transformation(extractedValue, operation, options?.get(field));
  });
}

/** 
 * Transforms fields using StartsWith and EndsWith operations by applying computed field transformations.
 * This handles conversion of string operations on computed fields to their underlying property expressions.
 * 
 * For example:
 * Input: Object1.StartsWith("value1")
 * Output: obj.prop1.StartsWith(value1)
 * 
 * Input: Object2.EndsWith("value2")
 * Output: obj.prop2.EndsWith(value2)
 * 
 * @param query Query string containing one or more StartsWith/EndsWith operations to be transformed.
 * @param field Name of the field on which the StartsWith/EndsWith operation is performed.
 * @param transformation Callback function that transforms the value based on the operation.
 * @param options Optional configuration for the transformation.
 * @returns Transformed query string with StartsWith/EndsWith operations processed.
 */
function transformListContainsOperations(
  query: string,
  field: string,
  transformation: ExpressionTransformFunction,
  options?: Map<string, Map<string, unknown>>
) {
  const listOperationRegex = new RegExp(String.raw`\b${field}\.Any\s*\((.*)\)`, 'g');

  return query.replace(listOperationRegex, (_match, innerPredicate: string) => {
    const containsRegex = /(?:!(it\.Contains\("([^"]*)"\))|(it\.Contains\("([^"]*)"\)))/g;

    const transformedPredicate = innerPredicate.replace(containsRegex, (_match, _negatedMatch, negatedValue, _positiveMatch, positiveValue) => {
      const extractedValue = negatedValue || positiveValue;
      return transformation(extractedValue, QueryBuilderOperations.LIST_CONTAINS.name, options?.get(field));
    });

    const isNegated = /^!/.test(innerPredicate.trim());
    return isNegated ? `!${field}.Any(${transformedPredicate})` : `${field}.Any(${transformedPredicate})`;
  });
}

/** 
 * The function will replace fields with StartsWith and EndsWith operations with their transformation.
 * 
 * @param query Query string containing one or more instances of the starts with/ ends with operation to be transformed.
 * @param field Name of the field on which the starts with/ ends with operation is performed.
 * @param transformation callback function that transforms the value based on the operation.
 * @param options The options to be used in the transformation
 * @returns Transformed query string with starts with/ ends with operation processed.
 */
function transformBasedOnStartAndEndOperations(
  query: string,
  field: string,
  transformation: ExpressionTransformFunction,
  options?: Map<string, Map<string, unknown>>
) {
  const regex = new RegExp(String.raw`\b${field}\.(${startEndOperations.join('|')})\s*\("([^"]*)"\)`, 'g');

  return query.replace(regex, (_match, operation, value) => {
    const operationName = operation === 'StartsWith'
      ? QueryBuilderOperations.STARTS_WITH.name
      : QueryBuilderOperations.ENDS_WITH.name;
    return transformation(value, operationName, options?.get(field));
  });
}

/**
 * Builds the expression from the provided template
 * @param expressionTemplate The expression template of the @see QueryBuilderCustomOperation
 * @param field The field to be used in the expression
 * @param value The value to be used in the expression
 * @returns The built expression
 */
export function buildExpressionFromTemplate(expressionTemplate: string | undefined, field: string, value?: string) {
  return expressionTemplate?.replace('{0}', field).replace('{1}', value ?? '');
}

/**
 * The callback will replace the option's label with it's value
 * @param fields Array of QBField objects representing all fields
 * @returns callback to be used by query builder when building the query
 */
export function expressionBuilderCallback(fields: QBField[]) {
  return function (this: QueryBuilderCustomOperation, fieldName: string, _operation: string, value: string) {
    const buildExpression = (field: string, value: string) => {
      const options = getOptionsFromFields(fields);
      const fieldOptions = options[field];
      if (fieldOptions?.length) {
        const labelValue = fieldOptions.find(option => option.label === value);

        if (labelValue) {
          value = labelValue.value;
        }
      }

      return buildExpressionFromTemplate(this.expressionTemplate, field, value);
    };

    return buildExpression(fieldName, value);
  };
}

/**
 * The callback will replace the option's value with it's label
 * @param fields Array of QBField objects representing all fields
 * @returns callback to be used by query builder when reading the query
 */
export function expressionReaderCallback(fields: QBField[]) {
  return function (_expression: string, [fieldName, value]: string[]) {
    const resolvedFieldName = resolveFieldName(fields, fieldName);
    const options = getOptionsFromFields(fields);
    const fieldOptions = options[resolvedFieldName];
    let resolvedValue = value;

    if (fieldOptions?.length) {
      const valueLabel = fieldOptions.find(option => option.value === value);

      if (valueLabel) {
        resolvedValue = valueLabel.label;
      }
    }

    return { fieldName: resolvedFieldName, value: resolvedValue };
  };
}

/**
 * Replaces the label with its corresponding value using the latest options from the reference.
 * @param optionsRef - Reference object containing the latest field options.
 * @returns Callback to be used by query builder when building the query
 */
export function expressionBuilderCallbackWithRef(optionsRef: React.MutableRefObject<Record<string, QueryBuilderOption[]>>) {
  return function (this: QueryBuilderCustomOperation, fieldName: string, _operation: string, value: string) {
    const buildExpression = (field: string, value: string) => {
      const options = optionsRef.current;
      const fieldOptions = options[fieldName];

      value = getOptionMappedValue('label', 'value', value, fieldOptions) ?? value;

      return buildExpressionFromTemplate(this.expressionTemplate, field, value);
    };

    return buildExpression(fieldName, value);
  };
}

/**
 * Replaces the value with its corresponding label using the latest options from the reference.
 * @param optionsRef - Reference object containing the latest field options.
 * @returns Callback to be used by query builder when reading the query
 */
export function expressionReaderCallbackWithRef(optionsRef: React.MutableRefObject<Record<string, QueryBuilderOption[]>>) {
  return function (_expression: string, [fieldName, value]: string[]) {
    const options = optionsRef.current;
    const fieldOptions = options[fieldName];

    value = getOptionMappedValue('value', 'label', value, fieldOptions) ?? value;

    return { fieldName, value };
  };
}

/**
 * Returns a function that formats a query string using the given @param `field` as the time field.
 * The returned function takes `value` and `operation`, replacing '${__now:date}' in value with the current date in ISO format if matched.
 */
export function timeFieldsQuery(field: string): ExpressionTransformFunction {
  return (value: string, operation: string): string => {
    const formattedValue = value === '${__now:date}' ? new Date().toISOString() : value;

    return `${field} ${operation} "${formattedValue}"`;
  };
}

/**
 * Returns a function that builds a query expression for list fields.
 * When the operation is listcontains, it transforms it to a Contains operation on the inner field named 'it'.
 * 
 * for example:
 * Input: field = "keywords", value = "{key1,key2}", operation = "listcontains"
 * Output: (it.Contains("key1") || it.Contains("key2"))
 * 
 * @param field - The name of the list field to be queried.
 * @returns Callback function that builds a query expression for list fields.
 */
export function listFieldsQuery(field: string): ExpressionTransformFunction {
  return (value: string, operation: string, options?: Map<string, unknown>) => {
    const [updatedFieldName, updatedOperation] = operation === QueryBuilderOperations.LIST_CONTAINS.name
      ? ['it', QueryBuilderOperations.CONTAINS.name]
      : [field, operation];

    return multipleValuesQuery(updatedFieldName)(value, updatedOperation);
  };
}

/**
 * Transforms a field query to support both single and multi-value inputs.
 * Returns a function that builds the correct query expression for the given field, value(s), and operation.
 *
 * For example:
 * Single value:
 * Input: field = "status", value = "active", operation = "="
 * Output: status = "active"
 *
 * Multi-value:
 * Input: field = "status", value = "{active,pending}", operation = "!="
 * Output: (status != "active" && status != "pending")
 *
 * @param field - The name of the field to be queried.
 * @returns A function that takes a value and an operation, and returns a formatted query string.
 */
export function multipleValuesQuery(field: string): ExpressionTransformFunction {
  return (value: string, operation: string, _options?: any) => {
    const isMultiSelect = isMultiValueExpression(value);
    const valuesArray = getMultipleValuesArray(value);
    const logicalOperator = getConcatOperatorForMultiExpression(operation);

    return isMultiSelect
      ? `(${valuesArray.map(val => buildExpression(field, val, operation)).join(` ${logicalOperator} `)})`
      : buildExpression(field, value, operation);
  };
}

/**
 * Gets the logical operator for a given query operation when building multi-value expressions
 * or combining multiple properties.
 * 
 * Use Cases:
 * 1. Multi-value fields: Combines expressions when using multi-value variables
 *    Example: status = "{active,pending}" → (status = "active" || status = "pending")
 * 
 * 2. Multi property fields: Combines expressions when a field corresponds to multiple properties
 *    Example: source != "sys1" → (system != "sys1" && minionId != "sys1")
 *  
 * @param operation The operation to be checked.
 * @returns The logical operator as a string.
 */
export function getConcatOperatorForMultiExpression(operation: string): string {
  return (
    operation === QueryBuilderOperations.EQUALS.name
    || operation === QueryBuilderOperations.CONTAINS.name
    || operation === QueryBuilderOperations.IS_NOT_BLANK.name
    || operation === QueryBuilderOperations.STARTS_WITH.name
    || operation === QueryBuilderOperations.ENDS_WITH.name
  )
    ? '||'
    : '&&';
}

/**
 * Builds a query expression for a specific field, value, and operation.
 * @param field - The name of the field to be queried.
 * @param value - The value to be used in the query.
 * @param operation - The operation to be applied.
 * @returns The constructed query expression as a string.
 */
function buildExpression(field: string, value: string, operation: string): string {
  const operationConfig = Object.values(QueryBuilderOperations).find(op => op.name === operation);
  const expressionTemplate = operationConfig?.expressionTemplate;

  if (expressionTemplate) {
    return buildExpressionFromTemplate(expressionTemplate, field, value) ?? '';
  }

  return `${field} ${operation} "${value}"`;
}

/**
 * Checks if the given value is a multi-value expression.
 * @param value The value to be checked.
 * @returns True if the value is a multi-value expression, false otherwise.
 */
function isMultiValueExpression(value: string): boolean {
  return value.startsWith('{') && value.endsWith('}');
}

/**
 * Extracts the individual values from a multi-value expression.
 * @param value The multi-value expression to be processed.
 * @returns An array of individual values.
 */
function getMultipleValuesArray(value: string): string[] {
  return value.replace(/({|})/g, '').split(',');
}

/**
 * Returns the value of returnKey from the matching entry in the options array.
 * @param matchKey - The property name to match on.
 * @param returnKey - The property name whose value should be returned from the found option.
 * @param matchValue - The value to match against the matchKey property.
 * @param options - The array of QueryBuilderOption objects to search.
 * @returns The value of returnKey from the found option, or undefined if not found or input is not an array.
 */
function getOptionMappedValue(
  matchKey: keyof QueryBuilderOption,
  returnKey: keyof QueryBuilderOption,
  matchValue: string,
  options?: QueryBuilderOption[]
) {
  if (!options) {
    return undefined;
  }

  const option = options.find(option => option[matchKey] === matchValue);

  return option ? option[returnKey] : undefined;
}

/**
 * Finds the matching field name from the list of fields based on the provided fieldName.
 * This is useful for handling truncated nested field names in the QueryBuilder library.
 * example: 'grains.data.osfullname' becomes 'data.osfullname'
 * @param fields - Array of QBField objects representing all fields.
 * @param fieldName - The field name to be matched (may be truncated).
 * @returns The full matching field name if found, otherwise returns the original fieldName.
 */
function resolveFieldName(fields: QBField[], fieldName: string): string {
  const matchingField = fields.find(field => field.dataField?.endsWith(fieldName));
  return matchingField?.dataField || fieldName;;
}

/**
 * Generates a mapping of field dataField names to their corresponding lookup dataSource options.
 * @param fields - Array of QBField objects.
 * @returns A record mapping each field's dataField to its lookup dataSource array.
 */
function getOptionsFromFields(fields: QBField[]) {
  return Object.values(fields).reduce((accumulator, fieldConfig) => {
    if (fieldConfig.lookup) {
      accumulator[fieldConfig.dataField!] = fieldConfig.lookup.dataSource;
    }

    return accumulator;
  }, {} as Record<string, QueryBuilderOption[]>);
}
