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

const fakePartNumbers = [ "PN1", "PN2", "PN3" ];

class FakeQueryResultsSource extends QueryResultsDataSource {
  getWorkspaces(): Promise<Workspace[]> {
    return Promise.resolve(fakeWorkspaces);
  }
  queryResultsValues(): Promise<string[]> {
    return Promise.resolve(fakePartNumbers);
  }
  globalVariableOptions = () => [
    { label: "$var1", value: "$var1" },
    { label: "$var2", value: "$var2" }
  ]
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
  ResultsQueryBuilder: jest.fn(({ workspaces, partNumber }) => {
    return (
      <div data-testid="results-query-builder">
        <div data-testid="results-workspaces">{JSON.stringify(workspaces)}</div>
        <div data-testid="results-part-number">{JSON.stringify(partNumber)}</div>
      </div>
    );
  }),
}));

jest.mock('../query-builders/steps-querybuilder-wrapper/StepsQueryBuilderWrapper', () => ({
  StepsQueryBuilderWrapper: jest.fn(({ resultsQuery, stepsQuery, onResultsQueryChange, onStepsQueryChange, disableStepsQueryBuilder }) => {
    return (
      <div data-testid="steps-query-builder-container">
        <input 
          data-testid="Query by results properties"
          value={resultsQuery}
          onChange={(e) => onResultsQueryChange(e.target.value)}
        />
        <input 
          data-testid="Query by steps properties"
          value={stepsQuery}
          onChange={(e) => onStepsQueryChange(e.target.value)}
          disabled={disableStepsQueryBuilder} 
        />
      </div>
    );
  }),
}));

const renderEditor = setupRenderer(ResultsVariableQueryEditor, FakeResultsDataSource, () => {});
let propertiesSelect: HTMLElement;
let queryBy: HTMLElement;
let queryByResults: HTMLElement;
let queryBySteps: HTMLElement;

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
    renderEditor({
      refId: '',
      queryType: QueryType.Steps,
      queryByResults: 'resultsQuery',
      queryBySteps: '',
    } as unknown as ResultsQuery);

    const stepsQueryBuilderWrapper = screen.getByTestId('steps-query-builder-container');
    queryByResults = screen.getByTestId('Query by results properties');
    queryBySteps = screen.getByTestId('Query by steps properties');

    expect(stepsQueryBuilderWrapper).toBeInTheDocument();
    expect(queryByResults).toBeInTheDocument();
    expect(queryBySteps).toBeInTheDocument();
  });

  it('should disable the steps query builder when resultQuery is empty', async () => {
    await act(async () => {
      renderEditor({
        refId: '',
        queryType: QueryType.Steps,
        queryByResults: '',
        queryBySteps: '',
      } as unknown as ResultsQuery);
    });
    const stepsQueryInput = screen.getByTestId('Query by steps properties');
    expect(stepsQueryInput).toBeInTheDocument();
    expect(stepsQueryInput).toBeDisabled();
  });

  it('should enable the steps query builder when resultQuery has value', async () => {
    await act(async () => {
      renderEditor({
        refId: '',
        queryType: QueryType.Steps,
        queryByResults: 'resultsQuery',
        queryBySteps: '',
      } as unknown as ResultsQuery);
    });
    const stepsQueryInput = screen.getByTestId('Query by steps properties');
    expect(stepsQueryInput).toBeInTheDocument();
    expect(stepsQueryInput).not.toBeDisabled();
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
  it('should load workspaces from the datasource', async () => {
    await act(async () => { 
      renderEditor({ refId: '', properties: '', queryBy: '' } as unknown as ResultsQuery);
    });

    fireEvent.keyDown(screen.getAllByRole('combobox')[0], { key: 'ArrowDown' });
    const option = await screen.findByText(ResultsVariableProperties[0].label);
    fireEvent.click(option);

    expect(screen.getByTestId('results-workspaces').textContent).toEqual(
      JSON.stringify([
        { id: '1', name: 'workspace1', default: false, enabled: true },
        { id: '2', name: 'workspace2', default: false, enabled: true },
      ])
    );
  });

  it('should not render workspaces when promise resolve to undefined', async () => {
    cleanup();
    const emptyDatasource = {
      globalVariableOptions: jest.fn().mockReturnValue([]),
      get workspacesCache() {
        return Promise.resolve(new Map());
      },
      get partNumbersCache() {
        return Promise.resolve(new Map());
      }
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

    expect(screen.getByTestId('results-workspaces').textContent).toBe('[]');
  });

  it('should not render product part numbers when promise resolves to undefined', async () => {
    cleanup();
    const emptyDatasource = {
      globalVariableOptions: jest.fn().mockReturnValue([]),
      get workspacesCache() {
        return Promise.resolve(new Map());
      },
      get partNumbersCache() {
        return Promise.resolve(new Map());
      }
    } as unknown as QueryResultsDataSource;

    Object.defineProperty(FakeResultsDataSource.prototype, 'queryResultsDataSource', {
      get: () => emptyDatasource,
    });

    await act(async () => {
      renderEditor({ refId: '', properties: '', queryBy: '' } as unknown as ResultsQuery);
    });

    fireEvent.keyDown(screen.getAllByRole('combobox')[0], { key: 'ArrowDown' });
    const option = await screen.findByText(ResultsVariableProperties[0].label);
    fireEvent.click(option);

    expect(screen.getByTestId('results-part-number').textContent).toBe('');
  })
});
