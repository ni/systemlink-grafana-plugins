import { expressionBuilderCallback, expressionReaderCallback, transformComputedFieldsQuery } from "./query-builder.utils"

describe('QueryBuilderUtils', () => {
  describe('transformComputedFieldsQuery', () => {
    const computedDataFields = {
      Object1: '(object1.prop1 = {value} || object1.prop2 = {value})',
      Object2: '(object2.prop1 = {value} || object2.extra.prop2 = {value} || object2.prop3 = {value} || object2.prop4 = {value})',
      Object3: '(object3.prop1 = {value} || object3.prop2 = {value} || object3.prop3 = {value})'
    };

    it('should transform a query with computed fields', () => {
      const query = 'Object1 = "value1" AND Object2 = "value2"';
      const result = transformComputedFieldsQuery(query, computedDataFields);
      expect(result).toBe('(object1.prop1 = value1 || object1.prop2 = value1) AND (object2.prop1 = value2 || object2.extra.prop2 = value2 || object2.prop3 = value2 || object2.prop4 = value2)');
    });

    it('should return the original query if no computed fields are present', () => {
      const query = 'field1 = "value1" AND field2 = "value2"';
      const result = transformComputedFieldsQuery(query, computedDataFields);
      expect(result).toBe(query);
    });

    it('should handle multiple computed fields correctly', () => {
      const query = 'Object1 = "value1" AND Object3 = "value3"';
      const result = transformComputedFieldsQuery(query, computedDataFields);
      expect(result).toBe('(object1.prop1 = value1 || object1.prop2 = value1) AND (object3.prop1 = value3 || object3.prop2 = value3 || object3.prop3 = value3)');
    });

    it('should handle an empty query', () => {
      const query = '';
      const result = transformComputedFieldsQuery(query, computedDataFields);
      expect(result).toBe(query);
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
})
