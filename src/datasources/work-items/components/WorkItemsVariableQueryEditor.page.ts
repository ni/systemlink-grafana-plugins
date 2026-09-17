import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WorkItemsVariableQueryType } from '../types';
import { labels } from '../constants/QueryEditor.constants';

export const workItemsVariableQueryEditorPage = {
  queryTypeCombobox: () => screen.getByRole('combobox', { name: labels.queryType }),
  selectQueryType: async (value: WorkItemsVariableQueryType) => {
    // The Combobox virtualizes its option list, which only renders when the
    // elements report a non-zero height, so stub offsetHeight while selecting.
    const offsetHeightSpy = jest.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(30);
    try {
      await userEvent.click(workItemsVariableQueryEditorPage.queryTypeCombobox());
      await userEvent.click(await screen.findByRole('option', { name: value }));
    } finally {
      offsetHeightSpy.mockRestore();
    }
  },

  // MultiCombobox (used for Types) doesn't forward its id to the underlying downshift input,
  // so it has no accessible name; among the comboboxes it renders right after the query type
  // combobox, so select it by position.
  typesMultiCombobox: () => screen.queryAllByRole('combobox')[1] ?? null,
  orderByCombobox: () => screen.queryByRole('combobox', { name: labels.orderBy }),
  descendingSwitch: () => screen.queryByRole('switch', { name: labels.descending }),
  takeLimitInput: () => screen.getByRole('spinbutton'),
  optionalTakeLimitInput: () => screen.queryByRole('spinbutton'),
  setTakeLimit: (value: string) => {
    const takeLimitInput = screen.getByRole('spinbutton');
    fireEvent.change(takeLimitInput, { target: { value } });
    fireEvent.blur(takeLimitInput);
  },

  removeOptionButton: (name: string) => screen.getByRole('button', { name: `Remove ${name}` }),

  queryBuilder: () => screen.getByRole('dialog'),

  getErrorByMessage: (message: string) => screen.queryByText(message),
};
