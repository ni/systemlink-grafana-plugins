import React from 'react';
import { render } from '@testing-library/react';
import { ResultsQueryEditor } from './ResultsQueryEditor';
import { QueryEditorProps } from '@grafana/data';
import { ResultsDataSource } from '../ResultsDataSource';
import { OutputType, ResultsQuery } from '../types';

const mockDatasource = {
  prepareQuery: jest.fn((query: ResultsQuery) => query),
} as unknown as ResultsDataSource;

const defaultProps: QueryEditorProps<ResultsDataSource, ResultsQuery> = {
  query: {
    refId: 'A',
    outputType: OutputType.Data,
    properties: [],
    orderBy: undefined,
    descending: false,
    recordCount: 1000,
    useTimeRange: true,
    useTimeRangeFor: undefined,
  },
  onChange: jest.fn(),
  onRunQuery: jest.fn(),
  datasource: mockDatasource,
};

describe('ResultsQueryEditor', () => {
  it('should render without crashing', () => {
    const { container } = render(<ResultsQueryEditor {...defaultProps} />);
    expect(container).toBeInTheDocument();
  });
});
