import React from 'react';
import { render, screen } from '@testing-library/react';
import { ResultsQueryEditor } from './ResultsQueryEditor';
import { QueryEditorProps } from '@grafana/data';
import { ResultsDataSource } from '../ResultsDataSource';
import { QueryType, ResultsQuery } from '../types/types';

jest.mock('./editors/query-results/QueryResultsEditor', () => ({
  QueryResultsEditor: () => <div data-testid="query-results-editor">QueryResultsEditor</div>,
}));

const mockDatasource = {
  prepareQuery: jest.fn((query: ResultsQuery) => query),
} as unknown as ResultsDataSource;

const defaultProps: QueryEditorProps<ResultsDataSource, ResultsQuery> = {
  query: {
    refId: 'A',
    queryType: QueryType.Results
  },
  onChange: jest.fn(),
  onRunQuery: jest.fn(),
  datasource: mockDatasource,
};

let queryType: HTMLElement;

describe('ResultsQueryEditor', () => {
  beforeEach(async () => {
    render(<ResultsQueryEditor {...defaultProps} />);
    queryType = screen.getByRole('radio', { name: 'Results' });
  });

  it('should render the controls with the default query values', () => {
    expect(queryType).toBeInTheDocument();
    expect(queryType).toBeChecked();
    expect(screen.queryByTestId('query-results-editor')).toBeInTheDocument();
  });
});
