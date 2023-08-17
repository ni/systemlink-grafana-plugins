import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TagQueryEditor } from './TagQueryEditor';
import { setupRenderer } from 'test/fixtures';
import { TagQuery, TagQueryType } from '../types';
import { TagDataSource } from '../TagDataSource';

const render = setupRenderer(TagQueryEditor, TagDataSource);

it('renders with query defaults', async () => {
  render({} as TagQuery);

  expect(screen.getByLabelText('Tag path')).not.toHaveValue();
  expect(screen.getByRole('radio', { name: 'Current' })).toBeChecked();
});

it('renders with saved query values', async () => {
  render({ type: TagQueryType.History, path: 'my.tag' });

  expect(screen.getByLabelText('Tag path')).toHaveValue('my.tag');
  expect(screen.getByRole('radio', { name: 'History' })).toBeChecked();
});

it('updates query when user types new path', async () => {
  const [onChange] = render({ type: TagQueryType.Current, path: '' });

  await userEvent.type(screen.getByLabelText('Tag path'), 'my.tag{enter}');

  expect(onChange).toBeCalledWith(expect.objectContaining({ path: 'my.tag' }));
});

it('updates query when user selects new type', async () => {
  const [onChange] = render({ type: TagQueryType.Current, path: '' });

  await userEvent.click(screen.getByRole('radio', { name: 'History' }));

  expect(onChange).toBeCalledWith(expect.objectContaining({ type: TagQueryType.History }));
});
