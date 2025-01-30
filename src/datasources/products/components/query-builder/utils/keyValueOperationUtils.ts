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
        const keyValuePair = value;
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
    const operationExpressionMap: { [key: string]: string } = {
        [FilterOperations.KeyValueMatch]: FilterExpressions.KeyValueMatches,
        [FilterOperations.KeyValueDoesNotMatch]: FilterExpressions.KeyValueNotMatches,
        [FilterOperations.KeyValueContains]: FilterExpressions.KeyValueContains,
        [FilterOperations.KeyValueDoesNotContains]: FilterExpressions.KeyValueNotContains,
        [FilterOperations.KeyValueIsGreaterThan]: FilterExpressions.KeyValueIsGreaterThan,
        [FilterOperations.KeyValueIsGreaterThanOrEqual]: FilterExpressions.KeyValueIsGreaterThanOrEqual,
        [FilterOperations.KeyValueIsLessThan]: FilterExpressions.KeyValueIsLessThan,
        [FilterOperations.KeyValueIsLessThanOrEqual]: FilterExpressions.KeyValueIsLessThanOrEqual,
        [FilterOperations.KeyValueIsNumericallyEqual]: FilterExpressions.KeyValueIsNumericallyEqual,
        [FilterOperations.KeyValueIsNumericallyNotEqual]: FilterExpressions.KeyValueIsNumericallyNotEqual
    };

    const expressionTemplate = operationExpressionMap[operation];
    if (!expressionTemplate) {
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
    if (!editor) {
        return { key: '', value: '' };
    }

    const keyInput = editor.querySelector<HTMLInputElement>('.key-input');
    const valueInput = editor.querySelector<HTMLInputElement>('.value-input');

    return {
        key: keyInput?.value ?? '',
        value: valueInput?.value ?? ''
    };
}

function normalizeNumericValue(value: string): number | string {
    const convertedNumberValue = Number(value);
    return isNaN(convertedNumberValue)
        ? value
        : convertedNumberValue;
}

