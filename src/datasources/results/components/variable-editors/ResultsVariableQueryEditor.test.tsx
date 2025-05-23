import { fireEvent, screen, waitFor } from '@testing-library/react';
import { ResultsVariableQueryEditor } from './ResultsVariableQueryEditor';
import { setupRenderer } from 'test/fixtures';
import { ResultsDataSource } from 'datasources/results/ResultsDataSource';
import { QueryType, ResultsQuery } from 'datasources/results/types/types';
import { Workspace } from 'core/types';
import { QueryResultsDataSource } from 'datasources/results/query-handlers/query-results/QueryResultsDataSource';
import { ResultsVariableProperties } from 'datasources/results/types/QueryResults.types';
import { QueryStepsDataSource } from 'datasources/results/query-handlers/query-steps/QueryStepsDataSource';

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

class FakeQueryStepsDataSource extends QueryStepsDataSource {
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

  get queryStepsDataSource() {
    return new FakeQueryStepsDataSource(this.instanceSettings, this.backendSrv, this.templateSrv);
  }
}

const renderEditor = setupRenderer(ResultsVariableQueryEditor, FakeResultsDataSource, () => {});
let propertiesSelect: HTMLElement;
let queryBy: HTMLElement;
let queryByResults: HTMLElement;
let queryBySteps: HTMLElement;

describe('Results Query Type', () => {
  beforeEach(() => {
    renderEditor({ refId: '', queryType: QueryType.Results, properties: '', queryBy: '' } as unknown as ResultsQuery);
  });

  it('should render query type radio buttons', () => {
    const radioButtons = screen.getAllByRole('radio');

    expect(radioButtons.length).toBe(2);
  });

  it('should select Results query type by default', () => {
    expect(screen.getByRole('radio', { name: QueryType.Results })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: QueryType.Results })).toBeChecked();
    expect(screen.getByRole('radio', { name: QueryType.Steps })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: QueryType.Steps })).not.toBeChecked();
  });

  it('should render properties select and results query builder progressively', async () => {
    propertiesSelect = screen.getAllByRole('combobox')[0];

    expect(propertiesSelect).toBeInTheDocument();

    //simulate user selecting a property
    fireEvent.keyDown(propertiesSelect, { key: 'ArrowDown' });
    const option = await screen.findByText(ResultsVariableProperties[0].label);
    fireEvent.click(option);

    queryBy = screen.getByText('Query by results properties');
    expect(queryBy).toBeInTheDocument();

    await waitFor(() => expect(screen.getAllByText('Property').length).toBe(1));
    await waitFor(() => expect(screen.getAllByText('Operator').length).toBe(1));
    await waitFor(() => expect(screen.getAllByText('Value').length).toBe(1));
  });
});

describe('Steps Query Type', () => {
  it('should render steps wrapper query builder', async () => {
    renderEditor({
      refId: '',
      queryType: QueryType.Steps,
      queryByResults: 'resultsQuery',
      queryBySteps: '',
    } as unknown as ResultsQuery);

    queryByResults = screen.getByText('Query by results properties');
    queryBySteps = screen.getByText('Query by steps properties');

    expect(queryByResults).toBeInTheDocument();
    expect(queryBySteps).toBeInTheDocument();
  });
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
