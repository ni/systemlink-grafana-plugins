import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { setupDataSource } from 'test/fixtures';
import { takeErrorMessages, typesErrorMessages } from '../constants/QueryEditor.constants';
import { TAKE_LIMIT } from '../constants';
import { WorkItemsDataSource } from '../WorkItemsDataSource';
import { OrderByOptions, WorkItemsVariableQuery, WorkItemsVariableQueryType, WorkItemTypeOptions } from '../types';
import { WorkItemsVariableQueryEditor } from './WorkItemsVariableQueryEditor';
import { workItemsVariableQueryEditorPage as page } from './WorkItemsVariableQueryEditor.page';

jest.mock('shared/product.utils', () => ({
  ProductUtils: jest.fn().mockImplementation(() => ({
    getProductNamesAndPartNumbers: jest.fn().mockResolvedValue(
      new Map([['part-number-1', { id: '1', partNumber: 'part-number-1', name: 'Product 1' }]])
    ),
  })),
}));

jest.mock('shared/users.utils', () => {
  const actual = jest.requireActual('shared/users.utils');
  const MockUsersUtils: any = jest.fn().mockImplementation(() => ({
    getUsers: jest.fn().mockResolvedValue(
      new Map([['1', { id: '1', firstName: 'User', lastName: '1', email: 'user1@123.com' }]])
    ),
  }));
  // Preserve the static helper the query builder relies on.
  MockUsersUtils.getUserNameAndEmail = actual.UsersUtils.getUserNameAndEmail;
  return { ...actual, UsersUtils: MockUsersUtils };
});

jest.mock('shared/workspace.utils', () => ({
  WorkspaceUtils: jest.fn().mockImplementation(() => ({
    getWorkspaces: jest.fn().mockResolvedValue(new Map([['1', { id: '1', name: 'WorkspaceName' }]])),
  })),
}));

jest.mock('shared/system.utils', () => ({
  SystemUtils: jest.fn().mockImplementation(() => ({
    getSystemAliases: jest.fn().mockResolvedValue(new Map([['1', { id: '1', alias: 'System 1' }]])),
  })),
}));

async function renderEditor(
  initialQuery: Partial<WorkItemsVariableQuery> = {},
  setupDatasource?: (datasource: WorkItemsDataSource) => void
) {
  const onChange = jest.fn<void, [WorkItemsVariableQuery]>();
  const [datasource] = setupDataSource(WorkItemsDataSource);
  jest.spyOn(datasource, 'loadWorkItemTypes').mockResolvedValue([
    { label: 'Work orders', value: 'workorder' },
    { label: 'Test plans', value: 'testplan' },
  ]);
  setupDatasource?.(datasource);

  const createElement = (query: WorkItemsVariableQuery) =>
    React.createElement(WorkItemsVariableQueryEditor, { datasource, query, onChange, onRunQuery: jest.fn() });

  let rerender!: ReturnType<typeof render>['rerender'];
  await act(async () => {
    ({ rerender } = render(createElement({ ...initialQuery, refId: 'A' } as WorkItemsVariableQuery)));
  });

  // Mimics Grafana's variable editor by rerendering when onChange is called.
  onChange.mockImplementation(newQuery => rerender(createElement(newQuery)));

  return { onChange };
}

describe('WorkItemsVariableQueryEditor', () => {
  it('should default to the list work items query type and show its controls with default values', async () => {
    await renderEditor();

    expect(page.queryTypeCombobox()).toHaveDisplayValue(WorkItemsVariableQueryType.ListWorkItems);
    expect(page.typesMultiCombobox()).toBeVisible();
    expect(page.orderByCombobox()).toBeVisible();
    expect(page.descendingSwitch()).toBeChecked();
    expect(page.optionalTakeLimitInput()).toBeVisible();
    expect(page.takeLimitInput()).toHaveValue(1000);
  });

  it('should display the default values in the list work items controls', async () => {
    const offsetHeightSpy = jest.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(30);

    try {
      await renderEditor();

      expect(screen.queryByRole('button', { name: 'Remove All' })).not.toBeNull();
      expect((page.orderByCombobox() as HTMLInputElement).value).toBe('Updated At');
      expect(page.descendingSwitch()).toBeChecked();
      expect(page.takeLimitInput()).toHaveValue(1000);
    } finally {
      offsetHeightSpy.mockRestore();
    }
  });

  it('should hide the list work items controls when list work item types is selected', async () => {
    const { onChange } = await renderEditor();

    await page.selectQueryType(WorkItemsVariableQueryType.ListWorkItemTypes);

    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ queryType: WorkItemsVariableQueryType.ListWorkItemTypes })
    );
    expect(page.typesMultiCombobox()).not.toBeInTheDocument();
    expect(page.orderByCombobox()).not.toBeInTheDocument();
    expect(page.descendingSwitch()).not.toBeInTheDocument();
    expect(page.optionalTakeLimitInput()).not.toBeInTheDocument();
  });

  it('should restore the list work items controls when switching back from list work item types', async () => {
    await renderEditor();

    await page.selectQueryType(WorkItemsVariableQueryType.ListWorkItemTypes);
    expect(page.orderByCombobox()).not.toBeInTheDocument();

    await page.selectQueryType(WorkItemsVariableQueryType.ListWorkItems);

    expect(page.typesMultiCombobox()).toBeVisible();
    expect(page.orderByCombobox()).toHaveDisplayValue('Updated At');
    expect(page.descendingSwitch()).toBeChecked();
    expect(page.takeLimitInput()).toHaveValue(1000);
  });

  it('should update descending when the toggle is switched', async () => {
    const { onChange } = await renderEditor();

    fireEvent.click(page.descendingSwitch()!);

    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ descending: false }));
  });

  it('should update types when a type is removed', async () => {
    const offsetHeightSpy = jest.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(30);

    try {
      const { onChange } = await renderEditor({
        types: [WorkItemTypeOptions.WorkOrders, WorkItemTypeOptions.TestPlans],
      });

      await userEvent.click(page.removeOptionButton('Work orders'));

      expect(onChange).toHaveBeenLastCalledWith(
        expect.objectContaining({ types: ['testplan'] })
      );
    } finally {
      offsetHeightSpy.mockRestore();
    }
  });

  it('should offer dashboard variables as options in the type control', async () => {
    const offsetHeightSpy = jest.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(30);

    try {
      const { onChange } = await renderEditor({ types: [WorkItemTypeOptions.WorkOrders] });

      const typesCombobox = page.typesMultiCombobox()!;
      await userEvent.click(typesCombobox);
      await userEvent.click(await page.typeSelectOption('$test_var'));

      expect(onChange).toHaveBeenLastCalledWith(
        expect.objectContaining({ types: ['workorder', '$test_var'] })
      );
    } finally {
      offsetHeightSpy.mockRestore();
    }
  });

  it('should update orderBy when a different option is selected', async () => {
    const offsetHeightSpy = jest.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(30);

    try {
      const { onChange } = await renderEditor();

      await userEvent.click(page.orderByCombobox()!);
      await userEvent.click(await screen.findByRole('option', { name: /ID/ }));

      expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ orderBy: OrderByOptions.ID }));
    } finally {
      offsetHeightSpy.mockRestore();
    }
  });

  it('should update take when a valid value is entered', async () => {
    const { onChange } = await renderEditor();

    page.setTakeLimit('500');

    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ take: 500 }));
  });

  it('should update the filter when the query builder changes', async () => {
    const { onChange } = await renderEditor();

    await act(async () => {
      page.queryBuilder().dispatchEvent(new CustomEvent('change', { detail: { linq: 'new-query' } }));
    });

    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ filter: 'new-query' }));
  });

  it('should surface the datasource dependency lookup error', async () => {
    await renderEditor({}, datasource => {
      datasource.errorTitle = 'Warning during work items query';
      datasource.errorDescription = 'Some values may not be available in the query builder lookups.';
    });

    expect(page.getErrorByMessage('Warning during work items query')).toBeVisible();
    expect(
      page.getErrorByMessage('Some values may not be available in the query builder lookups.')
    ).toBeVisible();
  });

  describe('type validation', () => {
    it('should not show a type validation error when the editor renders with default types', async () => {
      await renderEditor();

      expect(page.getErrorByMessage(typesErrorMessages.atLeastOneRequired)).toBeNull();
    });

    it('should show a type validation error when all types are removed', async () => {
      const offsetHeightSpy = jest.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(30);

      try {
        const { onChange } = await renderEditor({ types: [WorkItemTypeOptions.WorkOrders] });

        await userEvent.click(page.removeOptionButton('Work orders'));

        expect(page.getErrorByMessage(typesErrorMessages.atLeastOneRequired)).toBeVisible();
        expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ types: [] }));
      } finally {
        offsetHeightSpy.mockRestore();
      }
    });
  });

  describe('take validation', () => {
    it('should not show a take validation error when the editor renders', async () => {
      await renderEditor();

      expect(page.getErrorByMessage(takeErrorMessages.greaterOrEqualToZero)).toBeNull();
      expect(page.getErrorByMessage(takeErrorMessages.lessOrEqualToTenThousand)).toBeNull();
    });

    it('should show a take validation error when the take input is not positive', async () => {
      const { onChange } = await renderEditor();

      page.setTakeLimit('-5');

      expect(page.getErrorByMessage(takeErrorMessages.greaterOrEqualToZero)).toBeVisible();
      expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ take: -5 }));
    });

    it('should show a take validation error when the take input exceeds the maximum limit', async () => {
      const { onChange } = await renderEditor();

      page.setTakeLimit(`${TAKE_LIMIT + 1}`);

      expect(page.getErrorByMessage(takeErrorMessages.lessOrEqualToTenThousand)).toBeVisible();
      expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ take: TAKE_LIMIT + 1 }));
    });

    it('should clear the take validation error when a valid take value is entered', async () => {
      await renderEditor();

      page.setTakeLimit('-5');
      expect(page.getErrorByMessage(takeErrorMessages.greaterOrEqualToZero)).toBeVisible();

      page.setTakeLimit('500');

      expect(page.getErrorByMessage(takeErrorMessages.greaterOrEqualToZero)).toBeNull();
      expect(page.takeLimitInput()).toHaveValue(500);
    });

    it('should show the take validation error on render when the saved query take is invalid', async () => {
      await renderEditor({ take: -5 });

      expect(page.getErrorByMessage(takeErrorMessages.greaterOrEqualToZero)).toBeVisible();
    });

    it('should show a take validation error when the take input is cleared', async () => {
      await renderEditor({ take: 500 });

      page.setTakeLimit('');

      expect(page.getErrorByMessage(takeErrorMessages.greaterOrEqualToZero)).toBeVisible();
    });
  });
});
