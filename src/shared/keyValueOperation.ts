import { SlFilterExpressions, SlFilterOperations } from "./queryBuilderConstants";

export class KeyValueOperationTemplate {
    public static editorTemplate(_: string, value: any): HTMLElement {
        const localizedKey = `Key`;
        const localizedValue = `Value`;
        return KeyValueOperationTemplate.labeledEditorTemplate(localizedKey, localizedValue, _, value);
    }

    public static labeledEditorTemplate(keyPlaceholder: string, valuePlaceholder: string, _: string, value: any): HTMLElement {
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

    public static valueTemplate(editor: HTMLElement | null | undefined, value: any): string {
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

    public static handleStringValue(editor: HTMLElement | null | undefined): any {
        const inputs = KeyValueOperationTemplate.retrieveKeyValueInputs(editor);
        return {
            label: inputs,
            value: inputs
        };
    }

    public static handleNumberValue(editor: HTMLElement | null | undefined): any {
        const inputs = KeyValueOperationTemplate.retrieveKeyValueInputs(editor);
        const normalizedInputs = { key: inputs.key, value: KeyValueOperationTemplate.normalizeNumericValue(inputs.value) };
        return {
            label: normalizedInputs,
            value: normalizedInputs
        };
    }

    public static keyValueExpressionBuilderCallback(dataField: string, operation: string, keyValuePair: any): string {
        let expressionTemplate = '';
        switch (operation) {
            case SlFilterOperations.KeyValueMatches:
                expressionTemplate = SlFilterExpressions.KeyValueMatches;
                break;
            case SlFilterOperations.KeyValueNotMatches:
                expressionTemplate = SlFilterExpressions.KeyValueNotMatches;
                break;
            case SlFilterOperations.KeyValueContains:
                expressionTemplate = SlFilterExpressions.KeyValueContains;
                break;
            case SlFilterOperations.KeyValueNotContains:
                expressionTemplate = SlFilterExpressions.KeyValueNotContains;
                break;
            case SlFilterOperations.KeyValueIsGreaterThan:
                expressionTemplate = SlFilterExpressions.KeyValueIsGreaterThan;
                break;
            case SlFilterOperations.KeyValueIsGreaterThanOrEqual:
                expressionTemplate = SlFilterExpressions.KeyValueIsGreaterThanOrEqual;
                break;
            case SlFilterOperations.KeyValueIsLessThan:
                expressionTemplate = SlFilterExpressions.KeyValueIsLessThan;
                break;
            case SlFilterOperations.KeyValueIsLessThanOrEqual:
                expressionTemplate = SlFilterExpressions.KeyValueIsLessThanOrEqual;
                break;
            case SlFilterOperations.KeyValueIsNumericallyEqual:
                expressionTemplate = SlFilterExpressions.KeyValueIsNumericallyEqual;
                break;
            case SlFilterOperations.KeyValueIsNumericallyNotEqual:
                expressionTemplate = SlFilterExpressions.KeyValueIsNumericallyNotEqual;
                break;
            default:
                return '';
        }
        return expressionTemplate.replace('{0}', dataField).replace('{1}', keyValuePair.key).replace('{2}', keyValuePair.value);
    }

    public static stringKeyValueExpressionReaderCallback(expression: string, bindings: string[]): any {
        if (expression.includes('properties')) {
            const regex: RegExp = /"([^"]+)"/g;
            const matches: string[] = [];
            let match: RegExpExecArray | null;

            while ((match = regex.exec(expression)) !== null) {
                matches.push(match[1]);
            }
            return { fieldName: bindings[0], value: { key: matches[0], value: matches[1] } };
        }
        return { fieldName: bindings[0], value: { key: bindings[1], value: bindings[2] } };
    }

    public static numericKeyValueExpressionReaderCallback(_expression: string, bindings: string[]): any {
        const normalizedNumberValue = KeyValueOperationTemplate.normalizeNumericValue(bindings[2]);
        return { fieldName: bindings[0], value: { key: bindings[1], value: normalizedNumberValue } };
    }

    public static validateNotEmptyKeyValuePair(keyValuePair: any): boolean {
        return keyValuePair?.key?.length > 0
            && keyValuePair?.value?.length > 0;
    }

    public static validateNotEmptyKey(keyValuePair: any): boolean {
        return keyValuePair?.key?.length > 0;
    }

    public static validateNotEmptyKeyValueAndValueIsNumber(keyValuePair: any): boolean {
        return keyValuePair?.key?.length > 0
            && !isNaN(Number(keyValuePair?.value));
    }

    private static retrieveKeyValueInputs(editor: HTMLElement | null | undefined): { key: string, value: string } {
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

    private static normalizeNumericValue(value: string): number | string {
        const convertedNumberValue = Number(value);
        return isNaN(convertedNumberValue)
            ? value
            : convertedNumberValue;
    }
}
