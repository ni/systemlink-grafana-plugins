import { fireEvent, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { setupDataSource } from 'test/fixtures';
import { takeErrorMessages, typesErrorMessages } from '../constants/QueryEditor.constants';
import { TAKE_LIMIT } from '../constants';
import { WorkItemsDataSource } from '../WorkItemsDataSource';
import { WorkItemsVariableQuery, WorkItemsVariableQueryType, WorkItemTypeOptions, WorkItemsQuery } from '../types';
import { WorkItemsVariableQueryEditor } from './WorkItemsVariableQueryEditor';
import { workItemsVariableQueryEditorPage as page } from './WorkItemsVariableQueryEditor.page';

function renderEditor(initialQuery: Partial<WorkItemsVariableQuery> = {}) {
  const onChange = jest.fn<void, [WorkItemsQuery]>();
  const [datasource] = setupDataSource(WorkItemsDataSource);

  const createElement = (query: WorkItemsQuery) =>
    React.createElement(WorkItemsVariableQueryEditor, { datasource, query, onChange, onRunQuery: jest.fn() });

  const { rerender } = render(createElement({ ...initialQuery, refId: 'A' } as WorkItemsQuery));

  // Mimics Grafana's variable editor by rerendering when onChange is called.
  onChange.mockImplementation(newQuery => rerender(createElement(newQuery)));

  return { onChange, datasource };
}

describe('WorkItemsVariableQueryEditor', () => {
  it('should default to the list work items query type and show its controls', () => {
    renderEditor();

    expect(page.queryTypeRadioButton(WorkItemsVariableQueryType.ListWorkItems)).toBeChecked();
    expect(page.queryTypeRadioButton(WorkItemsVariableQueryType.ListWorkItemTypes)).not.toBeChecked();
    expect(page.typesMultiCombobox()).toBeVisible();
    expect(page.orderByCombobox()).toBeVisible();
    expect(page.descendingSwitch()).toBeInTheDocument();
    expect(page.optionalTakeLimitInput()).toBeVisible();
  });

  it('should hide the list work items controls when list work item types is selected', async () => {
    const { onChange } = renderEditor();

    await userEvent.click(page.queryTypeRadioButton(WorkItemsVariableQueryType.ListWorkItemTypes));

    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ queryType: WorkItemsVariableQueryType.ListWorkItemTypes })
    );
    expect(page.typesMultiCombobox()).toBeNull();
    expect(page.orderByCombobox()).toBeNull();
    expect(page.descendingSwitch()).toBeNull();
    expect(page.optionalTakeLimitInput()).toBeNull();
  });

  it('should apply the datasource default values for the list work items controls', () => {
    renderEditor();

    expect(page.descendingSwitch()).toBeChecked();
    expect(page.takeLimitInput()).toHaveValue(1000);
  });

  it('should update descending when the toggle is switched', () => {
    const { onChange } = renderEditor();

    fireEvent.click(page.descendingSwitch()!);

    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ descending: false }));
  });

  describe('type validation', () => {
    it('should not show a type validation error when the editor renders with default types', () => {
      renderEditor();

      expect(page.getErrorByMessage(typesErrorMessages.atLeastOneRequired)).toBeNull();
    });

    it('should show a type validation error when all types are removed', async () => {
      const offsetHeightSpy = jest.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(30);

      try {
        const { onChange } = renderEditor({ types: [WorkItemTypeOptions.WorkOrders] });

        await userEvent.click(page.removeOptionButton('Work orders'));

        expect(page.getErrorByMessage(typesErrorMessages.atLeastOneRequired)).toBeVisible();
        expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ types: [] }));
      } finally {
        offsetHeightSpy.mockRestore();
      }
    });
  });

  describe('take validation', () => {
    it('should not show a take validation error when the editor renders', () => {
      renderEditor();

      expect(page.getErrorByMessage(takeErrorMessages.greaterOrEqualToZero)).toBeNull();
      expect(page.getErrorByMessage(takeErrorMessages.lessOrEqualToTenThousand)).toBeNull();
    });

    it('should show a take validation error when the take input is not positive', () => {
      const { onChange } = renderEditor();

      page.setTakeLimit('-5');

      expect(page.getErrorByMessage(takeErrorMessages.greaterOrEqualToZero)).toBeVisible();
      expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ take: -5 }));
    });

    it('should show a take validation error when the take input exceeds the maximum limit', () => {
      const { onChange } = renderEditor();

      page.setTakeLimit(`${TAKE_LIMIT + 1}`);

      expect(page.getErrorByMessage(takeErrorMessages.lessOrEqualToTenThousand)).toBeVisible();
      expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ take: TAKE_LIMIT + 1 }));
    });

    it('should clear the take validation error when a valid take value is entered', () => {
      renderEditor();

      page.setTakeLimit('-5');
      expect(page.getErrorByMessage(takeErrorMessages.greaterOrEqualToZero)).toBeVisible();

      page.setTakeLimit('500');

      expect(page.getErrorByMessage(takeErrorMessages.greaterOrEqualToZero)).toBeNull();
      expect(page.takeLimitInput()).toHaveValue(500);
    });

    it('should show the take validation error on render when the saved query take is invalid', () => {
      renderEditor({ take: -5 });

      expect(page.getErrorByMessage(takeErrorMessages.greaterOrEqualToZero)).toBeVisible();
    });
  });
});
