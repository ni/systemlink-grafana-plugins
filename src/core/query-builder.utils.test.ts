import { QueryBuilderOperations } from "./query-builder.constants";
import { buildExpressionFromTemplate, expressionBuilderCallback, expressionBuilderCallbackWithRef, expressionReaderCallback, expressionReaderCallbackWithRef, ExpressionTransformFunction, getConcatOperatorForMultiExpression, listFieldsQuery, multipleValuesQuery, timeFieldsQuery, transformComputedFieldsQuery } from "./query-builder.utils"
import { QBField } from "./types";

describe('QueryBuilderUtils', () => {
  describe('transformComputedFieldsQuery', () => {
    const mockTransformation: ExpressionTransformFunction = (value, operation, _options) => {
      switch (operation) {
        case QueryBuilderOperations.IS_BLANK.name:
          return `string.IsNullOrEmpty(obj.prop1)`;
        case QueryBuilderOperations.IS_NOT_BLANK.name:
          return `!string.IsNullOrEmpty(obj.prop1)`;
        case QueryBuilderOperations.CONTAINS.name:
        case QueryBuilderOperations.LIST_EQUALS.name:
        case QueryBuilderOperations.LIST_CONTAINS.name:
          return `obj.prop1.Contains(${value})`;
        case QueryBuilderOperations.DOES_NOT_CONTAIN.name:
          return `!(obj.prop1.Contains(${value}))`;
        case QueryBuilderOperations.STARTS_WITH.name:
          return `obj.prop1.StartsWith(${value})`;
        case QueryBuilderOperations.ENDS_WITH.name:
          return `obj.prop1.EndsWith(${value})`;
        default:
          return `obj.prop1 ${operation} ${value}`;
      }
    };

    const computedDataFields = new Map<string, ExpressionTransformFunction>([
      ['Object1', mockTransformation],
      ['Object2', mockTransformation],
      ['Object3', mockTransformation],
    ]);

    it('should transform a query with computed fields', () => {
      const query = 'Object1 = "value1" AND Object2 = "value2"';
      const result = transformComputedFieldsQuery(query, computedDataFields);
      expect(result).toBe('obj.prop1 = value1 AND obj.prop1 = value2');
    });

    it('should return the original query if no computed fields are present', () => {
      const query = 'field1 = "value1" AND field2 = "value2"';
      const result = transformComputedFieldsQuery(query, computedDataFields);
      expect(result).toBe(query);
    });

    it('should handle multiple computed fields correctly', () => {
      const query = 'Object1 = "value1" AND Object3 = "value3"';
      const result = transformComputedFieldsQuery(query, computedDataFields);
      expect(result).toBe('obj.prop1 = value1 AND obj.prop1 = value3');
    });

    it('should handle an empty query', () => {
      const query = '';
      const result = transformComputedFieldsQuery(query, computedDataFields);
      expect(result).toBe(query);
    });

    it('should handle string.IsNullOrEmpty operations correctly with computed fields', () => {
      const query = 'string.IsNullOrEmpty(Object1) OR !string.IsNullOrEmpty(Object2)';
      const result = transformComputedFieldsQuery(query, computedDataFields);
      expect(result).toBe('string.IsNullOrEmpty(obj.prop1) OR !string.IsNullOrEmpty(obj.prop1)');
    });

    it('should handle string.IsNullOrEmpty operations correctly if no computed fields are present', () => {
      const query = 'string.IsNullOrEmpty(field1) OR !string.IsNullOrEmpty(field2)';
      const result = transformComputedFieldsQuery(query, computedDataFields);
      expect(result).toBe(query);
    });

    it('should handle Contains operations correctly with computed fields', () => {
      const query = 'Object1.Contains("value1") OR !(Object2.Contains("value2"))';
      const result = transformComputedFieldsQuery(query, computedDataFields);
      expect(result).toBe('obj.prop1.Contains(value1) OR !(obj.prop1.Contains(value2))');
    });

    it('should handle Contains operations correctly if no computed fields are present', () => {
      const query = 'field1.Contains("value1") OR !(field2.Contains("value2"))';
      const result = transformComputedFieldsQuery(query, computedDataFields);
      expect(result).toBe(query);
    });

    it('should handle Any.Contains operations correctly with computed fields', () => {
      const query = 'Object1.Any(it.Contains("value1"))';
      const result = transformComputedFieldsQuery(query, computedDataFields);
      expect(result).toBe('Object1.Any(obj.prop1.Contains(value1))');
    });
    
    it('should handle Any.Contains operations correctly if no computed fields are present', () => {
      const query = 'field1.Any(!it.Contains("value1"))';
      const result = transformComputedFieldsQuery(query, computedDataFields);
      expect(result).toBe(query);
    });

    it('should handle StartsWith operations correctly with computed fields', () => {
      const query = 'Object1.StartsWith("value1") AND Object2.EndsWith("value2")';
      const result = transformComputedFieldsQuery(query, computedDataFields);
      expect(result).toBe('obj.prop1.StartsWith(value1) AND obj.prop1.EndsWith(value2)');
    });

    it('should handle StartsWith operations correctly if no computed fields are present', () => {
      const query = 'field1.StartsWith("value1") AND field2.EndsWith("value2")';
      const result = transformComputedFieldsQuery(query, computedDataFields);
      expect(result).toBe(query);
    });

    it('should handle EndsWith operations correctly with computed fields', () => {
      const query = 'Object1.EndsWith("value1") OR Object2.StartsWith("value2")';
      const result = transformComputedFieldsQuery(query, computedDataFields);
      expect(result).toBe('obj.prop1.EndsWith(value1) OR obj.prop1.StartsWith(value2)');
    });

    it('should handle EndsWith operations correctly if no computed fields are present', () => {
      const query = 'field1.EndsWith("value1") OR field2.StartsWith("value2")';
      const result = transformComputedFieldsQuery(query, computedDataFields);
      expect(result).toBe(query);
    });

    it('should handle unsupported operations correctly', () => {
      const query = 'Object1 % "value1" AND Object2 % "value2"';
      const result = transformComputedFieldsQuery(query, computedDataFields);
      expect(result).toBe(query);
    });

    it('should handle supported operations correctly', () => {
      const query = 'Object1 != "value1" AND Object2 = "value2"';
      const result = transformComputedFieldsQuery(query, computedDataFields);
      expect(result).toBe('obj.prop1 != value1 AND obj.prop1 = value2');
    });

    it('should handle options correctly', () => {
      const options = new Map<string, Map<string, unknown>>();
      const cache = new Map<string, unknown>();
      cache.set('key', 'value');
      options.set('Object1', cache);

      const query = 'Object1 = "value1"';
      const result = transformComputedFieldsQuery(query, computedDataFields, options);
      expect(result).toBe('obj.prop1 = value1');
    });
  });

  describe('buildExpressionFromTemplate', () => {
    it('should build expression from template with field and value', () => {
      const template = '{0} = {1}';
      const field = 'FieldName';
      const value = 'SomeValue';
      const result = buildExpressionFromTemplate(template, field, value);
      expect(result).toBe('FieldName = SomeValue');
    });

    it('should build expression from template with only field', () => {
      const template = 'string.IsNullOrEmpty({0})';
      const field = 'FieldName';
      const result = buildExpressionFromTemplate(template, field);
      expect(result).toBe('string.IsNullOrEmpty(FieldName)');
    });
  });

  describe('expressionBuilderCallback', () => {
    const queryBuilderCustomOperation = {
      expressionTemplate: '{0} = {1}'
    };

    const fields: QBField[] = [
      {
        label: 'Field 1',
        dataField: 'field1',
        lookup: {
          dataSource: [{ label: 'Option A', value: 'ValueA' }]
        }
      },
      {
        label: 'Nested Field',
        dataField: 'grains.data.osfullname',
        filterOperations: ['=']
      }
    ];

    it('should build a valid expression for a single field', () => {
      const result = expressionBuilderCallback(fields).call(queryBuilderCustomOperation, 'field1', 'someOperation', 'Option A');

      expect(result).toBe('field1 = ValueA');
    });

    it('should return original value if no matching label found', () => {
      const callback = expressionBuilderCallback(fields).bind(queryBuilderCustomOperation);
      const result = callback('field1', 'someOperation', 'Option B');

      expect(result).toBe('field1 = Option B');
    });

    it('should return original expression if field has no lookup options', () => {
      const callback = expressionBuilderCallback(fields).bind(queryBuilderCustomOperation);
      const result = callback('grains.data.osfullname', 'someOperation', 'Any Value');

      expect(result).toBe('grains.data.osfullname = Any Value');
    });
  })

  describe('expressionReaderCallback', () => {
    const fields: QBField[] = [
      {
        label: 'Field 1',
        dataField: 'optionsObject1',
        lookup: {
          dataSource: [{ label: 'Label A', value: 'ValueA' }]
        }
      },
      {
        label: 'Operating System',
        dataField: 'grains.data.osfullname',
        lookup: {
          dataSource: [{ label: 'Windows 10', value: 'win10' }]
        }
      },
      {
        label: 'Simple Field',
        dataField: 'simpleField',
        filterOperations: ['=']
      }
    ];

    it('should map value to label for a given field', () => {
      const callback = expressionReaderCallback(fields);
      const result = callback('someExpression', ['optionsObject1', 'ValueA']);

      expect(result).toEqual({ fieldName: 'optionsObject1', value: 'Label A' });
    });

    it('should resolve truncated nested field names and map values', () => {
      const callback = expressionReaderCallback(fields);
      const result = callback('data.osfullname = "win10"', ['data.osfullname', 'win10']);

      expect(result).toEqual({ fieldName: 'grains.data.osfullname', value: 'Windows 10' });
    });

    it('should return original field name if no truncation match found', () => {
      const callback = expressionReaderCallback(fields);
      const result = callback('someExpression', ['unknownField', 'someValue']);

      expect(result).toEqual({ fieldName: 'unknownField', value: 'someValue' });
    });

    it('should return original field name and value if no matching label is found', () => {
      const callback = expressionReaderCallback(fields);
      const result = callback('someExpression', ['optionsObject1', 'NonExistentValue']);

      expect(result).toEqual({ fieldName: 'optionsObject1', value: 'NonExistentValue' });
    });

    it('should return original field name and value if field has no lookup options', () => {
      const callback = expressionReaderCallback(fields);
      const result = callback('someExpression', ['simpleField', 'someValue']);

      expect(result).toEqual({ fieldName: 'simpleField', value: 'someValue' });
    });
  })

  describe('expressionBuilderCallbackWithRef', () => {
    const mockQueryBuilderCustomOperation = {
      expressionTemplate: '{0} = {1}'
    };

    it('should use the latest options from ref for building expression', () => {
      const initialOptions = {
        'field1': [{ label: 'Option A', value: 'ValueA' }],
      };
      const updatedOptions = {
        'field1': [{ label: 'Option B', value: 'ValueB' }],
      };
      const optionsRef = { current: initialOptions };
      const builderCallback = expressionBuilderCallbackWithRef(optionsRef);

      let expression = builderCallback.call(mockQueryBuilderCustomOperation, 'field1', 'someOperation', 'Option A');
      expect(expression).toBe('field1 = ValueA');

      optionsRef.current = updatedOptions;

      expression = builderCallback.call(mockQueryBuilderCustomOperation, 'field1', 'someOperation', 'Option B');
      expect(expression).toBe('field1 = ValueB');
    });

    it('should return original value if no matching label found', () => {
      const options = {
        'field1': [{ label: 'Option A', value: 'ValueA' }],
      };
      const optionsRef = { current: options };

      const callback = expressionBuilderCallbackWithRef(optionsRef).bind(mockQueryBuilderCustomOperation);
      const result = callback('field1', 'someOperation', 'Option B');

      expect(result).toBe('field1 = Option B');
    });

    it('should return original expression if no options are provided', () => {
      const emptyOptions = {};
      const optionsRef = { current: emptyOptions };

      const callback = expressionBuilderCallbackWithRef(optionsRef).bind(mockQueryBuilderCustomOperation);
      const result = callback('field1', 'someOperation', 'Any Value');

      expect(result).toBe('field1 = Any Value');
    });
  })

  describe('expressionReaderCallbackWithRef', () => {
    it('should map value to label for a given field from latest options', () => {
      const initialOptions = {
        'field1': [{ label: 'Option A', value: 'ValueA' }],
      };
      const updatedOptions = {
        'field1': [{ label: 'Option B', value: 'ValueB' }],
      };
      const optionsRef = { current: initialOptions };
      const callback = expressionReaderCallbackWithRef(optionsRef);
      const result = callback('someExpression', ['field1', 'ValueA']);

      expect(result).toEqual({ fieldName: 'field1', value: 'Option A' });

      optionsRef.current = updatedOptions;
      const updatedResult = callback('someExpression', ['field1', 'ValueB']);

      expect(updatedResult).toEqual({ fieldName: 'field1', value: 'Option B' });
    });

    it('should return original field name and value if no matching label is found', () => {
      const initialOptions = {
        'field1': [{ label: 'Option A', value: 'ValueA' }],
      };
      const optionsRef = { current: initialOptions };

      const callback = expressionReaderCallbackWithRef(optionsRef);
      const result = callback('someExpression', ['field1', 'NonExistentValue']);

      expect(result).toEqual({ fieldName: 'field1', value: 'NonExistentValue' });
    });

    it('should return original field name and value if no options are provided for the field', () => {
      const emptyOptions = {};
      const optionsRef = { current: emptyOptions };
      const callback = expressionReaderCallbackWithRef(optionsRef);
      const result = callback('someExpression', ['field1', 'ValueA']);

      expect(result).toEqual({ fieldName: 'field1', value: 'ValueA' });
    });
  })

  describe('timeFieldsQuery', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2025-10-10T00:00:00Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should build time field expression with the provided value', () => {
      const transform = timeFieldsQuery('timestampField');

      const result = transform('2024-10-10T12:00:00Z', '<');

      expect(result).toBe('timestampField < "2024-10-10T12:00:00Z"');
    });

    it('should replace ${__now:date} with the current date in time field expression', () => {
      const transform = timeFieldsQuery('timestampField');

      const result = transform('${__now:date}', '=');

      expect(result).toBe('timestampField = "2025-10-10T00:00:00.000Z"');
    });
  });

  describe('listFieldsQuery', () => {
    it('should build expression for list field with single value when operation is listcontains', () => {
      const transform = listFieldsQuery('listField');
      const result = transform('value1', 'listcontains');
      expect(result).toBe('it.Contains(\"value1\")');
    });

    it('should build expression for list field with single value', () => {
      const transform = listFieldsQuery('listField');
      const result = transform('{value1}', 'contains');
      expect(result).toBe('(listField.Contains("value1"))');
    });

    it('should build expression for list field with multiple values when operation is listcontains', () => {
      const transform = listFieldsQuery('listField');
      const result = transform('{value1,value2}', 'contains');
      expect(result).toBe('(listField.Contains(\"value1\") || listField.Contains(\"value2\"))');
    });

    it('should build expression for list field with multiple values', () => {
      const transform = listFieldsQuery('listField');
      const result = transform('{value1}', 'contains');
      expect(result).toBe('(listField.Contains("value1"))');
    });
  });

  describe('multipleValuesQuery', () => {
    it('should build expression for single value query', () => {
      const buildExpression = multipleValuesQuery('field');

      const result = buildExpression('value', '=');

      expect(result).toBe('field = "value"');
    });

    it('should build expression for a single value in the multi-value format', () => {
      const buildExpression = multipleValuesQuery('field');

      const result = buildExpression('{value}', '=');

      expect(result).toBe('(field = "value")');
    });

    it('should build expression for multi-value query with "||" for equals operator', () => {
      const buildExpression = multipleValuesQuery('field');

      const result = buildExpression('{value1,value2}', '=');

      expect(result).toBe('(field = "value1" || field = "value2")');
    });

    it('should build expression for multi-value query with "&&" for not equals operator', () => {
      const buildExpression = multipleValuesQuery('field');

      const result = buildExpression('{value1,value2}', '!=');

      expect(result).toBe('(field != "value1" && field != "value2")');
    });

    it('should build expression for multi-value query with empty values', () => {
      const buildExpression = multipleValuesQuery('field');

      const result = buildExpression('{,value2,}', '=');

      expect(result).toBe('(field = "" || field = "value2" || field = "")');
    });

    it('should use default transformation with operator as-is when not defined in QueryBuilderOperations', () => {
      const buildExpression = multipleValuesQuery('field');

      const result = buildExpression('{value1}', 'like');

      expect(result).toBe('(field like "value1")');
    });
  });

  describe('getConcatOperatorForMultiExpression', () => {
    [
      {
        name: 'equals',
        operator: '=',
      },
      {
        name: 'is not blank',
        operator: 'isnotblank',
      },
      {
        name: 'contains',
        operator: 'contains',
      },
      {
        name: 'starts with',
        operator: 'startswith',
      },
      {
        name: 'ends with',
        operator: 'endswith',
      }
    ].forEach(testCase => {
      it(`should return OR for ${testCase.name} operator`, () => {
        const result = getConcatOperatorForMultiExpression(testCase.operator);

        expect(result).toBe('||');
      });
    });

    it('should return AND as the default logical operator', () => {
      const result = getConcatOperatorForMultiExpression('>');

      expect(result).toBe('&&');
    });
  });
})
