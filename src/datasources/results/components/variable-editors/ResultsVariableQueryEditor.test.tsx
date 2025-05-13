import { fireEvent, screen, waitFor } from '@testing-library/react';
import { ResultsVariableQueryEditor } from './ResultsVariableQueryEditor';
import { ResultsVariableQuery } from 'datasources/results/types/QueryResults.types';
import { setupRenderer } from 'test/fixtures';
import { QueryResultsDataSource } from 'datasources/results/query-handlers/query-results/QueryResultsDataSource';
import { select } from 'react-select-event';
import userEvent from '@testing-library/user-event';
import { ResultsQueryBuilder } from '../query-builders/query-results/ResultsQueryBuilder';
import React from 'react';

class FakeResultsDataSource extends QueryResultsDataSource {
  globalVariableOptions = jest.fn(() => [{ label: 'Global', value: 'global' }]);
}

const render = setupRenderer(ResultsVariableQueryEditor, FakeResultsDataSource as any, () => {});
let onChange: jest.Mock<any, any>;
let propertiesSelect: HTMLElement;
let queryBy: HTMLElement;


it('renders properties select and results query builder', async () => {
  render({ refId: '', properties: '', queryBy: '' } as ResultsVariableQuery);
  propertiesSelect = screen.getAllByRole('combobox')[0];
  queryBy = screen.getByText('Query By');

  expect(propertiesSelect).toBeInTheDocument();
  expect(queryBy).toBeInTheDocument();

  await waitFor(() => expect(screen.getAllByText('Property').length).toBe(1));
  await waitFor(() => expect(screen.getAllByText('Operator').length).toBe(1));
  await waitFor(() => expect(screen.getAllByText('Value').length).toBe(1));
});

it('should call onChange when user changes the properties', async () => {
  [onChange] = render({ refId: '', properties: '', queryBy: '' } as ResultsVariableQuery);
  await waitFor(() => (propertiesSelect = screen.getAllByRole('combobox')[0]));

  await select(propertiesSelect, 'Test Program Name', { container: document.body });
  await waitFor(() => {
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ properties: 'programName' }));
  });
});
