import { FilterOperations } from "core/query-builder.constants";
import { editorTemplate, valueTemplate, handleStringValue, handleNumberValue, keyValueExpressionBuilderCallback, stringKeyValueExpressionReaderCallback, numericKeyValueExpressionReaderCallback } from "./key-value-operations";

describe('keyValueOperations', () => {
    describe('editorTemplate', () => {
        it('should create an editor template with given key and value', () => {
            const value = { key: 'testKey', value: 'testValue' };
            const editor = editorTemplate('', value);
            expect(editor.querySelector('.key-input')?.getAttribute('value')).toBe('testKey');
            expect(editor.querySelector('.value-input')?.getAttribute('value')).toBe('testValue');
        });

        it('should create an editor template with empty key and value if not provided', () => {
            const value = { key: '', value: '' };
            const editor = editorTemplate('', value);
            expect(editor.querySelector('.key-input')?.getAttribute('value')).toBe('');
            expect(editor.querySelector('.value-input')?.getAttribute('value')).toBe('');
        });
    });

    describe('valueTemplate', () => {
        it('should return key-value pair as string', () => {
            const value = { key: 'testKey', value: 'testValue' };
            const result = valueTemplate(null, value);
            expect(result).toBe('testKey : testValue');
        });

        it('should return key-value pair from editor inputs', () => {
            const editor = document.createElement('div');
            editor.innerHTML = `
                <input class="key-input" value="testKey">
                <input class="value-input" value="testValue">
            `;
            const result = valueTemplate(editor, { key: 'testKey', value: 'testValue' });
            expect(result).toBe('testKey : testValue');
        });

        it('should return empty colons if no value and editor inputs are provided', () => {
            const result = valueTemplate(null, { key: '', value: '' });
            expect(result).toBe(' : ');
        });
    });

    describe('handleStringValue', () => {
        it('should return key-value pair from editor inputs', () => {
            const editor = document.createElement('div');
            editor.innerHTML = `
                <input class="key-input" value="testKey">
                <input class="value-input" value="testValue">
            `;
            const result = handleStringValue(editor);
            expect(result).toEqual({ label: { key: 'testKey', value: 'testValue' }, value: { key: 'testKey', value: 'testValue' } });
        });
    });

    describe('handleNumberValue', () => {
        it('should return normalized key-value pair from editor inputs', () => {
            const editor = document.createElement('div');
            editor.innerHTML = `
                <input class="key-input" value="testKey">
                <input class="value-input" value="123">
            `;
            const result = handleNumberValue(editor);
            expect(result).toEqual({ label: { key: 'testKey', value: 123 }, value: { key: 'testKey', value: 123 } });
        });

        it('should return string value if input is not a number', () => {
            const editor = document.createElement('div');
            editor.innerHTML = `
                <input class="key-input" value="testKey">
                <input class="value-input" value="testValue">
            `;
            const result = handleNumberValue(editor);
            expect(result).toEqual({ label: { key: 'testKey', value: 'testValue' }, value: { key: 'testKey', value: 'testValue' } });
        });
    });

    describe('keyValueExpressionBuilderCallback', () => {
        it('should return correct expression for valid operation', () => {
            const result = keyValueExpressionBuilderCallback('dataField', FilterOperations.KeyValueMatch, { key: 'testKey', value: 'testValue' });
            expect(result).toBe('dataField[\"testKey\"] = \"testValue\"');
        });

        it('should return empty string for unknown operation', () => {
            const result = keyValueExpressionBuilderCallback('dataField', 'unknownOperation', { key: 'testKey', value: 'testValue' });
            expect(result).toBe('');
        });
    });

    describe('stringKeyValueExpressionReaderCallback', () => {
        it('should return field name and key-value pair from expression', () => {
            const result = stringKeyValueExpressionReaderCallback('"testKey" : "testValue"', ['dataField']);
            expect(result).toEqual({ fieldName: 'dataField', value: { key: 'testKey', value: 'testValue' } });
        });

        it('should return empty key-value pair if expression is invalid', () => {
            const result = stringKeyValueExpressionReaderCallback('invalidExpression', ['dataField']);
            expect(result).toEqual({ fieldName: 'dataField', value: { key: '', value: '' } });
        });
    });

    describe('numericKeyValueExpressionReaderCallback', () => {
        it('should return field name and normalized key-value pair from bindings', () => {
            const result = numericKeyValueExpressionReaderCallback('', ['dataField', 'testKey', '123']);
            expect(result).toEqual({ fieldName: 'dataField', value: { key: 'testKey', value: 123 } });
        });

        it('should return string value if binding is not a number', () => {
            const result = numericKeyValueExpressionReaderCallback('', ['dataField', 'testKey', 'testValue']);
            expect(result).toEqual({ fieldName: 'dataField', value: { key: 'testKey', value: 'testValue' } });
        });
    });
});
