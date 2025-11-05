import { render } from "@testing-library/react";
import { QueryBuilderOption } from "core/types";
import React from "react";
import { ColumnsQueryBuilder } from './ColumnsQueryBuilder';

describe('ColumnsQueryBuilder', () => {
    const containerClass = 'smart-filter-group-condition-container';

    beforeEach(() => {
        jest.clearAllMocks();
    });

    async function renderElement(filter: string, globalVariableOptions: QueryBuilderOption[] = []) {
        const reactNode = React.createElement(ColumnsQueryBuilder, { filter, globalVariableOptions: globalVariableOptions, onChange: jest.fn() });
        const renderResult = render(reactNode);
        return {
            renderResult,
            conditionsContainer: renderResult.container.getElementsByClassName(`${containerClass}`)
        };
    }

    describe('useEffects', () => {
        it('should render empty query builder', async () => {
            const { renderResult, conditionsContainer } = await renderElement('', []);

            expect(conditionsContainer.length).toBe(1);
            expect(renderResult.findByLabelText('Empty condition row')).toBeTruthy();
        });

        it('should select column name in query builder', async () => {
            const { conditionsContainer } = await renderElement('columnName = "test-column"', []);

            expect(conditionsContainer?.length).toBe(1);
            expect(conditionsContainer.item(0)?.textContent).toContain("test-column");
        });

        it('should select global variable option', async () => {
            const globalVariableOption = { label: 'Global variable', value: '$global_variable' };
            const { conditionsContainer } = await renderElement('columnName = \"$global_variable\"', [globalVariableOption]);

            expect(conditionsContainer?.length).toBe(1);
            expect(conditionsContainer.item(0)?.textContent).toContain(globalVariableOption.value);
        });
    });
});
