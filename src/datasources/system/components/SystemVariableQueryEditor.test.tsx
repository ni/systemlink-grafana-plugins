import { render, screen, waitForElementToBeRemoved } from '@testing-library/react';
import React from 'react';
import { select } from 'react-select-event';
import { setupDataSource } from 'test/fixtures';
import { SystemDataSource } from '../SystemDataSource';
import { SystemVariableQueryEditor } from './SystemVariableQueryEditor';

const onChange = jest.fn();
const [datasource] = setupDataSource(SystemDataSource);
const workspacesLoaded = () => waitForElementToBeRemoved(screen.getByTestId('Spinner'));

test('renders with NO workspace selected', async () => {
  render(<SystemVariableQueryEditor {...{ onChange, datasource, query: { workspace: '' } }} />);

  await workspacesLoaded();

  expect(screen.getByRole('combobox')).toHaveAccessibleDescription('Any workspace');
});

test('renders with workspace selected', async () => {
  render(<SystemVariableQueryEditor {...{ onChange, datasource, query: { workspace: '1' } }} />);

  await workspacesLoaded();

  expect(screen.getByText('Default workspace')).toBeInTheDocument();
});

test('user selects new workspace', async () => {
  render(<SystemVariableQueryEditor {...{ onChange, datasource, query: { workspace: '1' } }} />);

  await workspacesLoaded();

  await select(screen.getByRole('combobox'), 'Other workspace', { container: document.body });
  expect(onChange).toBeCalledWith({ workspace: '2' });
});
