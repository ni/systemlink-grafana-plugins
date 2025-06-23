import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { ResultsQueryEditor } from './ResultsQueryEditor';
import { QueryEditorProps } from '@grafana/data';
import { ResultsDataSource } from '../ResultsDataSource';
import { QueryType, ResultsDataSourceOptions, ResultsQuery } from '../types/types';
import userEvent from '@testing-library/user-event';
import { defaultResultsQuery, defaultStepsQuery } from '../defaultQueries';

const mockOnChange = jest.fn();
const mockOnRunQuery = jest.fn();
const mockDatasource = {
  prepareQuery: jest.fn((query: ResultsQuery) => query),
} as unknown as ResultsDataSource;

const queryResultsDataSourceMock = jest.fn(() => {});
Object.defineProperty(mockDatasource, 'queryResultsDataSource', {
  get: queryResultsDataSourceMock,
});

const defaultProps: QueryEditorProps<ResultsDataSource, ResultsQuery, ResultsDataSourceOptions> = {
  query: {
    refId: 'A',
    queryType: QueryType.Results,
  },
  onChange: mockOnChange,
  onRunQuery: mockOnRunQuery,
  datasource: mockDatasource,
};

jest.mock('./editors/query-results/QueryResultsEditor', () => ({
  QueryResultsEditor: () => <div data-testid="query-results-editor" />
}));

jest.mock('./editors/query-steps/QueryStepsEditor', () => ({
  QueryStepsEditor: () => <div data-testid="query-steps-editor" />
}));

describe('ResultsQueryEditor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  function renderElement(query: ResultsQuery = { refId: 'A', queryType: QueryType.Results }) {
    const reactNode = React.createElement(ResultsQueryEditor, { ...defaultProps, query });
    return render(reactNode);
  }

  test('should render `queryType` radio buttons', () => {
    const renderResult = renderElement();

    expect(renderResult.getByRole('radio', { name: QueryType.Results })).toBeInTheDocument();
    expect(renderResult.getByRole('radio', { name: QueryType.Results })).toBeChecked();
    expect(renderResult.getByRole('radio', { name: QueryType.Steps })).toBeInTheDocument();
    expect(renderResult.getByRole('radio', { name: QueryType.Steps })).not.toBeChecked();
  });

  describe('onChange', () => {
    test('should call onChange with steps query defaults when switching from results to steps', async () => {
      const renderResult = renderElement();

      userEvent.click(renderResult.getByRole('radio', { name: QueryType.Steps }));

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith(expect.objectContaining(defaultStepsQuery));
        expect(mockOnRunQuery).toHaveBeenCalled();
      });
    });

    test('should call onChange with results query defaults when switching from steps to results', async () => {
      const query = {
        refId: 'A',
        queryType: QueryType.Steps,
      };

      const renderResult = renderElement(query);
      const resultsRadioButton = renderResult.getByRole('radio', { name: QueryType.Results });
      userEvent.click(resultsRadioButton);

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith(expect.objectContaining(defaultResultsQuery));
        expect(mockOnRunQuery).toHaveBeenCalled();
      });
    });

     test('should call onChange with defaultResultsQuery and queryType Results when queryType is undefined', () => {
    render(
      <ResultsQueryEditor
        {...defaultProps}
        query={{ refId: 'A' } as ResultsQuery}
      />
    );
    expect(mockOnChange).toHaveBeenCalledWith(expect.objectContaining({...defaultResultsQuery, queryType: QueryType.Results, refId: 'A' }));
  })
  });

  test('should save stepsQuery value only when switched from steps query type to results', async () => {
    const customStepsQuery = {
      refId: 'A',
      queryType: QueryType.Steps,
      customField: 'customValue',
    } as ResultsQuery;

    let currentQuery = { ...customStepsQuery };
    const onChange = jest.fn((query) => {
      currentQuery = { ...currentQuery, ...query };
      renderResult.rerender(
        React.createElement(ResultsQueryEditor, { ...defaultProps, query: currentQuery, onChange })
      );
    });

    const renderResult = render(
      React.createElement(ResultsQueryEditor, { ...defaultProps, query: currentQuery, onChange })
    );

    // Switch to Results
    userEvent.click(renderResult.getByRole('radio', { name: QueryType.Results }));
    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(expect.objectContaining(defaultResultsQuery));
    });

    // Switch back to Steps
    userEvent.click(renderResult.getByRole('radio', { name: QueryType.Steps }));
    await waitFor(() => {
      // The customField should be preserved in stepsQuery state and merged back in
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          ...defaultStepsQuery,
          customField: 'customValue',
        })
      );
    });
  })

  test('should not save stepsQuery value when switching from results to steps without previous steps query', async () => {
   const query = {
      refId: 'A',
    } as ResultsQuery; // undefined queryType

    const renderResult = render(
      React.createElement(ResultsQueryEditor, {
        query,
        datasource: mockDatasource,
        onRunQuery: mockOnRunQuery,
        onChange: mockOnChange,
      })
    );

    // Switch to Results
    userEvent.click(renderResult.getByRole('radio', { name: QueryType.Results }));
    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith(expect.objectContaining(defaultResultsQuery));
    });

    // Switch to Steps without any previous steps query
    userEvent.click(renderResult.getByRole('radio', { name: QueryType.Steps }));
    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith(expect.objectContaining(defaultStepsQuery));
    });
  });

  test('should save resultsQuery value when switching to steps and back to results', async () => {
    // Start with Results query type and set a custom value for resultsQuery
    const customResultsQuery = {
      refId: 'A',
      queryType: QueryType.Results,
      customField: 'customValue',
    } as ResultsQuery;

    let currentQuery = { ...customResultsQuery };
    const onChange = jest.fn((query) => {
      currentQuery = { ...currentQuery, ...query };
      renderResult.rerender(
        React.createElement(ResultsQueryEditor, { ...defaultProps, query: currentQuery, onChange })
      );
    });

    const renderResult = render(
      React.createElement(ResultsQueryEditor, { ...defaultProps, query: currentQuery, onChange })
    );

    // Switch to Steps
    userEvent.click(renderResult.getByRole('radio', { name: QueryType.Steps }));
    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(expect.objectContaining(defaultStepsQuery));
    });

    // Switch back to Results
    userEvent.click(renderResult.getByRole('radio', { name: QueryType.Results }));
    await waitFor(() => {
      // The customField should be preserved in resultsQuery state and merged back in
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          ...defaultResultsQuery,
          customField: 'customValue',
        })
      );
    });
  });
  describe('Editor', () => {
    test('should render QueryResultsEditor when query type is results', () => {
      const renderResult = renderElement();

      expect(renderResult.queryByTestId('query-results-editor')).toBeInTheDocument();
      expect(renderResult.queryByTestId('query-steps-editor')).not.toBeInTheDocument();
    });

    test('should render QueryResultsEditor when query type is steps', () => {
      const query = {
        refId: 'A',
        queryType: QueryType.Steps,
      };

      const renderResult = renderElement(query);

      expect(renderResult.queryByTestId('query-steps-editor')).toBeInTheDocument();
      expect(renderResult.queryByTestId('query-results-editor')).not.toBeInTheDocument();
    });

    test('should call onRunQuery on init', () => {
      const query = {
        refId: 'A',
      }

      renderElement(query);
      expect(mockOnRunQuery).toHaveBeenCalled();
      expect(mockOnChange).toHaveBeenCalledWith(expect.objectContaining({ ...defaultResultsQuery, queryType: QueryType.Results, refId: 'A' }));
      
    })
  });

  describe('Datasource', () => {
    test('should call queryResultsDataSource when query type is results', () => {
      renderElement();

      expect(queryResultsDataSourceMock).toHaveBeenCalled();
    });

    test('should not call queryResultsDataSource when query type is steps', () => {
      const query = {
        refId: 'A',
        queryType: QueryType.Steps,
      };

      renderElement(query);

      expect(queryResultsDataSourceMock).not.toHaveBeenCalled();
    });
  });
});
