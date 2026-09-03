import { fireEvent, render } from '@testing-library/react';
import React from 'react';
import { setupDataSource } from 'test/fixtures';
import { takeErrorMessages } from '../constants/QueryEditor.constants';
import { TAKE_LIMIT } from '../constants';
import { WorkItemsDataSource } from '../WorkItemsDataSource';
import { WorkItemsVariableQuery } from '../types';
import { WorkItemsVariableQueryEditor } from './WorkItemsVariableQueryEditor';
import { workItemsVariableQueryEditorPage as page } from './WorkItemsVariableQueryEditor.page';

function renderEditor(initialQuery: Partial<WorkItemsVariableQuery> = {}) {
  const onChange = jest.fn<void, [WorkItemsVariableQuery]>();
  const [datasource] = setupDataSource(WorkItemsDataSource);

  const createElement = (query: WorkItemsVariableQuery) =>
    React.createElement(WorkItemsVariableQueryEditor, { datasource, query, onChange, onRunQuery: jest.fn() });

  const { rerender } = render(createElement({ ...initialQuery, refId: 'A' } as WorkItemsVariableQuery));

  // Mimics Grafana's variable editor by rerendering when onChange is called.
  onChange.mockImplementation(newQuery => rerender(createElement(newQuery)));

  return { onChange, datasource };
}

describe('WorkItemsVariableQueryEditor', () => {
  it('should show all controls when the editor renders', () => {
    renderEditor();

    expect(page.orderByCombobox()).toBeVisible();
    expect(page.descendingSwitch()).toBeInTheDocument();
    expect(page.optionalTakeLimitInput()).toBeVisible();
  });

  it('should apply the datasource default values when the editor renders', () => {
    renderEditor();

    expect(page.descendingSwitch()).toBeChecked();
    expect(page.takeLimitInput()).toHaveValue(1000);
  });

  it('should update descending when the toggle is switched', () => {
    const { onChange } = renderEditor();

    fireEvent.click(page.descendingSwitch()!);

    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ descending: false }));
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
