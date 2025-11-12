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

  const workspaceSelect = screen.getAllByRole('combobox')[0];
  expect(workspaceSelect).toHaveAccessibleDescription('Any workspace');
});

test('renders with workspace selected', async () => {
  render(<SystemVariableQueryEditor {...{ onChange, datasource, query: { workspace: '1' } }} />);

  await workspacesLoaded();

  expect(screen.getByText('Default workspace')).toBeInTheDocument();
});

test('user selects new workspace', async () => {
  render(<SystemVariableQueryEditor {...{ onChange, datasource, query: { workspace: '1' } }} />);

  await workspacesLoaded();

  // Get the first combobox (Workspace). The second one [1] is Return Type
  const workspaceSelect = screen.getAllByRole('combobox')[0];
  await select(workspaceSelect, 'Other workspace', { container: document.body });
  expect(onChange).toHaveBeenCalledWith({ workspace: '2' });
});

test('populates workspace drop-down with variables', async () => {
  render(<SystemVariableQueryEditor {...{ onChange, datasource, query: { workspace: '$test_var' } }} />);

  await workspacesLoaded();

  expect(screen.getByText('$test_var')).toBeInTheDocument();
});

test('renders with default return type (Minion Id)', async () => {
  render(<SystemVariableQueryEditor {...{ onChange, datasource, query: { workspace: '' } }} />);

  await workspacesLoaded();

  expect(screen.getByText('Minion Id')).toBeInTheDocument();
});

test('user changes return type to Scan Code', async () => {
  render(<SystemVariableQueryEditor {...{ onChange, datasource, query: { workspace: '' } }} />);

  await workspacesLoaded();
  const returnTypeSelect = screen.getAllByRole('combobox')[1];
  await select(returnTypeSelect, 'Scan Code', { container: document.body });
  
  expect(onChange).toHaveBeenCalledWith({ workspace: '', queryReturnType: 'Scan Code' });
});

