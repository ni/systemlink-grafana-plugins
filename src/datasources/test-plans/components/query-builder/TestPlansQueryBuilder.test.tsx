import { QueryBuilderOption, Workspace } from 'core/types';
import React, { ReactNode } from 'react';
import { render } from '@testing-library/react';
import { TestPlansQueryBuilder } from './TestPlansQueryBuilder';
import { SystemAlias } from 'shared/types/QuerySystems.types';
import { ProductPartNumberAndName } from 'shared/types/QueryProducts.types';

describe('TestPlansQueryBuilder', () => {
    let reactNode: ReactNode;
    const containerClass = 'smart-filter-group-condition-container';
    const workspace = { id: '1', name: 'Selected workspace' } as Workspace;
    const systemAlias: SystemAlias = {
        id: '1',
        alias: 'System 1'
    };
    const product: ProductPartNumberAndName = {
        partNumber: 'part-number',
        name: 'Product name'
    };

    function renderElement(filter: string, workspaces: Workspace[] | null, systemAliases: SystemAlias[] | null, products: ProductPartNumberAndName[] | null, globalVariableOptions: QueryBuilderOption[] = []) {
        reactNode = React.createElement(TestPlansQueryBuilder, { filter, workspaces, systemAliases, products, globalVariableOptions, onChange: jest.fn() });
        const renderResult = render(reactNode);
        return {
            renderResult,
            conditionsContainer: renderResult.container.getElementsByClassName(`${containerClass}`),
        };
    }

    it('should render empty query builder', () => {
        const { renderResult, conditionsContainer } = renderElement('', [], [], []);

        expect(conditionsContainer.length).toBe(1);
        expect(renderResult.findByLabelText('Empty condition row')).toBeTruthy();
    });

    it('should select workspace in query builder', () => {
        const { conditionsContainer } = renderElement('workspace = "1"', [workspace], [], []);

        expect(conditionsContainer?.length).toBe(1);
        expect(conditionsContainer.item(0)?.textContent).toContain(workspace.name);
    });

    it('should select system alias in query builder', () => {
        const { conditionsContainer } = renderElement('systemAliasName = "1"', [], [systemAlias], []);

        expect(conditionsContainer?.length).toBe(1);
        expect(conditionsContainer.item(0)?.textContent).toContain(systemAlias.alias);
    });

    it('should select product name and part number in query builder', () => {
        const { conditionsContainer } = renderElement('product = "part-number"', [], [], [product]);

        expect(conditionsContainer?.length).toBe(1);
        expect(conditionsContainer.item(0)?.textContent).toContain(product.partNumber);
        expect(conditionsContainer.item(0)?.textContent).toContain(product.name);

    });

    [['${__from:date}', 'From'], ['${__to:date}', 'To'], ['${__now:date}', 'Now']].forEach(([value, label]) => {
        it(`should select user friendly value for updated date`, () => {
            const { conditionsContainer } = renderElement(`updatedAt > \"${value}\"`, [], [], []);

            expect(conditionsContainer?.length).toBe(1);
            expect(conditionsContainer.item(0)?.textContent).toContain(label);
        });

        it(`should select user friendly value for created date`, () => {
            const { conditionsContainer } = renderElement(`created > \"${value}\"`, [], [], []);

            expect(conditionsContainer?.length).toBe(1);
            expect(conditionsContainer.item(0)?.textContent).toContain(label);
        });

        it(`should select user friendly value for estimated end date`, () => {
            const { conditionsContainer } = renderElement(`estimatedEndDate > \"${value}\"`, [], [], []);

            expect(conditionsContainer?.length).toBe(1);
            expect(conditionsContainer.item(0)?.textContent).toContain(label);
        });

        it(`should select user friendly value for planned start date date`, () => {
            const { conditionsContainer } = renderElement(`plannedStartDate > \"${value}\"`, [], [], []);

            expect(conditionsContainer?.length).toBe(1);
            expect(conditionsContainer.item(0)?.textContent).toContain(label);
        });
    });
});
