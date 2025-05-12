import React from 'react';
import { render, screen } from '@testing-library/react';
import { TestPlansQueryEditor } from './TestPlansQueryEditor';
import { QueryEditorProps } from '@grafana/data';
import { TestPlansDataSource } from '../TestPlansDataSource';
import { TestPlansQuery } from '../types';

const mockDatasource = {
    prepareQuery: jest.fn((query: TestPlansQuery) => query),
} as unknown as TestPlansDataSource;

const defaultProps: QueryEditorProps<TestPlansDataSource, TestPlansQuery> = {
    query: {} as TestPlansQuery,
    onChange: jest.fn(),
    onRunQuery: jest.fn(),
    datasource: mockDatasource,
};

describe('TestPlansQueryEditor', () => {
    it('should render without crashing', () => {
        const { container } = render(<TestPlansQueryEditor {...defaultProps} />);
        expect(container).toBeInTheDocument(); // Ensure the component renders
    });

    it('should render an empty fragment', () => {
        render(<TestPlansQueryEditor {...defaultProps} />);
        expect(screen.queryByText(/./)).not.toBeInTheDocument(); // Ensure no text content is rendered
    });
});
