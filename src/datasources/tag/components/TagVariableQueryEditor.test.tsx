import { render, screen, waitForElementToBeRemoved } from '@testing-library/react';
import React from 'react';
import { setupDataSource } from 'test/fixtures';
import { TagDataSource } from "../TagDataSource";
import { TagVariableQueryEditor } from "./TagVariableQueryEditor";
import { select } from "react-select-event";
import userEvent from "@testing-library/user-event";

const onChange = jest.fn();
const [datasource] = setupDataSource(TagDataSource);
const workspacesLoaded = () => waitForElementToBeRemoved(screen.getByTestId('Spinner'));

test('renders with NO workspace selected', async () => {
  render(<TagVariableQueryEditor {...{ onChange, datasource, query: { workspace: '', path: '' } }} />);

  await workspacesLoaded();

  expect(screen.getByRole('combobox')).toHaveAccessibleDescription('Any workspace');
});

test('renders with workspace selected', async () => {
  render(<TagVariableQueryEditor {...{ onChange, datasource, query: { workspace: '1', path: '' } }} />);

  await workspacesLoaded();

  expect(screen.getByText('Default workspace')).toBeInTheDocument();
});

test('user selects new workspace', async () => {
  render(<TagVariableQueryEditor {...{ onChange, datasource, query: { workspace: '1', path: 'my.tag' } }} />);

  await workspacesLoaded();

  await select(screen.getByRole('combobox'), 'Other workspace', { container: document.body });
  expect(onChange).toHaveBeenCalledWith({ workspace: '2', path: 'my.tag' });
});

test('populates workspace drop-down with variables', async () => {
  render(<TagVariableQueryEditor {...{ onChange, datasource, query: { workspace: '$test_var', path: '' } }} />);

  await workspacesLoaded();

  expect(screen.getByText('$test_var')).toBeInTheDocument();
});

test('render with some tag path', async () => {
  render(<TagVariableQueryEditor {...{ onChange, datasource, query: { workspace: '', path: 'my.tag' } }} />);

  await workspacesLoaded();

  expect(screen.getByLabelText('Tag path')).toHaveValue('my.tag');
});

test('some interactions with form', async () => {
  render(<TagVariableQueryEditor {...{ onChange, datasource, query: { workspace: '', path: '' } }} />);
  expect(screen.getByLabelText('Tag path')).not.toHaveValue();

  await workspacesLoaded();

  await userEvent.type(screen.getByLabelText('Tag path'), 'my.tag');
  expect(screen.getByLabelText('Tag path')).toHaveValue('my.tag');
});


