import { QueryBuilderOption, Workspace } from 'core/types';
import React, { ReactNode } from 'react';
import { render } from '@testing-library/react';
import { TestPlansQueryBuilder } from './TestPlansQueryBuilder';
import { SystemAlias } from 'shared/types/QuerySystems.types';
import { User } from 'shared/types/QueryUsers.types';
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
        id: '1',
        partNumber: 'part-number',
        name: 'Product name'
    };
    const mockUsers = [
        {
            id: '1',
            firstName: 'User',
            lastName: '1',
            email: 'user1@123.com',
            properties: {},
            keywords: [],
            created: '',
            updated: '',
            orgId: '',
        },
        {
            id: '2',
            firstName: 'User',
            lastName: '2',
            email: 'user2@123.com',
            properties: {},
            keywords: [],
            created: '',
            updated: '',
            orgId: '',
        }
    ];

    function renderElement(
        filter: string,
        workspaces: Workspace[] | null,
        systemAliases: SystemAlias[] | null,
        users: User[] | null,
        products: ProductPartNumberAndName[] | null,
        globalVariableOptions: QueryBuilderOption[] = []
    ) {
        reactNode = React.createElement(
            TestPlansQueryBuilder,
            { filter, workspaces, systemAliases, users, products, globalVariableOptions, onChange: jest.fn() }
        );
        const renderResult = render(reactNode);
        return {
            renderResult,
            conditionsContainer: renderResult.container.getElementsByClassName(`${containerClass}`),
        };
    }

    it('should render empty query builder', () => {
        const { renderResult, conditionsContainer } = renderElement('', [], [], [], []);

        expect(conditionsContainer.length).toBe(1);
        expect(renderResult.getByLabelText('Empty condition row')).toBeTruthy();
    });

    it('should select workspace in query builder', () => {
        const { conditionsContainer } = renderElement('workspace = "1"', [workspace], [], [], []);

        expect(conditionsContainer?.length).toBe(1);
        expect(conditionsContainer.item(0)?.textContent).toContain(workspace.name);
    });

    it('should select system alias in query builder', () => {
        const { conditionsContainer } = renderElement('systemId = "1"', [], [systemAlias], [], []);

        expect(conditionsContainer?.length).toBe(1);
        expect(conditionsContainer.item(0)?.textContent).toContain(systemAlias.alias);
    });

    it('should select assigned to in query builder', () => {
        const { conditionsContainer } = renderElement('assignedTo = "1"', [], [], mockUsers, []);

        expect(conditionsContainer?.length).toBe(1);
        expect(conditionsContainer.item(0)?.textContent).toContain("User 1");
    });

    it('should select created by in query builder', () => {
        const { conditionsContainer } = renderElement('createdBy = "2"', [], [], mockUsers, []);

        expect(conditionsContainer?.length).toBe(1);
        expect(conditionsContainer.item(0)?.textContent).toContain("User 2");
    });

    it('should select updated by in query builder', () => {
        const { conditionsContainer } = renderElement('updatedBy = "2"', [], [], mockUsers, []);

        expect(conditionsContainer?.length).toBe(1);
        expect(conditionsContainer.item(0)?.textContent).toContain("User 2");
    });

    it('should select product name and part number in query builder', () => {
        const { conditionsContainer } = renderElement('partNumber = "part-number"', [], [], [], [product]);

        expect(conditionsContainer?.length).toBe(1);
        expect(conditionsContainer.item(0)?.textContent).toContain(product.partNumber);
        expect(conditionsContainer.item(0)?.textContent).toContain(product.name);

    });

    it('should select state option', () => {
        const { conditionsContainer } = renderElement('state = "PendingApproval"', [], [], [], []);
        expect(conditionsContainer?.length).toBe(1);
        expect(conditionsContainer.item(0)?.textContent).toContain('State');
        expect(conditionsContainer.item(0)?.textContent).toContain('equals');
        expect(conditionsContainer.item(0)?.textContent).toContain('Pending approval');
    });
    it('should select global variable option', () => {
        const globalVariableOption = { label: 'Global variable', value: '$global_variable' };
        const { conditionsContainer } = renderElement('state = \"$global_variable\"', [], [], [], [], [globalVariableOption]);

        expect(conditionsContainer?.length).toBe(1);
        expect(conditionsContainer.item(0)?.textContent).toContain(globalVariableOption.label);
    });

    it('should support key value operations', () => {
        const { conditionsContainer } = renderElement("properties[\"key\"] = \"value\"", [], [], [], []);

        expect(conditionsContainer?.length).toBe(1);
        expect(conditionsContainer.item(0)?.textContent).toContain('Properties');
        expect(conditionsContainer.item(0)?.textContent).toContain('matches');
        expect(conditionsContainer.item(0)?.textContent).toContain('key');
        expect(conditionsContainer.item(0)?.textContent).toContain('value');
    });

    it('should support is blank operation for Estimated end date', () => {
        const { conditionsContainer } = renderElement('estimatedEndDateTime == null || estimatedEndDateTime == ""', [], [], [], []);

        expect(conditionsContainer?.length).toBe(1);
        expect(conditionsContainer.item(0)?.textContent).toContain('Estimated end date');
        expect(conditionsContainer.item(0)?.textContent).toContain('is blank');
    });

    it('should support is not blank operation for Estimated end date', () => {
        const { conditionsContainer } = renderElement('estimatedEndDateTime != null && estimatedEndDateTime != ""', [], [], [], []);

        expect(conditionsContainer?.length).toBe(1);
        expect(conditionsContainer.item(0)?.textContent).toContain('Estimated end date');
        expect(conditionsContainer.item(0)?.textContent).toContain('is not blank');
    });

    it('should support is blank operation for Planned start date', () => {
        const { conditionsContainer } = renderElement('plannedStartDateTime == null || plannedStartDateTime == ""', [], [], [], []);

        expect(conditionsContainer?.length).toBe(1);
        expect(conditionsContainer.item(0)?.textContent).toContain('Planned start date');
        expect(conditionsContainer.item(0)?.textContent).toContain('is blank');
    });

    it('should support is not blank operation for Planned start date', () => {
        const { conditionsContainer } = renderElement('plannedStartDateTime != null && plannedStartDateTime != ""', [], [], [], []);

        expect(conditionsContainer?.length).toBe(1);
        expect(conditionsContainer.item(0)?.textContent).toContain('Planned start date');
        expect(conditionsContainer.item(0)?.textContent).toContain('is not blank');
    });

    [['${__from:date}', 'From'], ['${__to:date}', 'To'], ['${__now:date}', 'Now']].forEach(([value, label]) => {
        it(`should select user friendly value for updated date`, () => {
            const { conditionsContainer } = renderElement(`updatedAt > \"${value}\"`, [], [], [], []);

            expect(conditionsContainer?.length).toBe(1);
            expect(conditionsContainer.item(0)?.textContent).toContain(label);
        });

        it(`should select user friendly value for created date`, () => {
            const { conditionsContainer } = renderElement(`createdAt > \"${value}\"`, [], [], [], []);

            expect(conditionsContainer?.length).toBe(1);
            expect(conditionsContainer.item(0)?.textContent).toContain(label);
        });

        it(`should select user friendly value for estimated end date`, () => {
            const { conditionsContainer } = renderElement(`estimatedEndDateTime > \"${value}\"`, [], [], [], []);

            expect(conditionsContainer?.length).toBe(1);
            expect(conditionsContainer.item(0)?.textContent).toContain(label);
        });

        it(`should select user friendly value for planned start date date`, () => {
            const { conditionsContainer } = renderElement(`plannedStartDateTime > \"${value}\"`, [], [], [], []);

            expect(conditionsContainer?.length).toBe(1);
            expect(conditionsContainer.item(0)?.textContent).toContain(label);
        });
    });
});
