import { screen, waitFor } from '@testing-library/react';
import { ResultsVariableQueryEditor } from './ResultsVariableQueryEditor';
import { ResultsVariableQuery } from 'datasources/results/types/QueryResults.types';
import { setupRenderer } from 'test/fixtures';
import { QueryResultsDataSource } from 'datasources/results/query-handlers/query-results/QueryResultsDataSource';

class FakeQueryResultsDataSource extends QueryResultsDataSource {
  globalVariableOptions = jest.fn(() => [{ label: 'Global', value: 'global' }]);
}

const renderEditor = setupRenderer(ResultsVariableQueryEditor, FakeQueryResultsDataSource as any, () => {});
let propertiesSelect: HTMLElement;
let queryBy: HTMLElement;

it('should render properties select and results query builder', async () => {
  renderEditor({ refId: '', properties: '', queryBy: '' } as ResultsVariableQuery);
  propertiesSelect = screen.getAllByRole('combobox')[0];
  queryBy = screen.getByText('Query By');

  expect(propertiesSelect).toBeInTheDocument();
  expect(queryBy).toBeInTheDocument();

  await waitFor(() => expect(screen.getAllByText('Property').length).toBe(1));
  await waitFor(() => expect(screen.getAllByText('Operator').length).toBe(1));
  await waitFor(() => expect(screen.getAllByText('Value').length).toBe(1));
});
