import React from 'react';
import { act, render, waitFor, screen } from '@testing-library/react';
import { TestPlansQueryEditor } from './TestPlansQueryEditor';
import { QueryEditorProps } from '@grafana/data';
import { TestPlansDataSource } from '../TestPlansDataSource';
import { OutputType, PropertiesProjectionMap, TestPlansQuery } from '../types';
import userEvent from '@testing-library/user-event';
import { select } from 'react-select-event';

const mockOnChange = jest.fn();
const mockOnRunQuery = jest.fn();
const mockDatasource = {
    prepareQuery: jest.fn((query: TestPlansQuery) => query),
    workspaces: {
        workspacesCache: Promise.resolve(new Map([
            ['1', { id: '1', name: 'WorkspaceName' }],
            ['2', { id: '2', name: 'AnotherWorkspaceName' }],
        ]))
    }
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
        await act(async () => {
            renderElement();
        });

        expect(screen.getByRole('radio', { name: OutputType.Properties })).toBeInTheDocument();
        expect(screen.getByRole('radio', { name: OutputType.Properties })).toBeChecked();
        expect(screen.getByRole('radio', { name: OutputType.TotalCount })).toBeInTheDocument();
        expect(screen.getByRole('radio', { name: OutputType.TotalCount })).not.toBeChecked();
        await waitFor(() => {
            const properties = screen.getAllByRole('combobox')[0];
            expect(properties).toBeInTheDocument();
            expect(properties).toHaveAttribute('aria-expanded', 'false');
            expect(properties).toHaveDisplayValue('');

            const orderBy = screen.getAllByRole('combobox')[1];
            expect(orderBy).toBeInTheDocument();
            expect(orderBy).toHaveAccessibleDescription('Select a field to set the query order');
            expect(orderBy).toHaveDisplayValue('');

            const descending = screen.getByRole('checkbox');
            expect(descending).toBeInTheDocument();
            expect(descending).not.toBeChecked();

            const recordCount = screen.getByRole('spinbutton');
            expect(recordCount).toBeInTheDocument();
            expect(recordCount).toHaveDisplayValue('');

            const queryBuilder = screen.getByRole('dialog');
            expect(queryBuilder).toBeInTheDocument();
        });
    });

    describe('when output type is properties', () => {
        let propertiesSelect: HTMLElement;

        beforeEach(async () => {
            const query = {
                refId: 'A',
                outputType: OutputType.Properties,
            };
            await act(async () => {
                renderElement(query);
            });
            propertiesSelect = screen.getAllByRole('combobox')[0];
        });

        it('should render properties select', async () => {
            expect(propertiesSelect).toBeInTheDocument();
            expect(propertiesSelect).toHaveAttribute('aria-expanded', 'false');
            expect(propertiesSelect).toHaveDisplayValue('');
        });

        it('should call onChange with properties when user selects properties', async () => {
            userEvent.click(propertiesSelect);
            await select(propertiesSelect, PropertiesProjectionMap.ASSIGNED_TO.label, { container: document.body });

            await waitFor(() => {
                expect(mockOnChange).toHaveBeenCalledWith(expect.objectContaining({ properties: ['ASSIGNED_TO'] }));
                expect(mockOnRunQuery).toHaveBeenCalled();
            });
        });

        it('only allows numbers in Take field', async () => {
            const recordCountInput = screen.getByRole('spinbutton');

            // User tries to enter a non-numeric value
            await userEvent.clear(recordCountInput);
            await userEvent.type(recordCountInput, 'abc');
            await waitFor(() => {
                expect(recordCountInput).toHaveValue(null);
            });

            // User enters a valid numeric value
            await userEvent.clear(recordCountInput);
            await userEvent.type(recordCountInput, '500');
            await waitFor(() => {
                expect(recordCountInput).toHaveValue(500);
            });
        });
    });

    describe('when output type is total count', () => {
        beforeEach(async () => {
            const query = {
                refId: 'A',
                outputType: OutputType.TotalCount,
            };

            await act(async () => {
                renderElement(query);
            });
        });

        it('should not render properties', async () => {
            await waitFor(() => {
                const properties = screen.queryByRole('combobox', { name: 'Properties' });
                expect(properties).not.toBeInTheDocument();
            });
        });

        it('should not render order by', async () => {
            await waitFor(() => {
                const orderBy = screen.queryByRole('combobox', { name: 'OrderBy' });
                expect(orderBy).not.toBeInTheDocument();
            });
        });

        it('should not render descending', async () => {
            await waitFor(() => {
                const descending = screen.queryByRole('checkbox', { name: 'Descending' });
                expect(descending).not.toBeInTheDocument();
            });
        });

        it('should not render record count', async () => {
            await waitFor(() => {
                const recordCount = screen.queryByRole('spinbutton', { name: 'Take' });
                expect(recordCount).not.toBeInTheDocument();
            });
        });
    });

    it('should not render properties when output type is total count', async () => {
        const query = {
            refId: 'A',
            outputType: OutputType.TotalCount,
        };
        await act(async () => {
            renderElement(query);
        });

        await waitFor(() => {
            const properties = screen.queryByRole('combobox', { name: 'Properties' });
            expect(properties).not.toBeInTheDocument();
        });
    });

    it('should render properties when output type is properties', async () => {
        const query = {
            refId: 'A',
            outputType: OutputType.Properties,
        };
        await act(async () => {
            renderElement(query);
        });

        await waitFor(() => {
            const properties = screen.getAllByRole('combobox')[0];
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
        await act(async () => {
            renderElement(query);
        });

        const propertiesSelect = screen.getAllByRole('combobox')[0];
        userEvent.click(propertiesSelect);
        await select(propertiesSelect, PropertiesProjectionMap.ASSIGNED_TO.label, { container: document.body });

        await waitFor(() => {
            expect(mockOnChange).toHaveBeenCalledWith(expect.objectContaining({ properties: ['ASSIGNED_TO'] }));
            expect(mockOnRunQuery).toHaveBeenCalled();
        });
    });

    it('should load workspaces and set them in state', async () => {
        await act(async () => {
            renderElement();
        });

        expect(mockDatasource.workspaces.workspacesCache).toBeDefined();
        await expect(mockDatasource.workspaces.workspacesCache).resolves.toEqual(
            new Map([
                ['1', { id: '1', name: 'WorkspaceName' }],
                ['2', { id: '2', name: 'AnotherWorkspaceName' }],
            ])
        );
    });

    describe('onChange', () => {
        it('should call onChange with properties output type when switching from total count', async () => {
            const query = {
                refId: 'A',
                outputType: OutputType.TotalCount
            };
            await act(async () => {
                renderElement(query);
            });

            const propertiesRadio = screen.getByRole('radio', { name: OutputType.Properties });
            userEvent.click(propertiesRadio);

            await waitFor(() => {
                expect(mockOnChange).toHaveBeenCalledWith(expect.objectContaining({ outputType: OutputType.Properties }));
                expect(mockOnRunQuery).toHaveBeenCalled();
            });
        });

        it('should call onChange with total count output type when switching from properties', async () => {
            await act(async () => {
                renderElement();
            });

            const totalCountRadio = screen.getByRole('radio', { name: OutputType.TotalCount });
            userEvent.click(totalCountRadio);

            await waitFor(() => {
                expect(mockOnChange).toHaveBeenCalledWith(expect.objectContaining({ outputType: OutputType.TotalCount }));
                expect(mockOnRunQuery).toHaveBeenCalled();
            });
        });

        it('should call onChange with order by when user selects order by', async () => {
            await act(async () => {
                renderElement();
            });
            const orderBySelect = screen.getAllByRole('combobox')[1];

            userEvent.click(orderBySelect);
            await select(orderBySelect, 'ID', { container: document.body });

            await waitFor(() => {
                expect(mockOnChange).toHaveBeenCalledWith(expect.objectContaining({ orderBy: 'ID' }));
                expect(mockOnRunQuery).toHaveBeenCalled();
            });
        });

        it('should call onChange with descending when user toggles descending', async () => {
            await act(async () => {
                renderElement();
            });
            const descendingCheckbox = screen.getByRole('checkbox');

            userEvent.click(descendingCheckbox);

            await waitFor(() => {
                expect(mockOnChange).toHaveBeenCalledWith(expect.objectContaining({ descending: true }));
                expect(mockOnRunQuery).toHaveBeenCalled();
            });
        });

        it('should call onChange with record count when user enters record count', async () => {
            await act(async () => {
                renderElement();
            });
            const recordCountInput = screen.getByRole('spinbutton');

            await userEvent.clear(recordCountInput);
            await userEvent.type(recordCountInput, '50');
            userEvent.tab(); // Trigger onCommitChange

            await waitFor(() => {
                expect(mockOnChange).toHaveBeenCalledWith(expect.objectContaining({ recordCount: 50 }));
                expect(mockOnRunQuery).toHaveBeenCalled();
            });
        });

        it('should call onChange when query by changes', async () => {
            await act(async () => {
                renderElement();
            });

            const queryBuilder = screen.getByRole('dialog');
            expect(queryBuilder).toBeInTheDocument();

            // Simulate a change event
            const event = { detail: { linq: 'new-query' } };
            queryBuilder?.dispatchEvent(new CustomEvent('change', event));

            await waitFor(() => {
                expect(mockOnChange).toHaveBeenCalledWith(expect.objectContaining({ queryBy: 'new-query' }));
                expect(mockOnRunQuery).toHaveBeenCalled();
            });
        });

        it('should show error message when record count is invalid', async () => {
            await act(async () => {
                renderElement();
            });
            const recordCountInput = screen.getByRole('spinbutton');

            await userEvent.clear(recordCountInput);
            await userEvent.type(recordCountInput, '10001');
            userEvent.tab();

            await waitFor(() => {
                expect(screen.queryByText('Record count must be less than 10000')).toBeInTheDocument();
            });
        });
    });
});
