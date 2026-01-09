import { buildExpressionFromTemplate, ExpressionTransformFunction, getConcatOperatorForMultiExpression } from "core/query-builder.utils";
import { AllFieldNames } from "../constants/constants";
import { QueryBuilderOperations } from "core/query-builder.constants";
import { DataSourceBase } from "core/DataSourceBase";
import { SystemQuery } from "../types";
import { DataFrameDTO, DataQueryRequest, DataSourceJsonData } from "@grafana/data";
import { Workspace } from "core/types";
import { parseErrorMessage } from "core/errors";

export abstract class SystemsDataSourceBase extends DataSourceBase<SystemQuery, DataSourceJsonData> {
    private workspacesLoaded!: () => void;

    public areWorkspacesLoaded$ = new Promise<void>(resolve => this.workspacesLoaded = resolve);

    public error = '';

    public readonly workspacesCache = new Map<string, Workspace>([]);

    abstract runQuery(query: SystemQuery, options: DataQueryRequest): Promise<DataFrameDTO>;
    abstract shouldRunQuery(query: SystemQuery): boolean;

    public getCachedWorkspaces(): Workspace[] {
        return Array.from(this.workspacesCache.values());
    }

    public async loadDependencies(): Promise<void> {
        this.error = '';

        await this.loadWorkspaces();
    }

    private async loadWorkspaces(): Promise<void> {
        if (this.workspacesCache.size > 0) {
            return;
        }

        const workspaces = await this.getWorkspaces()
            .catch(error => {
                this.error = parseErrorMessage(error)!;
            });

        workspaces?.forEach(workspace => this.workspacesCache.set(workspace.id, workspace));

        this.workspacesLoaded();
    }

    public readonly systemsComputedDataFields = new Map<string, ExpressionTransformFunction>([
        ...this.getDefaultComputedDataFields(), ...this.getBooleanFieldComputedData(), this.getOverrideSystemStartTimeComputedField()
    ]);

    /**
     * Handle boolean fields that need .Equals() method instead of = operator
     */
    private getBooleanFieldComputedData(): Array<[string, ExpressionTransformFunction]> {
        return [
            ['grains.data.minion_blackout', this.handleBooleanField('grains.data.minion_blackout')],
        ];
    }

    /**
 * @returns Overrides the System Start Time computed field to handle Grafana date variables and wrap
 * the field with DateTime conversion for proper backend comparison. Converts ${__now:date}, ${__from:date},
 * and ${__to:date} variables to ISO timestamps and supports multi-select values.
 */
    private getOverrideSystemStartTimeComputedField(): [string, ExpressionTransformFunction] {
        return [
            AllFieldNames.SYSTEM_START_TIME,
            (value: string, operation: string, _options?: Map<string, unknown>) => {
                let values = [value];

                if (this.isMultiSelectValue(value)) {
                    values = this.getMultipleValuesArray(value);
                }

                const convertedValues = values.map(value => {
                    if (value === '${__now:date}') {
                        return new Date().toISOString();
                    }
                    return value;
                });

                if (convertedValues.length > 1) {
                    const query = convertedValues
                        .map(val => `DateTime(${AllFieldNames.SYSTEM_START_TIME}) ${operation} DateTime.parse("${val}")`)
                        .join(` ${getConcatOperatorForMultiExpression(operation)} `);
                    return `(${query})`;
                }

                return `DateTime(${AllFieldNames.SYSTEM_START_TIME}) ${operation} DateTime.parse("${convertedValues[0]}")`;
            }
        ];
    }

    private handleBooleanField(backendFieldName: string): ExpressionTransformFunction {
        return (value: string, operation: string, _options?: Map<string, unknown>) => {
            let values = [value];

            if (this.isMultiSelectValue(value)) {
                values = this.getMultipleValuesArray(value);
            }

            const booleanValues = values.map(v => {
                const cleanValue = v.replace(/"/g, '').toLowerCase();
                return cleanValue === 'true' ? 'true' : 'false';
            });

            if (booleanValues.length > 1) {
                const expressions = booleanValues.map(boolVal =>
                    operation === '!='
                        ? `!${backendFieldName}.Equals(${boolVal})`
                        : `${backendFieldName}.Equals(${boolVal})`
                );

                const concatOperator = operation === '!=' ? ' && ' : ' || ';
                return `(${expressions.join(concatOperator)})`;
            }

            if (operation === '!=') {
                return `!${backendFieldName}.Equals(${booleanValues[0]})`;
            }

            return `${backendFieldName}.Equals(${booleanValues[0]})`;
        };
    }

    /**
     * @returns Gathers all fields and applies the default transformation algorithm based on the operation type
     */
    private getDefaultComputedDataFields(): Array<[string, ExpressionTransformFunction]> {
        return [...Object.values(AllFieldNames).map(field => [field, this.getDefaultComputedField(field)] as [string, ExpressionTransformFunction])];
    }

    private getDefaultComputedField(field: string): ExpressionTransformFunction {
        return (value: string, operation: string, _options?: Map<string, unknown>) => {
            switch (operation) {
                case QueryBuilderOperations.CONTAINS.name:
                case QueryBuilderOperations.DOES_NOT_CONTAIN.name:
                    return this.handleContainsExpression(field, value, operation);
                default:
                    return this.multipleValuesQuery(field)(value, operation, _options);
            }
        }
    }

    private handleContainsExpression(field: string, value: string, operation: string): string {
        let values = [value];
        const containsExpressionTemplate = this.getContainsExpressionTemplate(operation);

        if (this.isMultiSelectValue(value)) {
            values = this.getMultipleValuesArray(value);
        }

        if (values.length > 1) {
            const expression =
                values
                    .map(val => buildExpressionFromTemplate(containsExpressionTemplate, field, val))
                    .join(` ${getConcatOperatorForMultiExpression(operation)} `);

            return `(${expression})`;
        }
        return buildExpressionFromTemplate(containsExpressionTemplate, field, values[0])!;
    }

    private getContainsExpressionTemplate(operation: string): string | undefined {
        if (operation === QueryBuilderOperations.CONTAINS.name) {
            return QueryBuilderOperations.CONTAINS.expressionTemplate;
        }

        if (operation === QueryBuilderOperations.DOES_NOT_CONTAIN.name) {
            return QueryBuilderOperations.DOES_NOT_CONTAIN.expressionTemplate;
        }

        return undefined;
    }

    protected multipleValuesQuery(field: string): ExpressionTransformFunction {
        return (value: string, operation: string, _options?: any) => {
            if (this.isMultiSelectValue(value)) {
                const query = this.getMultipleValuesArray(value)
                    .map(val => `${field} ${operation} "${val}"`)
                    .join(` ${getConcatOperatorForMultiExpression(operation)} `);
                return `(${query})`;
            }

            return `${field} ${operation} "${value}"`
        }
    }

    private isMultiSelectValue(value: string): boolean {
        return value.startsWith('{') && value.endsWith('}');
    }

    private getMultipleValuesArray(value: string): string[] {
        return value.replace(/({|})/g, '').split(',');
    }
}
