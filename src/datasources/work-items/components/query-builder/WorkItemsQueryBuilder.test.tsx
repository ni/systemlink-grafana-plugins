import { QueryBuilderOption, Workspace } from 'core/types';
import React, { ReactNode } from 'react';
import { render } from '@testing-library/react';
import { ProductPartNumberAndName } from 'shared/types/QueryProducts.types';
import { SystemAlias } from 'shared/types/QuerySystems.types';
import { User } from 'shared/types/QueryUsers.types';
import { WorkItemsQueryBuilder } from './WorkItemsQueryBuilder';

describe('WorkItemsQueryBuilder', () => {
  let reactNode: ReactNode;
  const containerClass = 'smart-filter-group-condition-container';
  const workspace = { id: '1', name: 'Workspace Name' } as Workspace;

  function renderElement(
    filter: string,
    workspaces: Workspace[] | null = [],
    users: User[] | null = [],
    globalVariableOptions: QueryBuilderOption[] = [],
    products: ProductPartNumberAndName[] | null = [],
    systemAliases: SystemAlias[] | null = []
  ) {
    reactNode = React.createElement(WorkItemsQueryBuilder, { filter, workspaces, users, products, systemAliases, globalVariableOptions, onChange: jest.fn() });
    const renderResult = render(reactNode);
    return {
      renderResult,
      conditionsContainer: renderResult.container.getElementsByClassName(`${containerClass}`),
    };
  }

  it('should render empty condition row when filter is empty', async () => {
    const { renderResult, conditionsContainer } = renderElement('');

    expect(conditionsContainer.length).toBe(1);
    expect(await renderResult.findByLabelText('Empty condition row')).toBeTruthy();
  });

  it('should select id field with equals operation when filter is on id', () => {
    const { conditionsContainer } = renderElement('id = "1"');
    expect(conditionsContainer?.length).toBe(1);
    expect(conditionsContainer.item(0)?.textContent).toContain('ID');
    expect(conditionsContainer.item(0)?.textContent).toContain('equals');
  });

  it('should select name field with contains operation when filter uses Contains', () => {
    const { conditionsContainer } = renderElement('name.Contains("test")');
    expect(conditionsContainer?.length).toBe(1);
    expect(conditionsContainer.item(0)?.textContent).toContain('Name');
    expect(conditionsContainer.item(0)?.textContent).toContain('contains');
  });

  it('should show readable label "Work orders" when filter checks type equals WORK_ORDERS', () => {
    const { conditionsContainer } = renderElement('type = "WORK_ORDERS"');
    expect(conditionsContainer?.length).toBe(1);
    expect(conditionsContainer.item(0)?.textContent).toContain('Type');
    expect(conditionsContainer.item(0)?.textContent).toContain('Work orders');
  });

  it('should show readable label "Pending approval" when filter checks state equals PENDING_APPROVAL', () => {
    const { conditionsContainer } = renderElement('state = "PENDING_APPROVAL"');
    expect(conditionsContainer?.length).toBe(1);
    expect(conditionsContainer.item(0)?.textContent).toContain('State');
    expect(conditionsContainer.item(0)?.textContent).toContain('equals');
    expect(conditionsContainer.item(0)?.textContent).toContain('Pending approval');
  });

  it('should show key/value matches operation when filter is on a custom property', () => {
    const { conditionsContainer } = renderElement('properties["key"] = "value"');

    expect(conditionsContainer?.length).toBe(1);
    expect(conditionsContainer.item(0)?.textContent).toContain('Properties');
    expect(conditionsContainer.item(0)?.textContent).toContain('matches');
    expect(conditionsContainer.item(0)?.textContent).toContain('key');
    expect(conditionsContainer.item(0)?.textContent).toContain('value');
  });

  it('should show is blank operation when filter checks due date is null or empty', () => {
    const { conditionsContainer } = renderElement('timeline.dueDateTime == null || timeline.dueDateTime == ""');

    expect(conditionsContainer?.length).toBe(1);
    expect(conditionsContainer.item(0)?.textContent).toContain('Due date');
    expect(conditionsContainer.item(0)?.textContent).toContain('is blank');
  });

  it('should show is not blank operation when filter checks earliest start date is not null or empty', () => {
    const { conditionsContainer } = renderElement('timeline.earliestStartDateTime != null && timeline.earliestStartDateTime != ""');

    expect(conditionsContainer?.length).toBe(1);
    expect(conditionsContainer.item(0)?.textContent).toContain('Earliest start date');
    expect(conditionsContainer.item(0)?.textContent).toContain('is not blank');
  });

  [['${__from:date}', 'From'], ['${__to:date}', 'To'], ['${__now:date}', 'Now']].forEach(([value, label]) => {
    it(`should show user-friendly label "${label}" when updated date filter uses the ${label} global variable`, () => {
      const { conditionsContainer } = renderElement(`updatedAt > \"${value}\"`);

      expect(conditionsContainer?.length).toBe(1);
      expect(conditionsContainer.item(0)?.textContent).toContain(label);
    });
  });

  it('should show workspace name when filter is on workspace', () => {
    const { conditionsContainer } = renderElement('workspace = "1"', [workspace]);

    expect(conditionsContainer?.length).toBe(1);
    expect(conditionsContainer.item(0)?.textContent).toContain(workspace.name);
  });

  it('should show system alias name when filter checks systems contains system ID', () => {
    const systemAlias: SystemAlias = { id: '1', alias: 'System Alias 1' };
    const { conditionsContainer } = renderElement('systems.Contains("1")', [], [], [], [], [systemAlias]);

    expect(conditionsContainer?.length).toBe(1);
    expect(conditionsContainer.item(0)?.textContent).toContain(systemAlias.alias);
  });

  it('should show is empty operation when filter checks systems has no values', () => {
    const { conditionsContainer } = renderElement('systems.Count == 0');

    expect(conditionsContainer?.length).toBe(1);
    expect(conditionsContainer.item(0)?.textContent).toContain('System alias name');
    expect(conditionsContainer.item(0)?.textContent).toContain('is empty');
  });

  it('should show user display name when filter is on assignedTo', () => {
    const mockUsers: User[] = [
      { id: '1', firstName: 'User', lastName: '1', email: 'user1@123.com', properties: {}, keywords: [], created: '', updated: '', orgId: '' },
    ];
    const { conditionsContainer } = renderElement('assignedTo = "1"', [], mockUsers);

    expect(conditionsContainer?.length).toBe(1);
    expect(conditionsContainer.item(0)?.textContent).toContain('Assigned to');
  });

  it('should select test program field when filter is on testProgram', () => {
    const { conditionsContainer } = renderElement('testProgram = "Program 1"');

    expect(conditionsContainer?.length).toBe(1);
    expect(conditionsContainer.item(0)?.textContent).toContain('Test program');
  });

  it('should show product name (part number) label when filter is on partNumber', () => {
    const { conditionsContainer } = renderElement('partNumber = "PN-1"');

    expect(conditionsContainer?.length).toBe(1);
    expect(conditionsContainer.item(0)?.textContent).toContain('Product name (Part number)');
  });

  it('should select work order id field when filter is on parentId', () => {
    const { conditionsContainer } = renderElement('parentId = "1"');

    expect(conditionsContainer?.length).toBe(1);
    expect(conditionsContainer.item(0)?.textContent).toContain('Work order ID');
  });

  it('should show is blank operation when filter checks parentId is null or empty', () => {
    const { conditionsContainer } = renderElement('string.IsNullOrEmpty(parentId)');

    expect(conditionsContainer?.length).toBe(1);
    expect(conditionsContainer.item(0)?.textContent).toContain('Work order ID');
    expect(conditionsContainer.item(0)?.textContent).toContain('is blank');
  });

  it('should select template id field when filter is on templateId', () => {
    const { conditionsContainer } = renderElement('templateId = "1"');

    expect(conditionsContainer?.length).toBe(1);
    expect(conditionsContainer.item(0)?.textContent).toContain('Template ID');
  });

  it('should show greater than operation when filter is on estimated duration in days', () => {
    const { conditionsContainer } = renderElement('estimatedDurationInDays > "1"');

    expect(conditionsContainer?.length).toBe(1);
    expect(conditionsContainer.item(0)?.textContent).toContain('Estimated duration (days)');
    expect(conditionsContainer.item(0)?.textContent).toContain('greater than');
  });

  it('should show greater than operation when filter is on estimated duration in hours', () => {
    const { conditionsContainer } = renderElement('estimatedDurationInHours > "1"');

    expect(conditionsContainer?.length).toBe(1);
    expect(conditionsContainer.item(0)?.textContent).toContain('Estimated duration (hours)');
    expect(conditionsContainer.item(0)?.textContent).toContain('greater than');
  });

  it('should show less than operation when filter is on planned duration in days', () => {
    const { conditionsContainer } = renderElement('plannedDurationInDays < "1"');

    expect(conditionsContainer?.length).toBe(1);
    expect(conditionsContainer.item(0)?.textContent).toContain('Planned duration (days)');
    expect(conditionsContainer.item(0)?.textContent).toContain('less than');
  });

  it('should show less than operation when filter is on planned duration in hours', () => {
    const { conditionsContainer } = renderElement('plannedDurationInHours < "1"');

    expect(conditionsContainer?.length).toBe(1);
    expect(conditionsContainer.item(0)?.textContent).toContain('Planned duration (hours)');
    expect(conditionsContainer.item(0)?.textContent).toContain('less than');
  });
});
