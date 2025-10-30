import { render, waitFor } from "@testing-library/react";
import { QueryBuilderOption, Workspace } from "core/types";
import React from "react";
import { QBFieldWithDataSourceCallback } from "datasources/data-frame/types";
import { SlQueryBuilder } from "core/components/SlQueryBuilder/SlQueryBuilder";

jest.mock('core/components/SlQueryBuilder/SlQueryBuilder', () => {
    const actual = jest.requireActual('core/components/SlQueryBuilder/SlQueryBuilder');
    return {
        SlQueryBuilder: jest.fn(actual.SlQueryBuilder),
    };
});

import { DataTableQueryBuilder } from './DataTableQueryBuilder';

describe('DataTableQueryBuilder', () => {
    const slQueryBuilderMock = SlQueryBuilder as unknown as jest.MockedFunction<typeof SlQueryBuilder>;
    const actualSlQueryBuilder = jest.requireActual('core/components/SlQueryBuilder/SlQueryBuilder').SlQueryBuilder;
    const containerClass = 'smart-filter-group-condition-container';
    const workspace = { id: '1', name: 'Selected workspace' } as Workspace;
    const globalVariableOptions = [
        { label: 'From', value: '${__from:date}' },
        { label: 'To', value: '${__to:date}' },
        { label: 'Now', value: '${__now:date}' },
    ];

    beforeEach(() => {
        jest.clearAllMocks();
        slQueryBuilderMock.mockImplementation(actualSlQueryBuilder);
    });

    async function renderElement(filter: string, workspaces: Workspace[], globalVariableOptions: QueryBuilderOption[] = [], dataTableNameLookupCallback = jest.fn()) {
        const reactNode = React.createElement(DataTableQueryBuilder, { filter, workspaces, globalVariableOptions: globalVariableOptions, onChange: jest.fn(), dataTableNameLookupCallback });
        const renderResult = render(reactNode);
        return {
            renderResult,
            conditionsContainer: renderResult.container.getElementsByClassName(`${containerClass}`)
        };
    }

    describe('useEffects', () => {
        it('should render empty query builder', async () => {
            const { renderResult, conditionsContainer } = await renderElement('', [], []);

            expect(conditionsContainer.length).toBe(1);
            expect(renderResult.findByLabelText('Empty condition row')).toBeTruthy();
        });

        it('should select workspace in query builder', async () => {
            const { conditionsContainer } = await renderElement('workspace = "1"', [workspace], []);

            expect(conditionsContainer?.length).toBe(1);
            expect(conditionsContainer.item(0)?.textContent).toContain(workspace.name);
        });

        it('should select Id in query builder', async () => {
            const { conditionsContainer } = await renderElement('id = "test-id-1"', [workspace], []);

            expect(conditionsContainer?.length).toBe(1);
            expect(conditionsContainer.item(0)?.textContent).toContain("test-id-1");
        });

        it('should select name in query builder', async () => {
            const { conditionsContainer } = await renderElement('name = "test-name-1"', [workspace], []);

            expect(conditionsContainer?.length).toBe(1);
            expect(conditionsContainer.item(0)?.textContent).toContain("test-name-1");
        });

        it('should select row count in query builder', async () => {
            const { conditionsContainer } = await renderElement('rowCount = "5"', [workspace], []);

            expect(conditionsContainer?.length).toBe(1);
            expect(conditionsContainer.item(0)?.textContent).toContain("5");
        });

        it('should select supports append in query builder', async () => {
            const { conditionsContainer } = await renderElement('supportsAppend = "true"', [workspace], []);

            expect(conditionsContainer?.length).toBe(1);
            expect(conditionsContainer.item(0)?.textContent).toContain("true");
        });

        it('should support key value operations', async () => {
            const { conditionsContainer } = await renderElement("properties[\"key\"] = \"value\"", [workspace], []);

            expect(conditionsContainer?.length).toBe(1);
            expect(conditionsContainer.item(0)?.textContent).toContain('Properties');
            expect(conditionsContainer.item(0)?.textContent).toContain('matches');
            expect(conditionsContainer.item(0)?.textContent).toContain('key');
            expect(conditionsContainer.item(0)?.textContent).toContain('value');
        });

        it('should select global variable option', async () => {
            const globalVariableOption = { label: 'Global variable', value: '$global_variable' };
            const { conditionsContainer } = await renderElement('workspace = \"$global_variable\"', [workspace], [globalVariableOption]);

            expect(conditionsContainer?.length).toBe(1);
            expect(conditionsContainer.item(0)?.textContent).toContain(globalVariableOption.label);
        });

        [['${__from:date}', 'From'], ['${__to:date}', 'To'], ['${__now:date}', 'Now']].forEach(([value, label]) => {
            it(`should select user friendly value for created date`, async () => {
                const { conditionsContainer } = await renderElement(`createdAt > \"${value}\"`, [workspace], globalVariableOptions);

                expect(conditionsContainer?.length).toBe(1);
                expect(conditionsContainer.item(0)?.textContent).toContain(label);
            });

            it(`should select user friendly value for metadata modified date`, async () => {
                const { conditionsContainer } = await renderElement(`metadataModifiedAt > \"${value}\"`, [workspace], globalVariableOptions);

                expect(conditionsContainer?.length).toBe(1);
                expect(conditionsContainer.item(0)?.textContent).toContain(label);
            });

            it(`should select user friendly value for rows modified date`, async () => {
                const { conditionsContainer } = await renderElement(`rowsModifiedAt > \"${value}\"`, [workspace], globalVariableOptions);

                expect(conditionsContainer?.length).toBe(1);
                expect(conditionsContainer.item(0)?.textContent).toContain(label);
            });
        });
    });

    it('should use dataTableNameDataSourceCallback to populate data table names', async () => {
        const queryBuilderCallback = jest.fn();
        const dataTableNameDataSourceCallback = jest.fn().mockImplementation(async (_query: string) => {
            return [
                { label: 'Data Table 1', value: 'data-table-1' },
                { label: 'Data Table 2', value: 'data-table-2' },
            ];
        });
        let dataTableNameField: QBFieldWithDataSourceCallback | undefined;
        slQueryBuilderMock.mockImplementation((props: any) => {
            dataTableNameField = props.fields?.find((field: { dataField: string; }) => field.dataField === 'name') as QBFieldWithDataSourceCallback;
            return (<></>);
        });
        await renderElement('', [workspace], [], dataTableNameDataSourceCallback);
        const dataSource = dataTableNameField?.lookup?.dataSource as ((query: string, callback: Function) => void);

        // In the actual scenario dataSource will be called asynchronously,
        // when user types a value in the data table name value field. Here the dataSource
        // is called manually to simulate the user typing.
        dataSource('data-', queryBuilderCallback);

        await waitFor(() => {
            expect(dataTableNameDataSourceCallback).toHaveBeenCalledWith('data-');
            expect(queryBuilderCallback).toHaveBeenCalledWith([
                { "label": "Data Table 1", "value": "data-table-1" },
                { "label": "Data Table 2", "value": "data-table-2" }
            ]);
        });
    });
});
