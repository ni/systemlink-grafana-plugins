import { QueryBuilderOption, Workspace } from 'core/types';
import React, { ReactNode } from 'react';
import { render } from '@testing-library/react';
import { WorkItemsQueryBuilder } from './WorkItemsQueryBuilder';

describe('WorkItemsQueryBuilder', () => {
  let reactNode: ReactNode;
  const containerClass = 'smart-filter-group-condition-container';
  const workspace = { id: '1', name: 'Workspace Name' } as Workspace;

  function renderElement(
    filter: string,
    workspaces: Workspace[] | null = [],
    globalVariableOptions: QueryBuilderOption[] = []
  ) {
    reactNode = React.createElement(WorkItemsQueryBuilder, { filter, workspaces, globalVariableOptions, onChange: jest.fn() });
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

  it('should select id option', () => {
    const { conditionsContainer } = renderElement('id = "1"');
    expect(conditionsContainer?.length).toBe(1);
    expect(conditionsContainer.item(0)?.textContent).toContain('ID');
    expect(conditionsContainer.item(0)?.textContent).toContain('equals');
  });

  it('should select name option with contains operation', () => {
    const { conditionsContainer } = renderElement('name.Contains("test")');
    expect(conditionsContainer?.length).toBe(1);
    expect(conditionsContainer.item(0)?.textContent).toContain('Name');
    expect(conditionsContainer.item(0)?.textContent).toContain('contains');
  });

  it('should select type option', () => {
    const { conditionsContainer } = renderElement('type = "WORK_ORDERS"');
    expect(conditionsContainer?.length).toBe(1);
    expect(conditionsContainer.item(0)?.textContent).toContain('Type');
    expect(conditionsContainer.item(0)?.textContent).toContain('Work orders');
  });

  it('should select state option', () => {
    const { conditionsContainer } = renderElement('state = "Active"');
    expect(conditionsContainer?.length).toBe(1);
    expect(conditionsContainer.item(0)?.textContent).toContain('State');
  });

  it('should support is blank operation for substate', () => {
    const { conditionsContainer } = renderElement('string.IsNullOrEmpty(substate)');

    expect(conditionsContainer?.length).toBe(1);
    expect(conditionsContainer.item(0)?.textContent).toContain('Substate');
    expect(conditionsContainer.item(0)?.textContent).toContain('is blank');
  });

  it('should support key value operations for properties', () => {
    const { conditionsContainer } = renderElement('properties["key"] = "value"');

    expect(conditionsContainer?.length).toBe(1);
    expect(conditionsContainer.item(0)?.textContent).toContain('Properties');
    expect(conditionsContainer.item(0)?.textContent).toContain('matches');
    expect(conditionsContainer.item(0)?.textContent).toContain('key');
    expect(conditionsContainer.item(0)?.textContent).toContain('value');
  });

  it('should support is blank operation for due date', () => {
    const { conditionsContainer } = renderElement('dueDate == null || dueDate == ""');

    expect(conditionsContainer?.length).toBe(1);
    expect(conditionsContainer.item(0)?.textContent).toContain('Due date');
    expect(conditionsContainer.item(0)?.textContent).toContain('is blank');
  });

  it('should support is not blank operation for earliest start date', () => {
    const { conditionsContainer } = renderElement('earliestStartDate != null && earliestStartDate != ""');

    expect(conditionsContainer?.length).toBe(1);
    expect(conditionsContainer.item(0)?.textContent).toContain('Earliest start date');
    expect(conditionsContainer.item(0)?.textContent).toContain('is not blank');
  });

  [['${__from:date}', 'From'], ['${__to:date}', 'To'], ['${__now:date}', 'Now']].forEach(([value, label]) => {
    it(`should select user friendly value for updated date`, () => {
      const { conditionsContainer } = renderElement(`updatedAt > \"${value}\"`);

      expect(conditionsContainer?.length).toBe(1);
      expect(conditionsContainer.item(0)?.textContent).toContain(label);
    });
  });

  it('should select global variable option', () => {
    const globalVariableOption = { label: 'Global variable', value: '$global_variable' };
    const { conditionsContainer } = renderElement('type = \"$global_variable\"', [], [globalVariableOption]);

    expect(conditionsContainer?.length).toBe(1);
    expect(conditionsContainer.item(0)?.textContent).toContain(globalVariableOption.label);
  });

  it('should select workspace in query builder', () => {
    const { conditionsContainer } = renderElement('workspace = "1"', [workspace]);

    expect(conditionsContainer?.length).toBe(1);
    expect(conditionsContainer.item(0)?.textContent).toContain(workspace.name);
  });

  it('should select asset name option', () => {
    const { conditionsContainer } = renderElement('assetName = "Asset 1"');

    expect(conditionsContainer?.length).toBe(1);
    expect(conditionsContainer.item(0)?.textContent).toContain('Asset name');
  });
});
