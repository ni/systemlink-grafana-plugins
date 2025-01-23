import { FilterExpressions, FilterOperations } from "core/query-builder.constants";
import { PropertyFieldKeyValuePair } from "datasources/products/types";


export function editorTemplate(_: string, value: PropertyFieldKeyValuePair): HTMLElement {
    const keyPlaceholder = `Key`;
    const valuePlaceholder = `Value`;

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

export function valueTemplate(editor: HTMLElement | null | undefined, value: PropertyFieldKeyValuePair): string {
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

export function handleStringValue(editor: HTMLElement | null | undefined): { label: PropertyFieldKeyValuePair; value: PropertyFieldKeyValuePair; } {
    const inputs = retrieveKeyValueInputs(editor);
    return {
        label: inputs,
        value: inputs
    };
}

export function handleNumberValue(editor: HTMLElement | null | undefined): { label: PropertyFieldKeyValuePair; value: PropertyFieldKeyValuePair; } {
    const inputs = retrieveKeyValueInputs(editor);
    const normalizedInputs = { key: inputs.key, value: normalizeNumericValue(inputs.value) };
    return {
        label: normalizedInputs,
        value: normalizedInputs
    };
}

export function keyValueExpressionBuilderCallback(dataField: string, operation: string, keyValuePair: PropertyFieldKeyValuePair): string {
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

export function stringKeyValueExpressionReaderCallback(expression: string, bindings: string[]): { fieldName: string; value: PropertyFieldKeyValuePair; } {
    const matches = expression.match(/"([^"]*)"/g)?.map(m => m.slice(1, -1)) ?? [];
    if (matches.length < 2) {
        return { fieldName: bindings[0], value: { key: '', value: '' } };
    }
    return { fieldName: bindings[0], value: { key: matches[0], value: matches[1] } };
}

export function numericKeyValueExpressionReaderCallback(_expression: string, bindings: string[]): { fieldName: string; value: PropertyFieldKeyValuePair; } {
    const normalizedNumberValue = normalizeNumericValue(bindings[2]);
    return { fieldName: bindings[0], value: { key: bindings[1], value: normalizedNumberValue } };
}

function retrieveKeyValueInputs(editor: HTMLElement | null | undefined): { key: string, value: string } {
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

function normalizeNumericValue(value: string): number | string {
    const convertedNumberValue = Number(value);
    return isNaN(convertedNumberValue)
        ? value
        : convertedNumberValue;
}

