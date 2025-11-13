import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import { DataFrameQueryBuilderWrapper } from './DataFrameQueryBuilderWrapper';
import { DataFrameDataSource } from 'datasources/data-frame/DataFrameDataSource';
import { Workspace, QueryBuilderOption } from 'core/types';
import { DataSourceQBLookupCallback } from 'datasources/data-frame/types';
import userEvent from '@testing-library/user-event';
import { ColumnsQueryBuilder } from './columns-query-builder/ColumnsQueryBuilder';
import { of } from 'rxjs';

jest.mock("datasources/data-frame/components/v2/query-builders/data-table-query-builder/DataTableQueryBuilder", () => ({
    DataTableQueryBuilder: (
        props: {
            filter?: string;
            workspaces?: Workspace[];
            globalVariableOptions: QueryBuilderOption[];
            dataTableNameLookupCallback: DataSourceQBLookupCallback;
            onChange: (event: { detail: { linq: string; }; }) => void;
        }
    ) => {
        const [options, setOptions] = React.useState<QueryBuilderOption[]>([]);

        React.useEffect(() => {
            const loadOptions = async () => {
                const result = await props.dataTableNameLookupCallback("test");
                setOptions(result);
            };

            loadOptions();
        }, [props]);

        return (
            <div data-testid="data-table-query-builder">
                <input
                    type="text"
                    data-testid="filter-input"
                    value={props.filter}
                    onChange={(e) => props.onChange({ detail: { linq: e.target.value } })}
                />
                <ul data-testid="workspaces-list">
                    {props.workspaces?.map(workspace => (
                        <li key={workspace.id}>{workspace.name}</li>
                    ))}
                </ul>
                <ul data-testid="global-variable-options-list">
                    {props.globalVariableOptions?.map(option => (
                        <li key={option.label}>{`${option.label}:${option.value}`}</li>
                    ))}
                </ul>
                <ul data-testid="data-table-name-options-list">
                    {options.map(option => (
                        <li key={option.value}>{`${option.label}:${option.value}`}</li>
                    ))}
                </ul>
            </div>
        );
    }
}));

jest.mock("datasources/data-frame/components/v2/query-builders/columns-query-builder/ColumnsQueryBuilder", () => ({
   ColumnsQueryBuilder: jest.fn(() => <div data-testid="mock-data-frame-query-builder-wrapper" />)
}));

const renderComponent = (
    dataTableFilter = '',
    columnsFilter = '',
    queryByResultAndColumnProperties = true
) => {
    const onDataTableFilterChange = jest.fn();
    const onColumnsFilterChange = jest.fn();
    const datasource = {
        loadWorkspaces: jest.fn().mockResolvedValue(
            new Map([
                ['1', { id: '1', name: 'WorkspaceName', default: false, enabled: true }],
                ['2', { id: '2', name: 'AnotherWorkspaceName', default: false, enabled: true }],
            ])
        ),
        globalVariableOptions: jest.fn().mockReturnValue(
            [
                { label: 'Var1', value: 'Value1' },
                { label: 'Var2', value: 'Value2' },
            ]
        ),
        queryTables$: jest.fn().mockReturnValue(
            of([
                { id: 'table1', name: 'Table 1', columns: [{ name: 'ColumnA' }, { name: 'ColumnB' }] },
                { id: 'table2', name: 'Table 2', columns: [{ name: 'ColumnD' }, { name: 'ColumnE' }] },
            ])
        ),
        instanceSettings: {
            jsonData: { featureToggles: { queryByResultAndColumnProperties } },
        },
    } as unknown as DataFrameDataSource;

    const renderResult = render(
        <DataFrameQueryBuilderWrapper
            datasource={datasource}
            dataTableFilter={dataTableFilter}
            columnsFilter={columnsFilter}
            onDataTableFilterChange={onDataTableFilterChange}
            onColumnsFilterChange={onColumnsFilterChange}
        />
    );

    onDataTableFilterChange.mockImplementation((event) => {
        renderResult.rerender(
            <DataFrameQueryBuilderWrapper
                datasource={datasource}
                dataTableFilter={event.detail.linq}
                columnsFilter={columnsFilter}
                onDataTableFilterChange={onDataTableFilterChange}
                onColumnsFilterChange={onColumnsFilterChange}
            />
        );
    });

    return { renderResult, onDataTableFilterChange, onColumnsFilterChange };
};

describe('DataFrameQueryBuilderWrapper', () => {
    describe('DataTableQueryBuilder', () => {
        it('should show the DataTableQueryBuilder component', async () => {
            renderComponent();

            await waitFor(() => {
                expect(screen.getByTestId('data-table-query-builder')).toBeInTheDocument();
            });
        });

        it('should pass the filter to the DataTableQueryBuilder component', async () => {
            renderComponent('test filter');

            await waitFor(() => {
                const filterInput = screen.getByTestId('filter-input');
                expect(filterInput).toHaveValue('test filter');
            });
        });

        it('should pass the workspaces to the DataTableQueryBuilder component', async () => {
            renderComponent();

            await waitFor(() => {
                const workspacesList = screen.getByTestId('workspaces-list');
                expect(workspacesList).toBeInTheDocument();
                expect(within(workspacesList).getByText('WorkspaceName')).toBeInTheDocument();
                expect(within(workspacesList).getByText('AnotherWorkspaceName')).toBeInTheDocument();
            });
        });

        it('should pass the global variable options to the DataTableQueryBuilder component', async () => {
            renderComponent();

            await waitFor(() => {
                const optionsList = screen.getByTestId('global-variable-options-list');
                expect(optionsList).toBeInTheDocument();
                expect(within(optionsList).getByText('Var1:Value1')).toBeInTheDocument();
                expect(within(optionsList).getByText('Var2:Value2')).toBeInTheDocument();
            });
        });

        it('should pass the dataTableNameLookupCallback to the DataTableQueryBuilder component', async () => {
            renderComponent();

            await waitFor(() => {
                const optionsList = screen.getByTestId('data-table-name-options-list');
                expect(optionsList).toBeInTheDocument();
                expect(within(optionsList).getByText('Table 1:Table 1')).toBeInTheDocument();
                expect(within(optionsList).getByText('Table 2:Table 2')).toBeInTheDocument();
            });
        });

        it('should call onDataTableFilterChange when the data table filter is changed in the DataTableQueryBuilder component', async () => {
            const { onDataTableFilterChange } = renderComponent('');
            const filterInput = screen.getByTestId('filter-input');
            const user = userEvent.setup();

            await user.clear(filterInput);
            await user.type(filterInput, 'new filter');

            await waitFor(() => {
                expect(onDataTableFilterChange).toHaveBeenCalledWith({ detail: { linq: 'new filter' } });
            });
        });
    });

    describe('ColumnsQueryBuilder', () => {
        it('should show the ColumnsQueryBuilder component', async () => {
            renderComponent();

            await waitFor(() => {
                expect(screen.getByTestId('mock-data-frame-query-builder-wrapper')).toBeInTheDocument();
            });
        });

        it('should pass the filter to the ColumnsQueryBuilder component', async () => {
            renderComponent('', 'column filter');

            expect(screen.getByTestId('mock-data-frame-query-builder-wrapper')).toBeInTheDocument();
            expect(ColumnsQueryBuilder).toHaveBeenCalledWith(
                expect.objectContaining({
                    filter: 'column filter',
                }),
                {}
            );
        });

        it('should call onColumnsFilterChange when the columns filter is changed in the ColumnsQueryBuilder component', async () => {
           const { onColumnsFilterChange } = renderComponent();
           const [[props]] = (ColumnsQueryBuilder as jest.Mock).mock.calls;

           // Simulate a change event
           const eventDetail = { linq: 'new column filter' };
           await props.onChange({ detail: eventDetail });

           await waitFor(() => {
               expect(onColumnsFilterChange).toHaveBeenCalledWith({ detail: eventDetail });
           });
        });

        it('should not render the ColumnsQueryBuilder when feature flag is false', async () => {
            renderComponent('', '', false);

            await waitFor(() => {
                expect(screen.queryByTestId('mock-data-frame-query-builder-wrapper')).not.toBeInTheDocument();
            });
        });
    });
});
