import { QueryBuilderOption } from 'core/types';
import React, { ReactNode } from 'react';
import { render } from '@testing-library/react';
import { WorkOrdersQueryBuilder } from './WorkOrdersQueryBuilder';
import { User } from 'shared/types/QueryUsers.types';

describe('WorkOrdersQueryBuilder', () => {
  let reactNode: ReactNode;
  const containerClass = 'smart-filter-group-condition-container';
  const mockUser = {
    id: '1', 
    firstName: 'User',
    lastName: '1',
    email: '',
    properties: {},
    keywords: [],
    created: '',
    updated: '',
    orgId: ''
  };

  function renderElement(filter: string, users: User[] = [], globalVariableOptions: QueryBuilderOption[] = []) {
    reactNode = React.createElement(WorkOrdersQueryBuilder, { filter,users, globalVariableOptions, onChange: jest.fn() });
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

  it('should select assigned to in query builder', () => {
    const { conditionsContainer } = renderElement('assignedTo = "1"', [mockUser]);

    expect(conditionsContainer?.length).toBe(1);
    expect(conditionsContainer.item(0)?.textContent).toContain("User 1");
  });

  it('should select created by in query builder', () => {
    const { conditionsContainer } = renderElement('createdBy = "1"', [mockUser]);

    expect(conditionsContainer?.length).toBe(1);
    expect(conditionsContainer.item(0)?.textContent).toContain("User 1");
  });

  it('should select requested by in query builder', () => {
    const { conditionsContainer } = renderElement('requestedBy = "1"', [mockUser]);

    expect(conditionsContainer?.length).toBe(1);
    expect(conditionsContainer.item(0)?.textContent).toContain("User 1");
  });

  it('should select updated by in query builder', () => {
    const { conditionsContainer } = renderElement('updatedBy = "1"', [mockUser]);

    expect(conditionsContainer?.length).toBe(1);
    expect(conditionsContainer.item(0)?.textContent).toContain("User 1");
  });
});
