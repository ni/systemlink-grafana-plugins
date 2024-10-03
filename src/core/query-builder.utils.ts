import { QueryBuilderCustomOperation } from "smart-webcomponents-react";
import { QueryBuilderOption } from "./types";

/**
 * The function will replace the computed fields with their transformation
 * Example: object = "value" => object1.prop1 = "value" || object1.prop2 = "value"
 * @param query Query builder provided string
 * @param computedDataFields Object with computed fields and their transformations
 * @returns Updated query with computed fields transformed
 */
export function transformComputedFieldsQuery(query: string, computedDataFields: Record<string, string>) {
  for (const [field, transformation] of Object.entries(computedDataFields)) {
    const regex = new RegExp(`\\b${field}\\s*=\\s*"([^"]*)"`, 'g');
    query = query.replace(regex, (_match, value) => transformation.replace(/{value}/g, value));
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

