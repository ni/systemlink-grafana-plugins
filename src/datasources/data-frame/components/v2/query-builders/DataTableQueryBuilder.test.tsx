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

        function renderElement(filter: string, workspaces: Workspace[], globalVariableOptions: QueryBuilderOption[] = []) {
            const reactNode = React.createElement(DataTableQueryBuilder, { filter, workspaces, globalVariableOptions: globalVariableOptions, onChange: jest.fn(), dataTableNameDataSourceCallback: jest.fn() });
            const renderResult = render(reactNode);
            return {
                renderResult,
                conditionsContainer: renderResult.container.getElementsByClassName(`${containerClass}`)
            };
        }

        it('should render empty query builder', () => {
            const { renderResult, conditionsContainer } = renderElement('', [], []);

            expect(conditionsContainer.length).toBe(1);
            expect(renderResult.findByLabelText('Empty condition row')).toBeTruthy();
        });

        it('should select workspace in query builder', () => {
            const { conditionsContainer } = renderElement('workspace = "1"', [workspace], []);

            expect(conditionsContainer?.length).toBe(1);
            expect(conditionsContainer.item(0)?.textContent).toContain(workspace.name);
        });

        it('should select Id in query builder', () => {
            const { conditionsContainer } = renderElement('id = "test-id-1"', [workspace], []);

            expect(conditionsContainer?.length).toBe(1);
            expect(conditionsContainer.item(0)?.textContent).toContain("test-id-1");
        });

        it('should select name in query builder', () => {
            const { conditionsContainer } = renderElement('name = "test-name-1"', [workspace], []);

            expect(conditionsContainer?.length).toBe(1);
            expect(conditionsContainer.item(0)?.textContent).toContain("test-name-1");
        });

        it('should select row count in query builder', () => {
            const { conditionsContainer } = renderElement('rowCount = "5"', [workspace], []);

            expect(conditionsContainer?.length).toBe(1);
            expect(conditionsContainer.item(0)?.textContent).toContain("5");
        });

        it('should select supports append in query builder', () => {
            const { conditionsContainer } = renderElement('supportsAppend = "true"', [workspace], []);

            expect(conditionsContainer?.length).toBe(1);
            expect(conditionsContainer.item(0)?.textContent).toContain("true");
        });

        it('should support key value operations', () => {
            const { conditionsContainer } = renderElement("properties[\"key\"] = \"value\"", [workspace], []);

            expect(conditionsContainer?.length).toBe(1);
            expect(conditionsContainer.item(0)?.textContent).toContain('Properties');
            expect(conditionsContainer.item(0)?.textContent).toContain('matches');
            expect(conditionsContainer.item(0)?.textContent).toContain('key');
            expect(conditionsContainer.item(0)?.textContent).toContain('value');
        });

        it('should select global variable option', () => {
            const globalVariableOption = { label: 'Global variable', value: '$global_variable' };
            const { conditionsContainer } = renderElement('name = \"$global_variable\"', [workspace], [globalVariableOption]);

            expect(conditionsContainer?.length).toBe(1);
            expect(conditionsContainer.item(0)?.textContent).toContain(globalVariableOption.label);
        });

        [['${__from:date}', 'From'], ['${__to:date}', 'To'], ['${__now:date}', 'Now']].forEach(([value, label]) => {
            it(`should select user friendly value for created date`, () => {
                const { conditionsContainer } = renderElement(`createdAt > \"${value}\"`, [workspace], globalVariableOptions);

                expect(conditionsContainer?.length).toBe(1);
                expect(conditionsContainer.item(0)?.textContent).toContain(label);
            });

            it(`should select user friendly value for metadata modified date`, () => {
                const { conditionsContainer } = renderElement(`metadataModifiedAt > \"${value}\"`, [workspace], globalVariableOptions);

                expect(conditionsContainer?.length).toBe(1);
                expect(conditionsContainer.item(0)?.textContent).toContain(label);
            });

            it(`should select user friendly value for rows modified date`, () => {
                const { conditionsContainer } = renderElement(`rowsModifiedAt > \"${value}\"`, [workspace], globalVariableOptions);

                expect(conditionsContainer?.length).toBe(1);
                expect(conditionsContainer.item(0)?.textContent).toContain(label);
            });
        });
    });
});
