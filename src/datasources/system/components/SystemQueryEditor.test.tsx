import { screen, waitFor } from '@testing-library/react';
import { setupRenderer } from "test/fixtures";
import { SystemDataSource } from "../SystemDataSource";
import { SystemQueryEditor } from "./SystemQueryEditor";
import { SystemQuery, SystemQueryType } from "../types";
import userEvent from '@testing-library/user-event';
import { LEGACY_METADATA_TYPE } from 'core/types';

const render = setupRenderer(SystemQueryEditor, SystemDataSource);

it('renders with query defaults', async () => {
  render({} as SystemQuery);

  await waitFor(() => expect(screen.getByRole('radio', { name: 'Summary' })).toBeChecked());
  await waitFor(() => expect(screen.queryByLabelText('System')).not.toBeInTheDocument());
});

it('renders properties query when given a legacy metadata query', async () => {
  render({ queryKind: LEGACY_METADATA_TYPE as any, systemName: 'my-system', workspace: '' });

  await waitFor(() => expect(screen.getByRole('radio', { name: 'Properties' })).toBeChecked());
  await waitFor(() => expect(screen.queryByLabelText('System')).toHaveValue('my-system'));
});

it('renders with saved properties query', async () => {
  render({ queryKind: SystemQueryType.Properties, systemName: 'my-system', workspace: '' });

  await waitFor(() => expect(screen.getByRole('radio', { name: 'Properties' })).toBeChecked());
  await waitFor(() => expect(screen.queryByLabelText('System')).toHaveValue('my-system'));
});

it('updates when user interacts with fields', async () => {
  const [onChange] = render({ queryKind: SystemQueryType.Summary, systemName: '', workspace: '' });

  // User changes query type
  await userEvent.click(screen.getByRole('radio', { name: 'Properties' }));
  await waitFor(() => expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ queryKind: SystemQueryType.Properties })));
  await waitFor(() => expect(screen.getByPlaceholderText('All systems')).toBeInTheDocument());

  // User types system name
  await userEvent.type(screen.getByLabelText('System'), 'my-system{enter}');
  await waitFor(() => expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ systemName: 'my-system' })));
});
