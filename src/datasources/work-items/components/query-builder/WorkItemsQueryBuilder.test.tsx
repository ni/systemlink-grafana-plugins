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
    users: any[] | null = [],
    globalVariableOptions: QueryBuilderOption[] = []
  ) {
    reactNode = React.createElement(WorkItemsQueryBuilder, { filter, workspaces, users, globalVariableOptions, onChange: jest.fn() });
    const renderResult = render(reactNode);
    return {
      renderResult,
      conditionsContainer: renderResult.container.getElementsByClassName(`${containerClass}`),
    };
  }

  it('should render empty query builder', async () => {
    const { renderResult, conditionsContainer } = renderElement('');

    expect(conditionsContainer.length).toBe(1);
    expect(await renderResult.findByLabelText('Empty condition row')).toBeTruthy();
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
    expect(conditionsContainer.item(0)?.textContent).toContain('Work item name');
    expect(conditionsContainer.item(0)?.textContent).toContain('contains');
  });

  it('should select type option', () => {
    const { conditionsContainer } = renderElement('type = "WORK_ORDERS"');
    expect(conditionsContainer?.length).toBe(1);
    expect(conditionsContainer.item(0)?.textContent).toContain('Work item type');
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
    const { conditionsContainer } = renderElement('timeline.dueDateTime == null || timeline.dueDateTime == ""');

    expect(conditionsContainer?.length).toBe(1);
    expect(conditionsContainer.item(0)?.textContent).toContain('Due date');
    expect(conditionsContainer.item(0)?.textContent).toContain('is blank');
  });

  it('should support is not blank operation for earliest start date', () => {
    const { conditionsContainer } = renderElement('timeline.earliestStartDateTime != null && timeline.earliestStartDateTime != ""');

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
    const { conditionsContainer } = renderElement('type = \"$global_variable\"', [], [], [globalVariableOption]);

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
    expect(conditionsContainer.item(0)?.textContent).toContain('Asset Name');
  });

  it('should select assigned to in query builder', () => {
    const mockUsers = [
      { id: '1', firstName: 'User', lastName: '1', email: 'user1@123.com', properties: {}, keywords: [], created: '', updated: '', orgId: '' },
    ];
    const { conditionsContainer } = renderElement('assignedTo = "1"', [], mockUsers as any);

    expect(conditionsContainer?.length).toBe(1);
    expect(conditionsContainer.item(0)?.textContent).toContain('Assigned to');
  });

  it('should select test program option', () => {
    const { conditionsContainer } = renderElement('testProgram = "Program 1"');

    expect(conditionsContainer?.length).toBe(1);
    expect(conditionsContainer.item(0)?.textContent).toContain('Test program');
  });

  it('should select part number option', () => {
    const { conditionsContainer } = renderElement('partNumber = "PN-1"');

    expect(conditionsContainer?.length).toBe(1);
    expect(conditionsContainer.item(0)?.textContent).toContain('Part Number');
  });

  it('should select parent work item id option', () => {
    const { conditionsContainer } = renderElement('parentWorkItemId = "1"');

    expect(conditionsContainer?.length).toBe(1);
    expect(conditionsContainer.item(0)?.textContent).toContain('Parent work item ID');
  });

  it('should select template id option', () => {
    const { conditionsContainer } = renderElement('templateId = "1"');

    expect(conditionsContainer?.length).toBe(1);
    expect(conditionsContainer.item(0)?.textContent).toContain('Template ID');
  });

  it('should select estimated duration with greater than operation', () => {
    const { conditionsContainer } = renderElement('timeline.estimatedDurationInSeconds > "60"');

    expect(conditionsContainer?.length).toBe(1);
    expect(conditionsContainer.item(0)?.textContent).toContain('Estimated duration');
    expect(conditionsContainer.item(0)?.textContent).toContain('greater than');
  });

  it('should select planned duration with less than operation', () => {
    const { conditionsContainer } = renderElement('schedule.plannedDurationInSeconds < "3600"');

    expect(conditionsContainer?.length).toBe(1);
    expect(conditionsContainer.item(0)?.textContent).toContain('Planned duration');
    expect(conditionsContainer.item(0)?.textContent).toContain('less than');
  });
});
