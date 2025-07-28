import React from 'react';
import { act, render, RenderResult, screen, waitFor } from '@testing-library/react';
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
    globalVariableOptions: jest.fn(() => []),
    loadWorkspaces: jest.fn().mockResolvedValue(
        new Map([
            ['1', { id: '1', name: 'WorkspaceName' }],
            ['2', { id: '2', name: 'AnotherWorkspaceName' }],
        ])
    ),
    loadSystemAliases: jest.fn().mockResolvedValue(
        new Map([
            ['1', { id: '1', alias: 'System 1' }],
            ['2', { id: '2', alias: 'System 2' }],
        ])
    ),
    loadUsers: jest.fn().mockResolvedValue(
        new Map([
            ['1', { id: '1', firstName: 'User', lastName: '1' }],
            ['2', { id: '2', firstName: 'User', lastName: '2' }],
        ])
    ),
    loadProductNamesAndPartNumbers: jest.fn().mockResolvedValue(
        new Map([
            ['part-number-1', { id: '1', partNumber: 'part-number-1', name: 'Product 1' }],
            ['part-number-2', { id: '2', partNumber: 'part-number-2', name: 'Product 2' }]
        ])
    )
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

    async function renderElement(query: TestPlansQuery = { refId: 'A', outputType: OutputType.Properties }) {
        return await act(async () => {
            const reactNode = React.createElement(TestPlansQueryEditor, { ...defaultProps, query });
            return render(reactNode);
        });
    }

    it('should render default query', async () => {
        const container = await renderElement();

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

            const descending = container.getByRole('switch');
            expect(descending).toBeInTheDocument();
            expect(descending).not.toBeChecked();

            const recordCount = container.getByRole('spinbutton');
            expect(recordCount).toBeInTheDocument();
            expect(recordCount).toHaveDisplayValue('');

            const queryBuilder = container.getByRole('dialog');
            expect(queryBuilder).toBeInTheDocument();
        });
    });

    it('should call onRunQuery on init', async() => {
    const query = {
        refId: 'A',
    }

    await renderElement(query);

    expect(mockOnChange).toHaveBeenCalledWith(expect.objectContaining({ outputType: OutputType.Properties, refId: 'A' }));
    expect(mockOnRunQuery).toHaveBeenCalled();
    });
    
    it('should not call onRunQuery after init', async() => {
    const query = {
        refId: 'A',
        outputType: OutputType.Properties,
    }
    jest.clearAllMocks();

    await renderElement(query);

    expect(mockOnChange).not.toHaveBeenCalled();
    expect(mockOnRunQuery).not.toHaveBeenCalled();
    });

    describe('when output type is properties', () => {
        let container: RenderResult;
        let propertiesSelect: HTMLElement;

        beforeEach(async () => {
            const query = {
                refId: 'A',
                outputType: OutputType.Properties,
            };
            container = await renderElement(query);
            propertiesSelect = container.getAllByRole('combobox')[0];
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
            const recordCountInput = container.getByRole('spinbutton');

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
        let container: RenderResult;

        beforeEach(async () => {
            const query = {
                refId: 'A',
                outputType: OutputType.TotalCount,
            };
            container = await renderElement(query);
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

        it('should not render record count', async () => {
            await waitFor(() => {
                const recordCount = container.queryByRole('spinbutton', { name: 'Take' });
                expect(recordCount).not.toBeInTheDocument();
            });
        });
    });

    it('should not render properties when output type is total count', async () => {
        const query = {
            refId: 'A',
            outputType: OutputType.TotalCount,
        };
        const container = await renderElement(query);

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
        const container = await renderElement(query);

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
        const container = await renderElement(query);

        const propertiesSelect = container.getAllByRole('combobox')[0];
        userEvent.click(propertiesSelect);
        await select(propertiesSelect, PropertiesProjectionMap.ASSIGNED_TO.label, { container: document.body });

        await waitFor(() => {
            expect(mockOnChange).toHaveBeenCalledWith(expect.objectContaining({ properties: ['ASSIGNED_TO'] }));
            expect(mockOnRunQuery).toHaveBeenCalled();
        });
    });

    it('should load workspaces and set them in state', async () => {
        await renderElement();

        const workspaces = await mockDatasource.loadWorkspaces();
        expect(workspaces).toBeDefined();
        expect(workspaces).toEqual(
            new Map([
                ['1', { id: '1', name: 'WorkspaceName' }],
                ['2', { id: '2', name: 'AnotherWorkspaceName' }],
            ])
        );
    });

    it('should load system names', async () => {
        await renderElement();
        const result = await mockDatasource.loadSystemAliases();
        expect(result).toBeDefined();
        expect(result).toEqual(
            new Map([
                ['1', { id: '1', alias: 'System 1' }],
                ['2', { id: '2', alias: 'System 2' }],
            ])
        );
    });

    it('should load users', async () => {
        renderElement();

        const users = await mockDatasource.loadUsers();
        expect(users).toBeDefined();
        expect(users).toEqual(
            new Map([
                ['1', { id: '1', firstName: 'User', lastName: '1' }],
                ['2', { id: '2', firstName: 'User', lastName: '2' }]
            ])
        );
    });

    it('should load part numbers and product names', async () => {
        await act(async () => {
            renderElement();
        });

        const result = await mockDatasource.loadProductNamesAndPartNumbers();
        expect(result).toBeDefined();
        expect(result).toEqual(
            new Map([
                ['part-number-1', { id: '1', partNumber: 'part-number-1', name: 'Product 1' }],
                ['part-number-2', { id: '2', partNumber: 'part-number-2', name: 'Product 2' }]
            ])
        );
        
    });

    describe('onChange', () => {
        it('should call onChange with properties output type when switching from total count', async () => {
            const query = {
                refId: 'A',
                outputType: OutputType.TotalCount
            };
            const container = await renderElement(query);

            const propertiesRadio = container.getByRole('radio', { name: OutputType.Properties });
            userEvent.click(propertiesRadio);

            await waitFor(() => {
                expect(mockOnChange).toHaveBeenCalledWith(expect.objectContaining({ outputType: OutputType.Properties }));
                expect(mockOnRunQuery).toHaveBeenCalled();
            });
        });

        it('should call onChange with total count output type when switching from properties', async () => {
            const container = await renderElement();

            const totalCountRadio = container.getByRole('radio', { name: OutputType.TotalCount });
            userEvent.click(totalCountRadio);

            await waitFor(() => {
                expect(mockOnChange).toHaveBeenCalledWith(expect.objectContaining({ outputType: OutputType.TotalCount }));
                expect(mockOnRunQuery).toHaveBeenCalled();
            });
        });

        it('should show error when all properties are removed', async () => {
            const container = await renderElement();
      
            const properties = container.getAllByRole('combobox')[0];
            // User adds a property
            await select(properties, "Workspace", { container: document.body });
            await waitFor(() => {
              expect(mockOnChange).toHaveBeenCalledWith(
                expect.objectContaining({ properties: ["WORKSPACE"] })
              )
            });
      
            // User removes the property
            const removeButton = screen.getByRole('button', { name: 'Remove' });
            await userEvent.click(removeButton);
      
            expect(screen.getByText('You must select at least one property.')).toBeInTheDocument();
        })

        it('should call onChange with order by when user selects order by', async () => {
            const container = await renderElement();
            const orderBySelect = container.getAllByRole('combobox')[1];

            userEvent.click(orderBySelect);
            await select(orderBySelect, 'ID', { container: document.body });

            await waitFor(() => {
                expect(mockOnChange).toHaveBeenCalledWith(expect.objectContaining({ orderBy: 'ID' }));
                expect(mockOnRunQuery).toHaveBeenCalled();
            });
        });

        it('should call onChange with descending when user toggles descending', async () => {
            const container = await renderElement();
            const descendingCheckbox = container.getByRole('switch');

            userEvent.click(descendingCheckbox);

            await waitFor(() => {
                expect(mockOnChange).toHaveBeenCalledWith(expect.objectContaining({ descending: true }));
                expect(mockOnRunQuery).toHaveBeenCalled();
            });
        });

        it('should call onChange with record count when user enters record count', async () => {
            const container = await renderElement();
            const recordCountInput = container.getByRole('spinbutton');

            await userEvent.clear(recordCountInput);
            await userEvent.type(recordCountInput, '50');
            userEvent.tab(); // Trigger onCommitChange

            await waitFor(() => {
                expect(mockOnChange).toHaveBeenCalledWith(expect.objectContaining({ recordCount: 50 }));
                expect(mockOnRunQuery).toHaveBeenCalled();
            });
        });

        it('should call onChange when query by changes', async () => {
            const container = await renderElement();

            const queryBuilder = container.getByRole('dialog');
            expect(queryBuilder).toBeInTheDocument();

            // Simulate a change event
            const event = { detail: { linq: 'new-query' } };
            queryBuilder?.dispatchEvent(new CustomEvent('change', event));

            await waitFor(() => {
                expect(mockOnChange).toHaveBeenCalledWith(expect.objectContaining({ queryBy: 'new-query' }));
                expect(mockOnRunQuery).toHaveBeenCalled();
            });
        });

        it('should show error message when when user changes take to number greater than max take', async () => {
            const container = await renderElement();
            const takeInput = container.getByRole('spinbutton');
            mockOnChange.mockClear();
            mockOnRunQuery.mockClear();

            await userEvent.clear(takeInput);
            await userEvent.type(takeInput, '1000000');
            await userEvent.tab();

            await waitFor(() => {
                expect(container.getByText('Enter a value less than or equal to 10,000')).toBeInTheDocument();
                expect(mockOnChange).toHaveBeenCalledWith(expect.objectContaining({ recordCount: undefined }));
                expect(mockOnRunQuery).toHaveBeenCalled();
            });
        });

        it('should show error message when when user changes take to number less than min take', async () => {
            const container = await renderElement();
            const takeInput = container.getByRole('spinbutton');
            mockOnChange.mockClear();
            mockOnRunQuery.mockClear();

            await userEvent.clear(takeInput);
            await userEvent.tab();

            await waitFor(() => {
                expect(container.getByText('Enter a value greater than or equal to 0')).toBeInTheDocument();
                expect(mockOnChange).toHaveBeenCalledWith(expect.objectContaining({ recordCount: undefined }));
                expect(mockOnRunQuery).toHaveBeenCalled();
            });
        });

        it('should not show error message when when user changes take to number between min and max take', async () => {
            const container = await renderElement();
            const takeInput = container.getByRole('spinbutton');

            // User enters a value greater than max take
            await userEvent.clear(takeInput);
            await userEvent.type(takeInput, '1000000');
            await userEvent.tab();
            await waitFor(() => {
                expect(container.getByText('Enter a value less than or equal to 10,000')).toBeInTheDocument();
            });

            // User enters a valid value
            await userEvent.clear(takeInput);
            await userEvent.type(takeInput, '100');
            await userEvent.tab();

            await waitFor(() => {
                expect(container.queryByText('Enter a value greater than or equal to 0')).not.toBeInTheDocument();
                expect(container.queryByText('Enter a value less than or equal to 10,000')).not.toBeInTheDocument();
            });
        });
    });
});
