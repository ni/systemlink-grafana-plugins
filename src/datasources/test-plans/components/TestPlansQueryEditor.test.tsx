import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { TestPlansQueryEditor } from './TestPlansQueryEditor';
import { QueryEditorProps } from '@grafana/data';
import { TestPlansDataSource } from '../TestPlansDataSource';
import { OutputType, Properties, TestPlansQuery } from '../types';
import userEvent from '@testing-library/user-event';
import { select } from 'react-select-event';

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

    it('should render default query', async () => {
        const container = renderElement();

        expect(container.getByRole('radio', { name: OutputType.Properties })).toBeInTheDocument();
        expect(container.getByRole('radio', { name: OutputType.Properties })).toBeChecked();
        expect(container.getByRole('radio', { name: OutputType.TotalCount })).toBeInTheDocument();
        expect(container.getByRole('radio', { name: OutputType.TotalCount })).not.toBeChecked();
        await waitFor(() => {
            const properties = container.getAllByRole('combobox')[0];
            expect(properties).toBeInTheDocument();
            expect(properties).toHaveAttribute('aria-expanded', 'false');
            expect(properties).toHaveDisplayValue('');
        });
    });

    it('should not render properties when output type is total count', async () => {
        const query = {
            refId: 'A',
            outputType: OutputType.TotalCount,
        };
        const container = renderElement(query);

        await waitFor(() => {
            const properties = container.queryByRole('combobox', { name: 'Properties' });
            expect(properties).not.toBeInTheDocument();
        });
    });

    it('should render properties when output type is properties', async () => {
        const query = {
            refId: 'A',
            outputType: OutputType.Properties,
        };
        const container = renderElement(query);

        await waitFor(() => {
            const properties = container.getAllByRole('combobox')[0];
            expect(properties).toBeInTheDocument();
            expect(properties).toHaveAttribute('aria-expanded', 'false');
            expect(properties).toHaveDisplayValue('');
        });
    });

    it('should call onChange with properties when user selects properties', async () => {
        const query = {
            refId: 'A',
            outputType: OutputType.Properties,
        };
        const container = renderElement(query);

        const propertiesSelect = container.getAllByRole('combobox')[0];
        userEvent.click(propertiesSelect);
        await select(propertiesSelect, Properties.assignedTo, { container: document.body });

        await waitFor(() => {
            expect(mockOnChange).toHaveBeenCalledWith(expect.objectContaining({ properties: ['assignedTo'] }));
            expect(mockOnRunQuery).toHaveBeenCalled();
        });
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
