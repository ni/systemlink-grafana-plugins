import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TagQueryEditor } from './TagQueryEditor';
import { setupRenderer } from 'test/fixtures';
import { TagQuery, TagQueryType } from '../types';
import { TagDataSource } from '../TagDataSource';

const render = setupRenderer(TagQueryEditor, TagDataSource);

it('renders with query defaults', async () => {
  render({} as TagQuery);

  expect(screen.getByRole('radio', { name: 'Current' })).toBeChecked();
  expect(screen.getByLabelText('Tag path')).not.toHaveValue();
  expect(screen.getByLabelText('Workspace')).not.toHaveValue();
});

it('renders with saved query values', async () => {
  render({ type: TagQueryType.History, path: 'my.tag', workspace: '1' });

  expect(screen.getByRole('radio', { name: 'History' })).toBeChecked();
  expect(screen.getByLabelText('Tag path')).toHaveValue('my.tag');
  expect(screen.getByLabelText('Workspace')).toHaveValue('1');
});

it('updates query when user types new path', async () => {
  const [onChange] = render({ type: TagQueryType.Current, path: '', workspace: '' });

  await userEvent.type(screen.getByLabelText('Tag path'), 'my.tag{enter}');

  expect(onChange).toBeCalledWith(expect.objectContaining({ path: 'my.tag' }));
});

it('updates query when user selects new type', async () => {
  const [onChange] = render({ type: TagQueryType.Current, path: '', workspace: '' });

  await userEvent.click(screen.getByRole('radio', { name: 'History' }));

  expect(onChange).toBeCalledWith(expect.objectContaining({ type: TagQueryType.History }));
});

it('updates query when user types new workspace', async () => {
  const [onChange] = render({ type: TagQueryType.Current, path: '', workspace: '' });

  await userEvent.type(screen.getByLabelText('Workspace'), '1234{enter}');

  expect(onChange).toBeCalledWith(expect.objectContaining({ workspace: '1234' }));
});
