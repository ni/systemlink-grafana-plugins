import React from 'react';
import { render, RenderResult, waitFor } from '@testing-library/react';
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

            const orderBy = container.getAllByRole('combobox')[1];
            expect(orderBy).toBeInTheDocument();
            expect(orderBy).toHaveAccessibleDescription('Select a field to set the query order');
            expect(orderBy).toHaveDisplayValue('');

            const descending = container.getByRole('checkbox');
            expect(descending).toBeInTheDocument();
            expect(descending).not.toBeChecked();
        });
    });

    describe('when output type is properties', () => {
        let propertiesSelect: HTMLElement;

        beforeEach(() => {
            const query = {
                refId: 'A',
                outputType: OutputType.Properties,
            };
            const container = renderElement(query);
            propertiesSelect = container.getAllByRole('combobox')[0];
        });

        it('should render properties select', async () => {
            expect(propertiesSelect).toBeInTheDocument();
            expect(propertiesSelect).toHaveAttribute('aria-expanded', 'false');
            expect(propertiesSelect).toHaveDisplayValue('');
        });

        it('should call onChange with properties when user selects properties', async () => {
            userEvent.click(propertiesSelect);
            await select(propertiesSelect, Properties.assignedTo, { container: document.body });

            await waitFor(() => {
                expect(mockOnChange).toHaveBeenCalledWith(expect.objectContaining({ properties: ['assignedTo'] }));
                expect(mockOnRunQuery).toHaveBeenCalled();
            });
        });
    });

    describe('when output type is total count', () => {
        let container: RenderResult;

        beforeEach(() => {
            const query = {
                refId: 'A',
                outputType: OutputType.TotalCount,
            };
            container = renderElement(query);
        });

        it('should not render properties', async () => {
            await waitFor(() => {
                const properties = container.queryByRole('combobox', { name: 'Properties' });
                expect(properties).not.toBeInTheDocument();
            });
        });

        it('should not render order by', async () => {
            await waitFor(() => {
                const orderBy = container.queryByRole('combobox', { name: 'OrderBy' });
                expect(orderBy).not.toBeInTheDocument();
            });
        });

        it('should not render descending', async () => {
            await waitFor(() => {
                const descending = container.queryByRole('checkbox', { name: 'Descending' });
                expect(descending).not.toBeInTheDocument();
            });
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

        it('should call onChange with order by when user selects order by', async () => {
            const container = renderElement();
            const orderBySelect = container.getAllByRole('combobox')[1];

            userEvent.click(orderBySelect);
            await select(orderBySelect, 'ID', { container: document.body });

            await waitFor(() => {
                expect(mockOnChange).toHaveBeenCalledWith(expect.objectContaining({ orderBy: 'ID' }));
                expect(mockOnRunQuery).toHaveBeenCalled();
            });
        });

        it('should call onChange with descending when user toggles descending', async () => {
            const container = renderElement();
            const descendingCheckbox = container.getByRole('checkbox');

            userEvent.click(descendingCheckbox);

            await waitFor(() => {
                expect(mockOnChange).toHaveBeenCalledWith(expect.objectContaining({ descending: true }));
                expect(mockOnRunQuery).toHaveBeenCalled();
            });
        });
    });
});
