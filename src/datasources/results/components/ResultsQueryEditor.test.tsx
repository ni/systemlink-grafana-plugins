import React from 'react';
import { render, screen } from '@testing-library/react';
import { ResultsQueryEditor } from './ResultsQueryEditor';
import { QueryEditorProps } from '@grafana/data';
import { ResultsDataSource } from '../ResultsDataSource';
import { QueryType, ResultsQuery } from '../types/types';

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
let dataOutput: HTMLElement;

describe('ResultsQueryEditor', () => {
  beforeEach(async () => {
    render(<ResultsQueryEditor {...defaultProps} />);
    dataOutput = screen.getByRole('radio', { name: 'Data' });
  });

  it('should render the controls with the default query values', () => {
    expect(dataOutput).toBeChecked();
  });
});
