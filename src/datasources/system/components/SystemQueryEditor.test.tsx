import { screen, waitFor } from '@testing-library/react';
import { setupRenderer } from "test/fixtures";
import { SystemDataSource } from "../SystemDataSource";
import { SystemQueryEditor } from "./SystemQueryEditor";
import { SystemQuery, SystemQueryType } from "../types";
import userEvent from '@testing-library/user-event';

const render = setupRenderer(SystemQueryEditor, SystemDataSource);

it('renders with query defaults', async () => {
  render({} as SystemQuery);

  await waitFor(() => expect(screen.getByRole('radio', { name: 'Summary' })).toBeChecked());
});

it('renders properties query type', async () => {
  render({ queryKind: SystemQueryType.Properties, systemName: '', workspace: '' });
  await waitFor(() => expect(screen.getByRole('radio', { name: 'Properties' })).toBeChecked());
});

it('calls onChange when user changes query type to Properties', async () => {
  const [onChange] = render({ queryKind: SystemQueryType.Summary, systemName: '', workspace: '' });

  await userEvent.click(screen.getByRole('radio', { name: 'Properties' }));

  await waitFor(() => expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ queryKind: SystemQueryType.Properties })));
});

it('calls onChange when user changes query type to Summary', async () => {
  const [onChange] = render({ queryKind: SystemQueryType.Properties, systemName: '', workspace: '' });

  await userEvent.click(screen.getByRole('radio', { name: 'Summary' }));

  await waitFor(() => expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ queryKind: SystemQueryType.Summary })));
});

it('renders the query builder when Properties is selected', async () => {
  render({ queryKind: SystemQueryType.Properties, systemName: '', workspace: '' });

  await waitFor(() => expect(screen.getByRole('radio', { name: 'Properties' })).toBeChecked());
  await waitFor(() => expect(screen.queryByLabelText('System')).not.toBeInTheDocument());
  await waitFor(() => expect(screen.queryByLabelText('Workspace')).not.toBeInTheDocument());
  await waitFor(() => expect(screen.getAllByText('Property').length).toBe(1));
  await waitFor(() => expect(screen.getAllByText('Operator').length).toBe(1));
  await waitFor(() => expect(screen.getAllByText('Value').length).toBe(1));

  expect(screen.getByText('Filter')).toBeInTheDocument();
});

it('does not render the query builder when Summary is selected', async () => {
  render({ queryKind: SystemQueryType.Summary, systemName: '', workspace: '' });

  await waitFor(() => expect(screen.getByRole('radio', { name: 'Summary' })).toBeChecked());

  expect(screen.queryByText('Filter')).not.toBeInTheDocument();
});

it('clears old fields after legacy migration', async () => {
  render({ queryKind: SystemQueryType.Properties, systemName: 'my-system', workspace: 'ws-1' });

  await waitFor(() => expect(screen.getByRole('radio', { name: 'Properties' })).toBeChecked());

  expect(screen.queryByLabelText('System')).not.toBeInTheDocument();
  expect(screen.queryByLabelText('Workspace')).not.toBeInTheDocument()
});

it('preserves filter when switching between query types', async () => {
  const [onChange] = render({
    queryKind: SystemQueryType.Properties,
    systemName: '',
    workspace: '',
    filter: 'id = "system-1"'
  });

  await userEvent.click(screen.getByRole('radio', { name: 'Summary' }));

  await userEvent.click(screen.getByRole('radio', { name: 'Properties' }));

  await waitFor(() => {
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      filter: 'id = "system-1"'
    }));
  });
});
