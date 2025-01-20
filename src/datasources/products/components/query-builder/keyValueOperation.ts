import { FilterExpressions, FilterOperations } from "core/query-builder.constants";
import { PropertyFieldKeyValuePair } from "datasources/products/types";

export class KeyValueOperationTemplate {
    public static editorTemplate(_: string, value: PropertyFieldKeyValuePair): HTMLElement {
        const keyPlaceHolder = `Key`;
        const valuePlaceHolder = `Value`;
        return KeyValueOperationTemplate.labeledEditorTemplate(keyPlaceHolder, valuePlaceHolder, value);
    }

    public static labeledEditorTemplate(keyPlaceholder: string, valuePlaceholder: string, value: PropertyFieldKeyValuePair): HTMLElement {
        const template = `
        <div id="sl-query-builder-key-value-editor">
            <ul style="list-style: none; padding-left: 0; padding-right: 10px;">
                <li>
                    <smart-input class="key-input" style="width: auto; padding-left: 5px;"
                        placeholder="${keyPlaceholder}"
                        value="${value?.key ?? ''}">
                    </smart-input>
                </li>
                <li>
                    <smart-input class="value-input" style="width: auto; margin-top: 10px; padding-left: 5px;"
                        placeholder="${valuePlaceholder}"
                        value="${value?.value ?? ''}">
                    </smart-input>
                </li>
            </ul>
        </div>`;

        const templateBody = new DOMParser().parseFromString(template, 'text/html').body;
        return templateBody.querySelector('#sl-query-builder-key-value-editor')!;
    }

    public static valueTemplate(editor: HTMLElement | null | undefined, value: PropertyFieldKeyValuePair): string {
        if (value) {
            const keyValuePair = value as { key: string; value: string | number; };
            return `${keyValuePair.key} : ${keyValuePair.value}`;
        }
        if (editor) {
            const keyInput = editor.querySelector<HTMLInputElement>('.key-input');
            const valueInput = editor.querySelector<HTMLInputElement>('.value-input');
            if (keyInput && valueInput) {
                return `${keyInput.value} : ${valueInput.value}`;
            }
        }
        return '';
    }

    public static handleStringValue(editor: HTMLElement | null | undefined): { label: PropertyFieldKeyValuePair; value: PropertyFieldKeyValuePair; } {
        const inputs = KeyValueOperationTemplate.retrieveKeyValueInputs(editor);
        return {
            label: inputs,
            value: inputs
        };
    }

    public static handleNumberValue(editor: HTMLElement | null | undefined): { label: PropertyFieldKeyValuePair; value: PropertyFieldKeyValuePair; } {
        const inputs = KeyValueOperationTemplate.retrieveKeyValueInputs(editor);
        const normalizedInputs = { key: inputs.key, value: inputs.value };
        return {
            label: normalizedInputs,
            value: normalizedInputs
        };
    }

    public static keyValueExpressionBuilderCallback(dataField: string, operation: string, keyValuePair: PropertyFieldKeyValuePair): string {
        let expressionTemplate = '';
        switch (operation) {
            case FilterOperations.KeyValueMatch:
                expressionTemplate = FilterExpressions.KeyValueMatches;
                break;
            case FilterOperations.KeyValueDoesNotMatch:
                expressionTemplate = FilterExpressions.KeyValueNotMatches;
                break;
            case FilterOperations.KeyValueContains:
                expressionTemplate = FilterExpressions.KeyValueContains;
                break;
            case FilterOperations.KeyValueDoesNotContains:
                expressionTemplate = FilterExpressions.KeyValueNotContains;
                break;
            case FilterOperations.KeyValueIsGreaterThan:
                expressionTemplate = FilterExpressions.KeyValueIsGreaterThan;
                break;
            case FilterOperations.KeyValueIsGreaterThanOrEqual:
                expressionTemplate = FilterExpressions.KeyValueIsGreaterThanOrEqual;
                break;
            case FilterOperations.KeyValueIsLessThan:
                expressionTemplate = FilterExpressions.KeyValueIsLessThan;
                break;
            case FilterOperations.KeyValueIsLessThanOrEqual:
                expressionTemplate = FilterExpressions.KeyValueIsLessThanOrEqual;
                break;
            case FilterOperations.KeyValueIsNumericallyEqual:
                expressionTemplate = FilterExpressions.KeyValueIsNumericallyEqual;
                break;
            case FilterOperations.KeyValueIsNumericallyNotEqual:
                expressionTemplate = FilterExpressions.KeyValueIsNumericallyNotEqual;
                break;
            default:
                return '';
        }
        return expressionTemplate.replace('{0}', dataField).replace('{1}', keyValuePair.key).replace('{2}', String(keyValuePair.value));
    }

    public static stringKeyValueExpressionReaderCallback(expression: string, bindings: string[]): { fieldName: string; value: PropertyFieldKeyValuePair; } {

        // Handle the case where the value is equal to the key
        const matches = expression.match(/"([^"]*)"/g)?.map(m => m.slice(1, -1)) ?? [];
        if (matches.length < 2) {
            return { fieldName: bindings[0], value: { key: '', value: '' } };
        }
        return { fieldName: bindings[0], value: { key: matches[0], value: matches[1] } };
    }

    public static numericKeyValueExpressionReaderCallback(_expression: string, bindings: string[]): { fieldName: string; value: PropertyFieldKeyValuePair; } {
        return { fieldName: bindings[0], value: { key: bindings[1], value: bindings[2] } };
    }

    private static retrieveKeyValueInputs(editor: HTMLElement | null | undefined): PropertyFieldKeyValuePair{
        let pair = { key: '', value: '' };
        if (editor) {
            const keyInput = editor.querySelector<HTMLInputElement>('.key-input');
            const valueInput = editor.querySelector<HTMLInputElement>('.value-input');
            if (keyInput && valueInput) {
                pair = {
                    key: keyInput.value,
                    value: valueInput.value
                };
            }
        }
        return pair;
    }
}
