import { QueryBuilderOption } from 'core/types';
import React, { ReactNode } from 'react';
import { render } from '@testing-library/react';
import { TestPlansQueryBuilder } from './TestPlansQueryBuilder';
import { ProductPartNumberAndName } from 'shared/types/QueryProducts.types';

describe('TestPlansQueryBuilder', () => {
    let reactNode: ReactNode;
    const containerClass = 'smart-filter-group-condition-container';
    const product: ProductPartNumberAndName = {
        partNumber: 'part-number',
        name: 'Product name'
    };

    function renderElement(filter: string, products: ProductPartNumberAndName[] | null, globalVariableOptions: QueryBuilderOption[] = []) {
        reactNode = React.createElement(TestPlansQueryBuilder, { filter, products, globalVariableOptions, onChange: jest.fn() });
        const renderResult = render(reactNode);
        return {
            renderResult,
            conditionsContainer: renderResult.container.getElementsByClassName(`${containerClass}`),
        };
    }

    it('should render empty query builder', () => {
        const { renderResult, conditionsContainer } = renderElement('', []);

        expect(conditionsContainer.length).toBe(1);
        expect(renderResult.findByLabelText('Empty condition row')).toBeTruthy();
    });

    it('should select product name and part number in query builder', () => {
        const { conditionsContainer } = renderElement('product = "part-number"', [product]);

        expect(conditionsContainer?.length).toBe(1);
        expect(conditionsContainer.item(0)?.textContent).toContain(product.partNumber);
        expect(conditionsContainer.item(0)?.textContent).toContain(product.name);

    });
});
