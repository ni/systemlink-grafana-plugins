import { screen, waitForElementToBeRemoved } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { select } from 'react-select-event';
import { setupRenderer } from 'test/fixtures';
import { TagDataSource } from '../TagDataSource';
import { TagQuery, TagQueryType } from '../types';
import { TagQueryEditor } from './TagQueryEditor';

const render = setupRenderer(TagQueryEditor, TagDataSource);
const workspacesLoaded = () => waitForElementToBeRemoved(screen.getByTestId('Spinner'));

it('renders with query defaults', async () => {
  render({} as TagQuery);
  await workspacesLoaded();

  expect(screen.getByRole('radio', { name: 'Current' })).toBeChecked();
  expect(screen.getByLabelText('Tag path')).not.toHaveValue();
  expect(screen.getByRole('combobox')).toHaveAccessibleDescription('Any workspace');
  expect(screen.getByRole('switch')).not.toBeChecked();
});

it('renders with initial query and updates when user makes changes', async () => {
  const [onChange] = render({ type: TagQueryType.History, path: 'my.tag', workspace: '1', properties: true });
  await workspacesLoaded();

  // Renders saved query
  expect(screen.getByRole('radio', { name: 'History' })).toBeChecked();
  expect(screen.getByLabelText('Tag path')).toHaveValue('my.tag');
  expect(screen.getByText('Default workspace')).toBeInTheDocument();
  expect(screen.queryByRole('switch')).not.toBeInTheDocument();

  // Users changes query type
  await userEvent.click(screen.getByRole('radio', { name: 'Current' }));
  expect(screen.queryByRole('switch')).toBeInTheDocument();
  expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ type: TagQueryType.Current }));

  // User types in new tag path
  await userEvent.type(screen.getByLabelText('Tag path'), '.test{enter}');
  expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ path: 'my.tag.test' }));

  // User selects different workspace
  await select(screen.getByRole('combobox'), 'Other workspace', { container: document.body });
  expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ workspace: '2' }));

  // User toggles properties
  await userEvent.click(screen.getByRole('switch'));
  expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ properties: false }));
});
