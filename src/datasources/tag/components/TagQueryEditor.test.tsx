import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TagQueryEditor } from './TagQueryEditor';
import { renderQueryEditor } from 'test/fixtures';

it('updates query with new tag path', async () => {
  // Given - TagQueryEditor with empty query
  const [onChange] = renderQueryEditor(TagQueryEditor, { path: '' });

  // When - user types in tag path
  await userEvent.type(screen.getByLabelText('Tag path'), 'my.tag{enter}');

  // Then - onChange called with new tag path
  expect(onChange).toBeCalledWith(expect.objectContaining({ path: 'my.tag' }));
});

it('renders with saved query values', async () => {
  renderQueryEditor(TagQueryEditor, { path: 'my.tag' });

  expect(screen.getByLabelText('Tag path')).toHaveValue('my.tag');
});
