import { screen } from '@testing-library/react';
import { OutputType } from '../types';
import { labels, propertiesErrorMessages, typesErrorMessages } from '../constants/QueryEditor.constants';

/**
 * Page object collecting the DOM selectors used by WorkItemsQueryEditor.test.tsx,
 * so the test file only reads intent, not query-library boilerplate.
 */
export const workItemsQueryEditorPage = {
  outputTypeRadio: (value: OutputType) => screen.getByRole('radio', { name: value }),

  // MultiCombobox (used for Types/Properties) doesn't forward its id to the underlying
  // downshift input, so it has no accessible name; select by position among comboboxes instead.
  typesCombobox: () => screen.queryAllByRole('combobox')[0] ?? null,
  propertiesCombobox: () => screen.queryAllByRole('combobox')[1] ?? null,
  orderByCombobox: () => screen.queryByRole('combobox', { name: labels.orderBy }),
  descendingSwitch: () => screen.queryByRole('switch', { name: labels.descending }),
  takeInput: () => screen.getByRole('spinbutton'),
  takeInputQuery: () => screen.queryByRole('spinbutton'),

  removeButton: (name: string) => screen.getByRole('button', { name: `Remove ${name}` }),
  propertyOption: (name: string) => screen.findByRole('option', { name }),
  propertyCheckbox: (name: string) => screen.getByRole('checkbox', { name }),

  typesErrorMessage: () => screen.getByText(typesErrorMessages.atLeastOneRequired),
  propertiesErrorMessage: () => screen.queryByText(propertiesErrorMessages.atLeastOneRequired),
  errorMessage: (message: string) => screen.queryByText(message),
};
