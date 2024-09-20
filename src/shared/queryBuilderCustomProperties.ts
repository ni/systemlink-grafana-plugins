import { QueryBuilderCustomOperation } from "smart-webcomponents-react";
import { KeyValueOperationTemplate } from "./keyValueOperation";
import { SlFilterOperations, SlFilterExpressions } from "./queryBuilderConstants";

export class QueryBuilderCustomProperties {
    public getCustomPropertiesOperations(): QueryBuilderCustomOperation[] {
        return [
            ...this.operationDefinitions,
            ...this.customPropertiesOperationDefinitions];
    }

    private readonly operationDefinitions: QueryBuilderCustomOperation[] = [
        { label: SlFilterOperations.Equals, name: SlFilterOperations.Equals, expressionTemplate: SlFilterExpressions.EqualsString, validateValue: this.validateNotEmptyString.bind(this) },
        { label: SlFilterOperations.NotEquals, name: SlFilterOperations.NotEquals, expressionTemplate: SlFilterExpressions.NotEqualsString, validateValue: this.validateNotEmptyString.bind(this) },
        { label: SlFilterOperations.NotContains, name: SlFilterOperations.NotContains, expressionTemplate: SlFilterExpressions.NotContains, validateValue: this.validateNotEmptyString.bind(this) },
        { label: SlFilterOperations.Contains, name: SlFilterOperations.Contains, expressionTemplate: SlFilterExpressions.Contains, validateValue: this.validateNotEmptyString.bind(this) },
        { label: SlFilterOperations.IsNotEmpty, name: SlFilterOperations.IsNotEmpty, expressionTemplate: SlFilterExpressions.IsNotEmpty, hideValue: true },
        { label: SlFilterOperations.IsEmpty, name: SlFilterOperations.IsEmpty, expressionTemplate: SlFilterExpressions.IsEmpty, hideValue: true },
        { label: SlFilterOperations.IsGreaterThan, name: SlFilterOperations.IsGreaterThan, expressionTemplate: SlFilterExpressions.IsGreaterThan },
        { label: SlFilterOperations.IsGreaterThanOrEqual, name: SlFilterOperations.IsGreaterThanOrEqual, expressionTemplate: SlFilterExpressions.IsGreaterThanOrEqual },
        { label: SlFilterOperations.IsLessThan, name: SlFilterOperations.IsLessThan, expressionTemplate: SlFilterExpressions.IsLessThan },
        { label: SlFilterOperations.IsLessThanOrEqual, name: SlFilterOperations.IsLessThanOrEqual, expressionTemplate: SlFilterExpressions.IsLessThanOrEqual },
        { label: SlFilterOperations.NoListElementContains, name: SlFilterOperations.NoListElementContains, expressionTemplate: SlFilterExpressions.NoListElementContains, validateValue: this.validateNotEmptyString.bind(this) },
        { label: SlFilterOperations.ListElementContains, name: SlFilterOperations.ListElementContains, expressionTemplate: SlFilterExpressions.ListElementContains, validateValue: this.validateNotEmptyString.bind(this) },
        { label: SlFilterOperations.IsNotInList, name: SlFilterOperations.IsNotInList, expressionTemplate: SlFilterExpressions.NotContains, validateValue: this.validateNotEmptyString.bind(this) },
        { label: SlFilterOperations.IsInList, name: SlFilterOperations.IsInList, expressionTemplate: SlFilterExpressions.Contains, validateValue: this.validateNotEmptyString.bind(this) },
        { label: SlFilterOperations.BooleanEquals, name: SlFilterOperations.BooleanEquals, expressionTemplate: SlFilterExpressions.Equals },
        { label: SlFilterOperations.BooleanNotEquals, name: SlFilterOperations.BooleanNotEquals, expressionTemplate: SlFilterExpressions.NotEquals },
        { label: SlFilterOperations.ContainsKey, name: SlFilterOperations.ContainsKey, expressionTemplate: SlFilterExpressions.ContainsKey, validateValue: this.validateNotEmptyString.bind(this) },
        { label: SlFilterOperations.NotContainsKey, name: SlFilterOperations.NotContainsKey, expressionTemplate: SlFilterExpressions.NotContainsKey, validateValue: this.validateNotEmptyString.bind(this) },
        { label: SlFilterOperations.StartsWith, name: SlFilterOperations.StartsWith, expressionTemplate: SlFilterExpressions.StartsWith, validateValue: this.validateNotEmptyString.bind(this) }
    ];

    private readonly customPropertiesOperationDefinitions: QueryBuilderCustomOperation[] = [
        {
            label: `matches`,
            name: SlFilterOperations.KeyValueMatches,
            expressionTemplate: SlFilterExpressions.KeyValueMatches,
            editorTemplate: KeyValueOperationTemplate.editorTemplate.bind(this),
            valueTemplate: KeyValueOperationTemplate.valueTemplate.bind(this),
            handleValue: KeyValueOperationTemplate.handleStringValue.bind(this),
            expressionBuilderCallback: KeyValueOperationTemplate.keyValueExpressionBuilderCallback.bind(this),
            expressionReaderCallback: KeyValueOperationTemplate.stringKeyValueExpressionReaderCallback.bind(this),
            validateValue: KeyValueOperationTemplate.validateNotEmptyKey.bind(this)
        },
        {
            label: `does not match`,
            name: SlFilterOperations.KeyValueNotMatches,
            expressionTemplate: SlFilterExpressions.KeyValueNotMatches,
            editorTemplate: KeyValueOperationTemplate.editorTemplate.bind(this),
            valueTemplate: KeyValueOperationTemplate.valueTemplate.bind(this),
            handleValue: KeyValueOperationTemplate.handleStringValue.bind(this),
            expressionBuilderCallback: KeyValueOperationTemplate.keyValueExpressionBuilderCallback.bind(this),
            expressionReaderCallback: KeyValueOperationTemplate.stringKeyValueExpressionReaderCallback.bind(this),
            validateValue: KeyValueOperationTemplate.validateNotEmptyKey.bind(this)
        },
        {
            label: `does not contain`,
            name: SlFilterOperations.KeyValueNotContains,
            expressionTemplate: SlFilterExpressions.KeyValueNotContains,
            editorTemplate: KeyValueOperationTemplate.editorTemplate.bind(this),
            valueTemplate: KeyValueOperationTemplate.valueTemplate.bind(this),
            handleValue: KeyValueOperationTemplate.handleStringValue.bind(this),
            expressionBuilderCallback: KeyValueOperationTemplate.keyValueExpressionBuilderCallback.bind(this),
            expressionReaderCallback: KeyValueOperationTemplate.stringKeyValueExpressionReaderCallback.bind(this),
            validateValue: KeyValueOperationTemplate.validateNotEmptyKey.bind(this)
        },
        {
            label: `contains`,
            name: SlFilterOperations.KeyValueContains,
            expressionTemplate: SlFilterExpressions.KeyValueContains,
            editorTemplate: KeyValueOperationTemplate.editorTemplate.bind(this),
            valueTemplate: KeyValueOperationTemplate.valueTemplate.bind(this),
            handleValue: KeyValueOperationTemplate.handleStringValue.bind(this),
            expressionBuilderCallback: KeyValueOperationTemplate.keyValueExpressionBuilderCallback.bind(this),
            expressionReaderCallback: KeyValueOperationTemplate.stringKeyValueExpressionReaderCallback.bind(this),
            validateValue: KeyValueOperationTemplate.validateNotEmptyKey.bind(this)
        },
        {
            label: `> (numeric)`,
            name: SlFilterOperations.KeyValueIsGreaterThan,
            expressionTemplate: SlFilterExpressions.KeyValueIsGreaterThan,
            editorTemplate: KeyValueOperationTemplate.editorTemplate.bind(this),
            valueTemplate: KeyValueOperationTemplate.valueTemplate.bind(this),
            handleValue: KeyValueOperationTemplate.handleNumberValue.bind(this),
            expressionBuilderCallback: KeyValueOperationTemplate.keyValueExpressionBuilderCallback.bind(this),
            expressionReaderCallback: KeyValueOperationTemplate.numericKeyValueExpressionReaderCallback.bind(this),
            validateValue: KeyValueOperationTemplate.validateNotEmptyKeyValueAndValueIsNumber.bind(this)
        },
        {
            label: `≥ (numeric)`,
            name: SlFilterOperations.KeyValueIsGreaterThanOrEqual,
            expressionTemplate: SlFilterExpressions.KeyValueIsGreaterThanOrEqual,
            editorTemplate: KeyValueOperationTemplate.editorTemplate.bind(this),
            valueTemplate: KeyValueOperationTemplate.valueTemplate.bind(this),
            handleValue: KeyValueOperationTemplate.handleNumberValue.bind(this),
            expressionBuilderCallback: KeyValueOperationTemplate.keyValueExpressionBuilderCallback.bind(this),
            expressionReaderCallback: KeyValueOperationTemplate.numericKeyValueExpressionReaderCallback.bind(this),
            validateValue: KeyValueOperationTemplate.validateNotEmptyKeyValueAndValueIsNumber.bind(this)
        },
        {
            label: `< (numeric)`,
            name: SlFilterOperations.KeyValueIsLessThan,
            expressionTemplate: SlFilterExpressions.KeyValueIsLessThan,
            editorTemplate: KeyValueOperationTemplate.editorTemplate.bind(this),
            valueTemplate: KeyValueOperationTemplate.valueTemplate.bind(this),
            handleValue: KeyValueOperationTemplate.handleNumberValue.bind(this),
            expressionBuilderCallback: KeyValueOperationTemplate.keyValueExpressionBuilderCallback.bind(this),
            expressionReaderCallback: KeyValueOperationTemplate.numericKeyValueExpressionReaderCallback.bind(this),
            validateValue: KeyValueOperationTemplate.validateNotEmptyKeyValueAndValueIsNumber.bind(this)
        },
        {
            label: `≤ (numeric)`,
            name: SlFilterOperations.KeyValueIsLessThanOrEqual,
            expressionTemplate: SlFilterExpressions.KeyValueIsLessThanOrEqual,
            editorTemplate: KeyValueOperationTemplate.editorTemplate.bind(this),
            valueTemplate: KeyValueOperationTemplate.valueTemplate.bind(this),
            handleValue: KeyValueOperationTemplate.handleNumberValue.bind(this),
            expressionBuilderCallback: KeyValueOperationTemplate.keyValueExpressionBuilderCallback.bind(this),
            expressionReaderCallback: KeyValueOperationTemplate.numericKeyValueExpressionReaderCallback.bind(this),
            validateValue: KeyValueOperationTemplate.validateNotEmptyKeyValueAndValueIsNumber.bind(this)
        },
        {
            label: `= (numeric)`,
            name: SlFilterOperations.KeyValueIsNumericallyEqual,
            expressionTemplate: SlFilterExpressions.KeyValueIsNumericallyEqual,
            editorTemplate: KeyValueOperationTemplate.editorTemplate.bind(this),
            valueTemplate: KeyValueOperationTemplate.valueTemplate.bind(this),
            handleValue: KeyValueOperationTemplate.handleNumberValue.bind(this),
            expressionBuilderCallback: KeyValueOperationTemplate.keyValueExpressionBuilderCallback.bind(this),
            expressionReaderCallback: KeyValueOperationTemplate.numericKeyValueExpressionReaderCallback.bind(this),
            validateValue: KeyValueOperationTemplate.validateNotEmptyKeyValueAndValueIsNumber.bind(this)
        },
        {
            label: `≠ (numeric)`,
            name: SlFilterOperations.KeyValueIsNumericallyNotEqual,
            expressionTemplate: SlFilterExpressions.KeyValueIsNumericallyNotEqual,
            editorTemplate: KeyValueOperationTemplate.editorTemplate.bind(this),
            valueTemplate: KeyValueOperationTemplate.valueTemplate.bind(this),
            handleValue: KeyValueOperationTemplate.handleNumberValue.bind(this),
            expressionBuilderCallback: KeyValueOperationTemplate.keyValueExpressionBuilderCallback.bind(this),
            expressionReaderCallback: KeyValueOperationTemplate.numericKeyValueExpressionReaderCallback.bind(this),
            validateValue: KeyValueOperationTemplate.validateNotEmptyKeyValueAndValueIsNumber.bind(this)
        }
    ];

    private validateNotEmptyString(value: string | number): boolean {
        if (typeof value === 'number') {
            return true;
        }
        return !!value && value.length > 0;
    }
}