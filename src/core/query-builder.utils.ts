import { QueryBuilderCustomOperation } from "smart-webcomponents-react";
import { QueryBuilderOption } from "./types";
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
 * Builds the expression from the provided template
 * @param expressionTemplate The expression template of the @see QueryBuilderCustomOperation
 * @param field The field to be used in the expression (replaces {0})
 * @param value The value to be used in the expression (replaces {1} or {2} depending on template)
 * @param additionalParam Optional additional parameter for templates with 3+ placeholders (replaces {2})
 * @returns The built expression
 */
export function buildExpressionFromTemplate(expressionTemplate: string | undefined, field: string, value?: string, additionalParam?: string) {
  if (!expressionTemplate) {
    return '';
  }

  // For collection property expressions like '{0}.Any(it.{1} = "{2}")'
  // field format should be 'collection.property' which we need to split
  if (expressionTemplate.includes('{2}')) {
    const parts = field.split('.');
    if (parts.length === 2) {
      // field is in format 'collection.property'
      const [collection, property] = parts;
      return expressionTemplate
        .replace('{0}', collection)
        .replace('{1}', property)
        .replace('{2}', value ?? '');
    }
    // Fallback: if additionalParam is provided, use it
    if (additionalParam !== undefined) {
      return expressionTemplate
        .replace('{0}', field)
        .replace('{1}', value ?? '')
        .replace('{2}', additionalParam);
    }
  }

  // Standard two-placeholder template
  return expressionTemplate.replace('{0}', field).replace('{1}', value ?? '');
}

/**
 * The callback will replace the option's label with it's value
 * @param options Object with value, label object properties, that hold the dropdown values
 * @returns callback to be used by query builder when building the query
 */
export function expressionBuilderCallback(options: Record<string, QueryBuilderOption[]>) {
  return function (this: QueryBuilderCustomOperation, fieldName: string, _operation: string, value: string) {
    const buildExpression = (field: string, value: string) => {
      const fieldOptions = options[fieldName];
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
 * @param options Object with value, label object properties, that hold the dropdown values
 * @returns callback to be used by query builder when reading the query
 */
export function expressionReaderCallback(options: Record<string, QueryBuilderOption[]>) {
  return function (_expression: string, [fieldName, value]: string[]) {
    const fieldOptions = options[fieldName];

    if (fieldOptions?.length) {
      const valueLabel = fieldOptions.find(option => option.value === value);

      if (valueLabel) {
        value = valueLabel.label;
      }
    }

    return { fieldName, value };
  }
};

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
  return operation === QueryBuilderOperations.EQUALS.name || operation === QueryBuilderOperations.CONTAINS.name || operation === QueryBuilderOperations.IS_NOT_BLANK.name
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
