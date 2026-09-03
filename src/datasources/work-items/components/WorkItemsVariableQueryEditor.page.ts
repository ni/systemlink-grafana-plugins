import { fireEvent, screen } from '@testing-library/react';
import { labels } from '../constants/QueryEditor.constants';

/**
 * Page object collecting the DOM selectors used by WorkItemsVariableQueryEditor.test.tsx,
 * so the test file only reads intent, not query-library boilerplate.
 */
export const workItemsVariableQueryEditorPage = {
  orderByCombobox: () => screen.queryByRole('combobox', { name: labels.orderBy }),
  descendingSwitch: () => screen.queryByRole('switch', { name: labels.descending }),
  takeLimitInput: () => screen.getByRole('spinbutton'),
  optionalTakeLimitInput: () => screen.queryByRole('spinbutton'),
  setTakeLimit: (value: string) => {
    const takeLimitInput = screen.getByRole('spinbutton');
    fireEvent.change(takeLimitInput, { target: { value } });
    fireEvent.blur(takeLimitInput);
  },

  getErrorByMessage: (message: string) => screen.queryByText(message),
};
