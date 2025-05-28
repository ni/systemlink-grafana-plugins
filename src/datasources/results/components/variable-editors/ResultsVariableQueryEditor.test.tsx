import { act, cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { ResultsVariableQueryEditor } from './ResultsVariableQueryEditor';
import { setupRenderer } from 'test/fixtures';
import { ResultsDataSource } from 'datasources/results/ResultsDataSource';
import { QueryType, ResultsQuery } from 'datasources/results/types/types';
import { Workspace } from 'core/types';
import { QueryResultsDataSource } from 'datasources/results/query-handlers/query-results/QueryResultsDataSource';
import { ResultsVariableProperties } from 'datasources/results/types/QueryResults.types';
import { QueryStepsDataSource } from 'datasources/results/query-handlers/query-steps/QueryStepsDataSource';
import React from 'react';
import userEvent from '@testing-library/user-event';
import { defaultStepsQuery } from 'datasources/results/defaultQueries';

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

const fakePartNumbers = [ "part1", "part2", "part3" ];

class FakeQueryResultsSource extends QueryResultsDataSource {
  getWorkspaces(): Promise<Workspace[]> {
    return Promise.resolve(fakeWorkspaces);
  }
  queryResultsValues(): Promise<string[]> {
    return Promise.resolve(fakePartNumbers);
  }
}

class FakeQueryStepsDataSource extends QueryStepsDataSource {
  getWorkspaces(): Promise<Workspace[]> {
    return Promise.resolve(fakeWorkspaces);
  }
  queryResultsValues(): Promise<string[]> {
    return Promise.resolve(fakePartNumbers);
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

jest.mock('../query-builders/query-results/ResultsQueryBuilder', () => ({
  ResultsQueryBuilder: jest.fn(({ workspaces, partNumbers }) => {
    return (
      <div data-testid="results-query-builder">
        <div data-testid="results-workspaces">{JSON.stringify(workspaces)}</div>
        <div data-testid="results-part-numbers">{JSON.stringify(partNumbers)}</div>=
      </div>
    );
  }),
}));

jest.mock('../query-builders/steps-querybuilder-wrapper/StepsQueryBuilderWrapper', () => ({
  StepsQueryBuilderWrapper: jest.fn(({ resultsQuery, stepsQuery, disableStepsQueryBuilder }) => {
    return (
      <div data-testid="steps-query-builder-wrapper">
        <input 
          data-testid="results-query"
          value={resultsQuery}
        />
        <input 
          data-testid="steps-query"
          value={stepsQuery}
          disabled={disableStepsQueryBuilder} 
        />
      </div>
    );
  }),
}));

const renderEditor = setupRenderer(ResultsVariableQueryEditor, FakeResultsDataSource, () => {});
let propertiesSelect: HTMLElement;
let queryBy: HTMLElement;

describe('Results Query Type', () => {
  beforeEach(async () => {
    await act(async () => {
      renderEditor({ refId: '', queryType: QueryType.Results, properties: ResultsVariableProperties[0].value, queryBy: '', resultsTake: 1000 } as unknown as ResultsQuery);
    });
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
    fireEvent.click(propertiesSelect);

    queryBy = screen.getByText('Query by results properties');
    expect(queryBy).toBeInTheDocument();

    expect(screen.queryByTestId('results-query-builder')).toBeInTheDocument();
  });

  describe('Take input field', () => {
    it('should render take input field with 1000 as value by default', () => {
      const takeInput = screen.getByPlaceholderText('Enter record count');
      expect(takeInput).toBeInTheDocument();
      expect(takeInput).toHaveValue(1000);
    });

    it('should only allows numbers in Take field', async () => {
      const takeInput = screen.getByPlaceholderText('Enter record count');

      // User tries to enter a non-numeric value
      await userEvent.clear(takeInput);
      await userEvent.type(takeInput, 'abc');
      await waitFor(() => {
        expect(takeInput).toHaveValue(null);
      });

      // User enters a valid numeric value
      await userEvent.clear(takeInput);
      await userEvent.type(takeInput, '500');
      await waitFor(() => {
        expect(takeInput).toHaveValue(500);
      });
    });
  });
});

  describe('Steps Query Type', () => {
    it('should render steps wrapper query builder', async () => {
      await act(async () => {
        renderEditor({
          refId: '',
          queryType: QueryType.Steps,
          queryByResults: 'resultsQuery',
          queryBySteps: '',
        } as unknown as ResultsQuery);
      });
    expect(screen.getByTestId('steps-query-builder-wrapper')).toBeInTheDocument();
  });

  it('should have default query in results query builder', async () => {
    await act(async () => {
      renderEditor({
        refId: '',
        queryType: QueryType.Steps,
        queryByResults: undefined,
        queryBySteps: '',
      } as unknown as ResultsQuery);
    });

    expect(screen.getByTestId('results-query')).toHaveValue(defaultStepsQuery.resultsQuery);
    expect(screen.getByTestId('steps-query')).toBeDisabled();
  });

  describe('Take input field', () => {
    it('should render take input field with 1000 as value by default', () => {
      renderEditor({
        refId: '',
        queryType: QueryType.Steps,
        queryByResults: 'resultsQuery',
        queryBySteps: '',
      } as unknown as ResultsQuery);

      const takeInput = screen.getByPlaceholderText('Enter record count');
      expect(takeInput).toBeInTheDocument();
      expect(takeInput).toHaveValue(1000);
    });

    it('should render with existing stepsTake when take is already set', () => {
      renderEditor({
        refId: '',
        queryType: QueryType.Steps,
        queryByResults: 'resultsQuery',
        queryBySteps: '',
        stepsTake: 2000,
      } as unknown as ResultsQuery);

      const takeInput = screen.getByPlaceholderText('Enter record count');
      expect(takeInput).toHaveValue(2000);
    });

    it('should only allows numbers in Take field', async () => {
      renderEditor({
        refId: '',
        queryType: QueryType.Steps,
        queryByResults: 'resultsQuery',
        queryBySteps: '',
        stepsTake: 2000,
      } as unknown as ResultsQuery);
      const takeInput = screen.getByPlaceholderText('Enter record count');

      // User tries to enter a non-numeric value
      await userEvent.clear(takeInput);
      await userEvent.type(takeInput, 'abc');
      await waitFor(() => {
        expect(takeInput).toHaveValue(null);
      });

      // User enters a valid numeric value
      await userEvent.clear(takeInput);
      await userEvent.type(takeInput, '500');
      await waitFor(() => {
        expect(takeInput).toHaveValue(500);
      });
    });
  });
});

describe('Dependencies', () => {
  it('should load workspaces and part numbers from the datasource', async () => {
    await act(async () => { 
      renderEditor({ refId: '', properties: '', queryBy: '' } as unknown as ResultsQuery);
    });

    fireEvent.keyDown(screen.getAllByRole('combobox')[0], { key: 'ArrowDown' });
    const option = await screen.findByText(ResultsVariableProperties[0].label);
    fireEvent.click(option);

    expect(screen.getByTestId('results-part-numbers').textContent).toEqual(JSON.stringify(fakePartNumbers));
    expect(screen.getByTestId('results-workspaces').textContent).toEqual(
      JSON.stringify([
        { id: '1', name: 'workspace1', default: false, enabled: true },
        { id: '2', name: 'workspace2', default: false, enabled: true },
      ])
    );
  });

  it('should not render part numbers and workspaces when promises resolve to undefined', async () => {
    cleanup();
    const emptyDatasource = {
      globalVariableOptions: jest.fn().mockReturnValue([]),
      get workspacesCache() {
        return Promise.resolve(new Map());
      },
      get partNumbersCache() {
        return Promise.resolve([]);
      },
    } as unknown as QueryResultsDataSource;

    Object.defineProperty(FakeResultsDataSource.prototype, 'queryResultsDataSource', {
      get: () => emptyDatasource,
    });

    jest.spyOn(console, 'error').mockImplementation(() => {});
    await act(async () => {
      renderEditor({ refId: '', properties: '', queryBy: '' } as unknown as ResultsQuery);
    });

    fireEvent.keyDown(screen.getAllByRole('combobox')[0], { key: 'ArrowDown' });
    const option = await screen.findByText(ResultsVariableProperties[0].label);
    fireEvent.click(option);

    expect(screen.getByTestId('results-part-numbers').textContent).toBe('[]');
    expect(screen.getByTestId('results-workspaces').textContent).toBe('[]');
  });
});
