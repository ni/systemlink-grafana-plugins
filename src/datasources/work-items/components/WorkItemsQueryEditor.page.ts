import { fireEvent, screen } from '@testing-library/react';
import { OutputType } from '../types';
import { labels } from '../constants/QueryEditor.constants';

/**
 * Page object collecting the DOM selectors used by WorkItemsQueryEditor.test.tsx,
 * so the test file only reads intent, not query-library boilerplate.
 */
export const workItemsQueryEditorPage = {
  outputTypeRadioButton: (value: OutputType) => screen.getByRole('radio', { name: value }),

  // MultiCombobox (used for Types/Properties) doesn't forward its id to the underlying
  // downshift input, so it has no accessible name; select by position among comboboxes instead.
  typesMultiCombobox: () => screen.queryAllByRole('combobox')[0] ?? null,
  propertiesMultiCombobox: () => screen.queryAllByRole('combobox')[1] ?? null,
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
  typeSelectOption: (name: string) => screen.findByRole('option', { name }),
  propertySelectOption: (name: string) => screen.findByRole('option', { name }),
  propertyOptionCheckbox: (name: string) => screen.getByRole('checkbox', { name }),

  getErrorByMessage: (message: string) => screen.queryByText(message),
};
