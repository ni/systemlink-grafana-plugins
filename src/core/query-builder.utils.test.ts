import { QueryBuilderOperations } from "./query-builder.constants";
import { buildExpressionFromTemplate, expressionBuilderCallback, expressionBuilderCallbackWithRef, expressionReaderCallback, expressionReaderCallbackWithRef, ExpressionTransformFunction, getConcatOperatorForMultiExpression, multipleValuesQuery, timeFieldsQuery, transformComputedFieldsQuery } from "./query-builder.utils"

describe('QueryBuilderUtils', () => {
  describe('transformComputedFieldsQuery', () => {
    const mockTransformation: ExpressionTransformFunction = (value, operation, _options) => {
      if (operation === QueryBuilderOperations.IS_BLANK.name) {
        return `string.IsNullOrEmpty(obj.prop1)`;
      }

      if (operation === QueryBuilderOperations.IS_NOT_BLANK.name) {
        return `!string.IsNullOrEmpty(obj.prop1)`;
      }

      return `obj.prop1 ${operation} ${value}`;
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
    const mockQueryBuilderCustomOperation = {
      expressionTemplate: '{0} = {1}'
    };

    it('should build a valid expression for a single field', () => {
      const options = {
        'field1': [{ label: 'Option A', value: 'ValueA' }],
      };

      const result = expressionBuilderCallback(options).call(mockQueryBuilderCustomOperation, 'field1', 'someOperation', 'Option A');

      expect(result).toBe('field1 = ValueA');
    });

    it('should return original value if no matching label found', () => {
      const options = {
        'field1': [{ label: 'Option A', value: 'ValueA' }],
      };

      const callback = expressionBuilderCallback(options).bind(mockQueryBuilderCustomOperation);
      const result = callback('field1', 'someOperation', 'Option B');

      expect(result).toBe('field1 = Option B');
    });

    it('should return original expression if no options are provided', () => {
      const options = {};

      const callback = expressionBuilderCallback(options).bind(mockQueryBuilderCustomOperation);
      const result = callback('field1', 'someOperation', 'Any Value');

      expect(result).toBe('field1 = Any Value');
    });
  })

  describe('expressionReaderCallback', () => {
    const options = {
      'optionsObject1': [{ label: 'Label A', value: 'ValueA' }],
      'optionsObject2': [{ label: 'Label B', value: 'ValueB' }],
    };

    it('should map value to label for a given field', () => {
      const callback = expressionReaderCallback(options);
      const result = callback('someExpression', ['optionsObject1', 'ValueA']);

      expect(result).toEqual({ fieldName: 'optionsObject1', value: 'Label A' });
    });

    it('should return original field name and value if no matching label is found', () => {
      const callback = expressionReaderCallback(options);
      const result = callback('someExpression', ['field1', 'NonExistentValue']);

      expect(result).toEqual({ fieldName: 'field1', value: 'NonExistentValue' });
    });

    it('should return original field name and value if no options are provided for the field', () => {
      const emptyOptions = {};
      const callback = expressionReaderCallback(emptyOptions);
      const result = callback('someExpression', ['field1', 'ValueA']);

      expect(result).toEqual({ fieldName: 'field1', value: 'ValueA' });
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
