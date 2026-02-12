import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { select } from 'react-select-event';
import { setupDataSource } from 'test/fixtures';
import { SystemDataSource } from '../SystemDataSource';
import { SystemVariableQueryEditor } from './SystemVariableQueryEditor';
import { SystemQueryReturnType } from '../types';

const onChange = jest.fn();
const [datasource] = setupDataSource(SystemDataSource);

beforeEach(() => {
  jest.clearAllMocks();
});

test('renders the query builder', async () => {
  render(<SystemVariableQueryEditor {...{ onChange, datasource, query: { workspace: '', filter: '' } }} />);

  await waitFor(() => expect(screen.queryByLabelText('Workspace')).not.toBeInTheDocument());
  await waitFor(() => expect(screen.getAllByText('Property').length).toBe(1));
  await waitFor(() => expect(screen.getAllByText('Operator').length).toBe(1));
  await waitFor(() => expect(screen.getAllByText('Value').length).toBe(1));
  expect(screen.getByText('Filter')).toBeInTheDocument();
});

test('migrates old workspace field to filter on mount', async () => {
  render(<SystemVariableQueryEditor {...{ onChange, datasource, query: { workspace: '1', filter: '' } }} />);

  expect(onChange).toHaveBeenCalledWith({
    workspace: '',
    filter: 'workspace = "1"',
  });
});

test('migrates workspace variable to filter preserving variable reference', async () => {
  render(<SystemVariableQueryEditor {...{ onChange, datasource, query: { workspace: '$myWorkspace', filter: '' } }} />);

  expect(onChange).toHaveBeenCalledWith({
    workspace: '',
    filter: 'workspace = "$myWorkspace"',
  });
});

test('does not migrate if filter already exists', async () => {
  render(<SystemVariableQueryEditor {...{ onChange, datasource, query: { workspace: '', filter: 'state = "CONNECTED"' } }} />);

  expect(onChange).not.toHaveBeenCalled();
});

test('renders the return type selector', async () => {
  render(<SystemVariableQueryEditor {...{ onChange, datasource, query: { workspace: '', filter: '' } }} />);

  expect(screen.getByText('Return Type')).toBeInTheDocument();
  expect(screen.getByText(SystemQueryReturnType.MinionId)).toBeInTheDocument();
});

test('renders with default return type (Minion Id)', async () => {
  render(<SystemVariableQueryEditor {...{ onChange, datasource, query: { workspace: '', filter: '' } }} />);

  expect(screen.getByText('Minion Id')).toBeInTheDocument();
});

test('user changes return type to Scan Code', async () => {
  render(<SystemVariableQueryEditor {...{ onChange, datasource, query: { workspace: '', filter: '' } }} />);

  const returnTypeSelect = screen.getAllByRole('combobox')[0];
  await select(returnTypeSelect, SystemQueryReturnType.ScanCode, { container: document.body });

  expect(onChange).toHaveBeenCalledWith(
    expect.objectContaining({
      queryReturnType: SystemQueryReturnType.ScanCode,
      filter: ''
    })
  );
});

test('should call onChange when return type is changed', async () => {
  render(<SystemVariableQueryEditor {...{ onChange, datasource, query: { workspace: '', filter: '' } }} />);

  const returnTypeSelect = screen.getAllByRole('combobox')[0];
  await select(returnTypeSelect, SystemQueryReturnType.ScanCode, { container: document.body });

  expect(onChange).toHaveBeenCalledWith(
    expect.objectContaining({ queryReturnType: SystemQueryReturnType.ScanCode })
  );
});
