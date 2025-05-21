import { screen, waitFor } from '@testing-library/react';
import { ResultsVariableQueryEditor } from './ResultsVariableQueryEditor';
import { setupRenderer } from 'test/fixtures';
import { ResultsDataSource } from 'datasources/results/ResultsDataSource';
import { ResultsQuery } from 'datasources/results/types/types';
import { Workspace } from 'core/types';
import { QueryResultsDataSource } from 'datasources/results/query-handlers/query-results/QueryResultsDataSource';

const fakeWorkspaces: Workspace[] = [
  {
    id: '1',
    name: 'workspace1',
    default: false,
    enabled: true,
  },
  {
    id: '2',
    name: 'workspace2',
    default: false,
    enabled: true,
  },
];

class FakeQueryResultsSource extends QueryResultsDataSource {
  getWorkspaces(): Promise<Workspace[]> {
    return Promise.resolve(fakeWorkspaces);
  }
  getPartNumbers(): Promise<void> {
    return Promise.resolve();
  }
}

class FakeResultsDataSource extends ResultsDataSource {
  get queryResultsDataSource() {
    return new FakeQueryResultsSource(this.instanceSettings, this.backendSrv, this.templateSrv);
  }
}

const renderEditor = setupRenderer(ResultsVariableQueryEditor, FakeResultsDataSource, () => {});
let propertiesSelect: HTMLElement;
let queryBy: HTMLElement;

it('should render properties select and results query builder', async () => {
  renderEditor({ refId: '', properties: '', queryBy: '' } as unknown as ResultsQuery);
  propertiesSelect = screen.getAllByRole('combobox')[0];
  queryBy = screen.getByText('Query By');

  expect(propertiesSelect).toBeInTheDocument();
  expect(queryBy).toBeInTheDocument();

  await waitFor(() => expect(screen.getAllByText('Property').length).toBe(1));
  await waitFor(() => expect(screen.getAllByText('Operator').length).toBe(1));
  await waitFor(() => expect(screen.getAllByText('Value').length).toBe(1));
});

it('should load part numbers on mount', async () => {
  const queryResultValuesSpy = jest.spyOn(FakeQueryResultsSource.prototype, 'getPartNumbers');
  renderEditor({ refId: '', properties: '', queryBy: '' } as unknown as ResultsQuery);

  expect(queryResultValuesSpy).toHaveBeenCalledTimes(1);
});

it('should load workspaces on mount', async () => {
  const getWorkspace = jest.spyOn(FakeQueryResultsSource.prototype, 'getWorkspaces');
  renderEditor({ refId: '', properties: '', queryBy: '' } as unknown as ResultsQuery);

  expect(getWorkspace).toHaveBeenCalledTimes(1);
});
