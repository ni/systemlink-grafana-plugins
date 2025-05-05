import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { ResultsQueryEditor } from './ResultsQueryEditor';
import { QueryEditorProps } from '@grafana/data';
import { ResultsDataSource } from '../ResultsDataSource';
import { QueryType, ResultsQuery } from '../types/types';
import userEvent from '@testing-library/user-event';
import { defaultResultsQuery, defaultStepsQuery } from '../defaultQueries';

const mockOnChange = jest.fn();
const mockOnRunQuery = jest.fn();
const mockDatasource = {
  prepareQuery: jest.fn((query: ResultsQuery) => query),
  getQueryResultsDataSource: jest.fn(() => ({}))
} as unknown as ResultsDataSource;

const defaultProps: QueryEditorProps<ResultsDataSource, ResultsQuery> = {
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
        expect(mockDatasource.getQueryResultsDataSource).not.toHaveBeenCalled();
      });
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
  });

  describe('Datasource', () => {
    test('should call getQueryResultsDataSource when query type is results', () => {
      renderElement();

      expect(mockDatasource.getQueryResultsDataSource).toHaveBeenCalled();
    });

    test('should not call getQueryResultsDataSource when query type is steps', () => {
      const query = {
        refId: 'A',
        queryType: QueryType.Steps,
      };

      renderElement(query);

      expect(mockDatasource.getQueryResultsDataSource).not.toHaveBeenCalled();
    });
  });
});
