import { QueryBuilderOption, Workspace } from "core/types";
import { DataTableQueryBuilder } from "./DataTableQueryBuilder";
import React from "react";
import { render } from "@testing-library/react";

describe('DataTableQueryBuilder', () => {
    describe('useEffects', () => {
        const containerClass = 'smart-filter-group-condition-container';
        const workspace = { id: '1', name: 'Selected workspace' } as Workspace;
        const globalVariableOptions = [
            { label: 'From', value: '${__from:date}' },
            { label: 'To', value: '${__to:date}' },
            { label: 'Now', value: '${__now:date}' },
        ];

        function renderElement(workspaces: Workspace[], filter: string, globalVars: QueryBuilderOption[] = []) {
            const reactNode = React.createElement(DataTableQueryBuilder, { filter, workspaces, globalVariableOptions: globalVars, onChange: jest.fn(), });
            const renderResult = render(reactNode);
            return {
                renderResult,
                conditionsContainer: renderResult.container.getElementsByClassName(`${containerClass}`)
            };
        }

        it('should render empty query builder', () => {
            const { renderResult, conditionsContainer } = renderElement([], '', []);

            expect(conditionsContainer.length).toBe(1);
            expect(renderResult.findByLabelText('Empty condition row')).toBeTruthy();
        });

        it('should select workspace in query builder', () => {
            const { conditionsContainer } = renderElement([workspace], 'workspace = "1"', []);

            expect(conditionsContainer?.length).toBe(1);
            expect(conditionsContainer.item(0)?.textContent).toContain(workspace.name);
        });

        it('should select Id in query builder', () => {
            const { conditionsContainer } = renderElement([workspace], 'id = "test-id-1"', []);

            expect(conditionsContainer?.length).toBe(1);
            expect(conditionsContainer.item(0)?.textContent).toContain("test-id-1");
        });

        it('should select name in query builder', () => {
            const { conditionsContainer } = renderElement([workspace], 'name = "test-name-1"', []);

            expect(conditionsContainer?.length).toBe(1);
            expect(conditionsContainer.item(0)?.textContent).toContain("test-name-1");
        });

        it('should select row count in query builder', () => {
            const { conditionsContainer } = renderElement([workspace], 'rowCount = "5"', []);

            expect(conditionsContainer?.length).toBe(1);
            expect(conditionsContainer.item(0)?.textContent).toContain("5");
        });

        it('should select supports append in query builder', () => {
            const { conditionsContainer } = renderElement([workspace], 'supportsAppend = "true"', []);

            expect(conditionsContainer?.length).toBe(1);
            expect(conditionsContainer.item(0)?.textContent).toContain("true");
        });

        it('should support key value operations', () => {
            const { conditionsContainer } = renderElement([workspace], "properties[\"key\"] = \"value\"", []);

            expect(conditionsContainer?.length).toBe(1);
            expect(conditionsContainer.item(0)?.textContent).toContain('Properties');
            expect(conditionsContainer.item(0)?.textContent).toContain('matches');
            expect(conditionsContainer.item(0)?.textContent).toContain('key');
            expect(conditionsContainer.item(0)?.textContent).toContain('value');
        });

        it('should select global variable option', () => {
            const globalVariableOption = { label: 'Global variable', value: '$global_variable' };
            const { conditionsContainer } = renderElement([workspace], 'name = \"$global_variable\"', [globalVariableOption]);

            expect(conditionsContainer?.length).toBe(1);
            expect(conditionsContainer.item(0)?.textContent).toContain(globalVariableOption.label);
        });

        [['${__from:date}', 'From'], ['${__to:date}', 'To'], ['${__now:date}', 'Now']].forEach(([value, label]) => {
            it(`should select user friendly value for created date`, () => {
                const { conditionsContainer } = renderElement([workspace], `createdAt > \"${value}\"`, globalVariableOptions);

                expect(conditionsContainer?.length).toBe(1);
                expect(conditionsContainer.item(0)?.textContent).toContain(label);
            });

            it(`should select user friendly value for metadata modified date`, () => {
                const { conditionsContainer } = renderElement([workspace], `metadataModifiedAt > \"${value}\"`, globalVariableOptions);

                expect(conditionsContainer?.length).toBe(1);
                expect(conditionsContainer.item(0)?.textContent).toContain(label);
            });

            it(`should select user friendly value for rows modified date`, () => {
                const { conditionsContainer } = renderElement([workspace], `rowsModifiedAt > \"${value}\"`, globalVariableOptions);

                expect(conditionsContainer?.length).toBe(1);
                expect(conditionsContainer.item(0)?.textContent).toContain(label);
            });
        });
    });
});
