import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { TestPlansQueryEditor } from './TestPlansQueryEditor';
import { QueryEditorProps } from '@grafana/data';
import { TestPlansDataSource } from '../TestPlansDataSource';
import { OutputType, TestPlansQuery } from '../types';
import userEvent from '@testing-library/user-event';

const mockOnChange = jest.fn();
const mockOnRunQuery = jest.fn();
const mockDatasource = {
    prepareQuery: jest.fn((query: TestPlansQuery) => query),
} as unknown as TestPlansDataSource;

const defaultProps: QueryEditorProps<TestPlansDataSource, TestPlansQuery> = {
    query: {
        refId: 'A',
        outputType: OutputType.Properties,
    },
    onChange: mockOnChange,
    onRunQuery: mockOnRunQuery,
    datasource: mockDatasource,
};

describe('TestPlansQueryEditor', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    function renderElement(query: TestPlansQuery = { refId: 'A', outputType: OutputType.Properties }) {
        const reactNode = React.createElement(TestPlansQueryEditor, { ...defaultProps, query });
        return render(reactNode);
    }

    it('should render default query', () => {
        const container = renderElement();

        expect(container.getByRole('radio', { name: OutputType.Properties })).toBeInTheDocument();
        expect(container.getByRole('radio', { name: OutputType.Properties })).toBeChecked();
        expect(container.getByRole('radio', { name: OutputType.TotalCount })).toBeInTheDocument();
        expect(container.getByRole('radio', { name: OutputType.TotalCount })).not.toBeChecked();
    });

    describe('onChange', () => {
        it('should call onChange with properties output type when switching from total count', async () => {
            const query = {
                refId: 'A',
                outputType: OutputType.TotalCount
            };
            const container = renderElement(query);

            const propertiesRadio = container.getByRole('radio', { name: OutputType.Properties });
            userEvent.click(propertiesRadio);

            await waitFor(() => {
                expect(mockOnChange).toHaveBeenCalledWith(expect.objectContaining({ outputType: OutputType.Properties }));
                expect(mockOnRunQuery).toHaveBeenCalled();
            });
        });

        it('should call onChange with total count output type when switching from properties', async () => {
            const container = renderElement();

            const totalCountRadio = container.getByRole('radio', { name: OutputType.TotalCount });
            userEvent.click(totalCountRadio);

            await waitFor(() => {
                expect(mockOnChange).toHaveBeenCalledWith(expect.objectContaining({ outputType: OutputType.TotalCount }));
                expect(mockOnRunQuery).toHaveBeenCalled();
            });
        });
    });
});
