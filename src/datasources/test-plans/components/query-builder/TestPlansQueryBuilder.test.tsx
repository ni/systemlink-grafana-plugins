import { QueryBuilderOption } from 'core/types';
import React, { ReactNode } from 'react';
import { render } from '@testing-library/react';
import { TestPlansQueryBuilder } from './TestPlansQueryBuilder';
import { SystemAlias } from 'shared/types/QuerySystems.types';

describe('TestPlansQueryBuilder', () => {
    let reactNode: ReactNode;
    const containerClass = 'smart-filter-group-condition-container';
    const systemAlias: SystemAlias = {
        id: '1',
        alias: 'System 1'
    };

    function renderElement(filter: string, systemAliases: SystemAlias[] | null, globalVariableOptions: QueryBuilderOption[] = []) {
        reactNode = React.createElement(TestPlansQueryBuilder, { filter, systemAliases, globalVariableOptions, onChange: jest.fn() });
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

    it('should select system alis in query builder', () => {
        const { conditionsContainer } = renderElement('systemAliasName = "1"', [systemAlias]);

        expect(conditionsContainer?.length).toBe(1);
        expect(conditionsContainer.item(0)?.textContent).toContain(systemAlias.alias);
    });

});
