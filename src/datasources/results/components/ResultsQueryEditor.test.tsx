import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { ResultsQueryEditor } from './ResultsQueryEditor';
import { QueryEditorProps } from '@grafana/data';
import { ResultsDataSource } from '../ResultsDataSource';
import { QueryType, ResultsQuery } from '../types/types';
import userEvent from '@testing-library/user-event';
import { defaultStepsQuery } from '../defaultQueries';

const mockOnChange = jest.fn();
const mockOnRunQuery = jest.fn();
const mockDatasource = {
  prepareQuery: jest.fn((query: ResultsQuery) => query),
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
let resultsQueryType: HTMLElement;
let stepsQueryType: HTMLElement;

describe('ResultsQueryEditor', () => {
  beforeEach(async () => {
    render(<ResultsQueryEditor {...defaultProps} />);
    resultsQueryType = screen.getByRole('radio', { name: QueryType.Results });
    stepsQueryType = screen.getByRole('radio', { name: QueryType.Steps });
  });

  test('renders query type radio buttons', () => {
    expect(resultsQueryType).toBeInTheDocument();
    expect(stepsQueryType).toBeInTheDocument();
    expect(resultsQueryType).toBeChecked();
    expect(stepsQueryType).not.toBeChecked();
  });

  test('calls onChange and runQuery when user make changes', async () => {
    userEvent.click(stepsQueryType);

    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith(expect.objectContaining(defaultStepsQuery));
      expect(mockOnRunQuery).toHaveBeenCalled();
    });
  });
});
