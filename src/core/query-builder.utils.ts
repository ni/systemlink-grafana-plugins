import { QueryBuilderCustomOperation } from "smart-webcomponents-react";
import { QueryBuilderOption } from "./types";

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
    const regex = new RegExp(`\\b${field}\\s*(${computedFieldsupportedOperations.join('|')})\\s*"([^"]*)"`, 'g');

    query = query.replace(regex, (_match, operation, value) => {
      return transformation(value, operation, options?.get(field));
    });
  }

  return query;
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

      return this.expressionTemplate?.replace('{0}', field).replace('{1}', value);
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

      return this.expressionTemplate?.replace('{0}', field).replace('{1}', value);
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
