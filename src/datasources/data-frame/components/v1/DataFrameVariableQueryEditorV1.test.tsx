import { render, screen } from '@testing-library/react';
import React from 'react';
import { select } from 'react-select-event';
import { setupDataSource } from 'test/fixtures';
import { DataFrameDataSourceV1 } from 'datasources/data-frame/datasources/v1/DataFrameDataSourceV1';
import { DataFrameQueryV1 } from '../../types';
import { DataFrameVariableQueryEditorV1 } from './DataFrameVariableQueryEditorV1';

const onChange = jest.fn();
const onRunQuery = jest.fn();
const [datasource] = setupDataSource(DataFrameDataSourceV1);

test('renders with no data table selected', async () => {
  render(<DataFrameVariableQueryEditorV1 {...{ onChange, onRunQuery, datasource, query: '' as unknown as DataFrameQueryV1 }} />);

  expect(screen.getByRole('combobox')).toHaveAccessibleDescription('Search by name or enter id');
});

test('populates data table drop-down with variables', async () => {
  render(<DataFrameVariableQueryEditorV1 {...{ onChange, onRunQuery, datasource, query: { tableId: '$test_var' } as DataFrameQueryV1 }} />);

  expect(screen.getByText('$test_var')).toBeInTheDocument();
});

test('user selects new data table', async () => {
  render(<DataFrameVariableQueryEditorV1 {...{ onChange, onRunQuery, datasource, query: '' as unknown as DataFrameQueryV1 }} />);

  await select(screen.getByRole('combobox'), '$test_var', { container: document.body });
  expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ tableId: '$test_var' }));
});

