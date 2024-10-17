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
  await waitFor(() => expect(screen.queryByLabelText('System')).not.toBeInTheDocument());
});

it('renders with saved metadata query', async () => {
  render({ queryKind: SystemQueryType.Metadata, systemName: 'my-system', workspace: '' });

  await waitFor(() => expect(screen.getByRole('radio', { name: 'Metadata' })).toBeChecked());
  await waitFor(() => expect(screen.queryByLabelText('System')).toHaveValue('my-system'));
});

it('updates when user interacts with fields', async () => {
  const [onChange] = render({ queryKind: SystemQueryType.Summary, systemName: '', workspace: '' });

  // User changes query type
  await userEvent.click(screen.getByRole('radio', { name: 'Metadata' }));
  await waitFor(() => expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ queryKind: SystemQueryType.Metadata })));
  await waitFor(() => expect(screen.getByPlaceholderText('All systems')).toBeInTheDocument());

  // User types system name
  await userEvent.type(screen.getByLabelText('System'), 'my-system{enter}');
  await waitFor(() => expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ systemName: 'my-system' })));
});
