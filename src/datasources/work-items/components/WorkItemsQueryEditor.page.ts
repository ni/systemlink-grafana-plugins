import { screen } from '@testing-library/react';
import { OutputType } from '../types';
import { labels, propertiesErrorMessages, typesErrorMessages } from '../constants/QueryEditor.constants';

/**
 * Page object collecting the DOM selectors used by WorkItemsQueryEditor.test.tsx,
 * so the test file only reads intent, not query-library boilerplate.
 */
export const workItemsQueryEditorPage = {
  outputTypeRadio: (value: OutputType) => screen.getByRole('radio', { name: value }),

  typesLabel: () => screen.getByText(labels.types),
  propertiesLabels: () => screen.getAllByText(labels.properties),
  orderByLabel: () => screen.queryByText(labels.orderBy),
  descendingLabel: () => screen.queryByText(labels.descending),
  takeLabel: () => screen.queryByText(labels.take),

  propertyTag: (name: string) => screen.getByText(name),
  removeButton: (name: string) => screen.getByRole('button', { name: `Remove ${name}` }),
  propertyOption: (name: string) => screen.findByRole('option', { name }),
  propertyCheckbox: (name: string) => screen.getByRole('checkbox', { name }),
  comboboxes: () => screen.getAllByRole('combobox'),
  takeInput: () => screen.getByRole('spinbutton'),

  typesErrorMessage: () => screen.getByText(typesErrorMessages.atLeastOneRequired),
  propertiesErrorMessage: () => screen.queryByText(propertiesErrorMessages.atLeastOneRequired),
  errorMessage: (message: string) => screen.queryByText(message),
};
