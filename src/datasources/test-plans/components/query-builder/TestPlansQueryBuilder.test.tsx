import { QueryBuilderOption } from 'core/types';
import React, { ReactNode } from 'react';
import { render } from '@testing-library/react';
import { TestPlansQueryBuilder } from './TestPlansQueryBuilder';

describe('TestPlansQueryBuilder', () => {
    let reactNode: ReactNode;
    const containerClass = 'smart-filter-group-condition-container';

    function renderElement(filter: string, globalVariableOptions: QueryBuilderOption[] = []) {
        reactNode = React.createElement(TestPlansQueryBuilder, { filter, globalVariableOptions, onChange: jest.fn() });
        const renderResult = render(reactNode);
        return {
            renderResult,
            conditionsContainer: renderResult.container.getElementsByClassName(`${containerClass}`),
        };
    }

    it('should render empty query builder', () => {
        const { renderResult, conditionsContainer } = renderElement('');

        expect(conditionsContainer.length).toBe(1);
        expect(renderResult.findByLabelText('Empty condition row')).toBeTruthy();
    });
});
