import { screen } from '@testing-library/react';
import { setupRenderer } from "test/fixtures";
import { SystemDataSource } from "../SystemDataSource";
import { SystemQueryEditor } from "./SystemQueryEditor";
import { SystemQuery, SystemQueryType } from "../types";
import userEvent from '@testing-library/user-event';

const render = setupRenderer(SystemQueryEditor, SystemDataSource);

it('renders with query defaults', () => {
  render({} as SystemQuery);

  expect(screen.getByRole('radio', { name: 'Summary' })).toBeChecked();
  expect(screen.queryByLabelText('System')).not.toBeInTheDocument();
});

it('renders with saved metadata query', async () => {
  render({ queryKind: SystemQueryType.Metadata, systemName: 'my-system', workspace: '' });

  expect(screen.getByRole('radio', { name: 'Metadata' })).toBeChecked();
  expect(screen.queryByLabelText('System')).toHaveValue('my-system');
});

it('updates when user interacts with fields', async () => {
  const [onChange] = render({ queryKind: SystemQueryType.Summary, systemName: '', workspace: '' });

  // User changes query type
  await userEvent.click(screen.getByRole('radio', { name: 'Metadata' }));
  expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ queryKind: SystemQueryType.Metadata }));
  expect(screen.getByPlaceholderText('All systems')).toBeInTheDocument();

  // User types system name
  await userEvent.type(screen.getByLabelText('System'), 'my-system{enter}');
  expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ systemName: 'my-system' }));
});
