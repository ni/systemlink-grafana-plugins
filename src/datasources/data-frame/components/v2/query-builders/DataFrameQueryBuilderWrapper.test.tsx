import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import { DataFrameQueryBuilderWrapper } from './DataFrameQueryBuilderWrapper';
import { DataFrameDataSource } from 'datasources/data-frame/DataFrameDataSource';
import { Workspace, QueryBuilderOption } from 'core/types';
import { DataSourceQBLookupCallback } from 'datasources/data-frame/types';
import userEvent from '@testing-library/user-event';
import { ColumnsQueryBuilder } from './columns-query-builder/ColumnsQueryBuilder';
import { ResultsQueryBuilder } from 'shared/components/ResultsQueryBuilder/ResultsQueryBuilder';

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
   ColumnsQueryBuilder: jest.fn(() => <div data-testid="mock-columns-query-builder" />)
}));

jest.mock("shared/components/ResultsQueryBuilder/ResultsQueryBuilder", () => ({
   ResultsQueryBuilder: jest.fn(() => <div data-testid="mock-results-query-builder" />)
}));

const renderComponent = (
    resultsFilter = '',
    dataTableFilter = '',
    columnsFilter = '',
    queryByResultAndColumnProperties = true
) => {
    const onResultsFilterChange = jest.fn();
    const onDataTableFilterChange = jest.fn();
    const onColumnsFilterChange = jest.fn();
    const datasource = {
        loadWorkspaces: jest.fn().mockResolvedValue(
            new Map([
                ['1', { id: '1', name: 'WorkspaceName', default: false, enabled: true }],
                ['2', { id: '2', name: 'AnotherWorkspaceName', default: false, enabled: true }],
            ])
        ),
        loadPartNumbers: jest.fn().mockResolvedValue(['PN-001', 'PN-002', 'PN-003']),
        globalVariableOptions: jest.fn().mockReturnValue(
            [
                { label: 'Var1', value: 'Value1' },
                { label: 'Var2', value: 'Value2' },
            ]
        ),
        queryTables: jest.fn().mockResolvedValue(
            [
                { id: 'table1', name: 'Table 1', columns: [{ name: 'ColumnA' }, { name: 'ColumnB' }] },
                { id: 'table2', name: 'Table 2', columns: [{ name: 'ColumnD' }, { name: 'ColumnE' }] },
            ]
        ),
        instanceSettings: {
            jsonData: { featureToggles: { queryByResultAndColumnProperties } },
        },
    } as unknown as DataFrameDataSource;

    const renderResult = render(
        <DataFrameQueryBuilderWrapper
            datasource={datasource}
            resultsFilter={resultsFilter}
            dataTableFilter={dataTableFilter}
            columnsFilter={columnsFilter}
            onResultsFilterChange={onResultsFilterChange}
            onDataTableFilterChange={onDataTableFilterChange}
            onColumnsFilterChange={onColumnsFilterChange}
        />
    );

    onDataTableFilterChange.mockImplementation((event) => {
        renderResult.rerender(
            <DataFrameQueryBuilderWrapper
                datasource={datasource}
                resultsFilter={resultsFilter}
                dataTableFilter={event.detail.linq}
                columnsFilter={columnsFilter}
                onResultsFilterChange={onResultsFilterChange}
                onDataTableFilterChange={onDataTableFilterChange}
                onColumnsFilterChange={onColumnsFilterChange}
            />
        );
    });

    return { renderResult, onResultsFilterChange, onDataTableFilterChange, onColumnsFilterChange, datasource };
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
            renderComponent('', 'test filter');

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
                expect(screen.getByTestId('mock-columns-query-builder')).toBeInTheDocument();
            });
        });

        it('should pass the filter to the ColumnsQueryBuilder component', async () => {
            renderComponent('', '', 'column filter');

            expect(screen.getByTestId('mock-columns-query-builder')).toBeInTheDocument();
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
            renderComponent('', '', '', false);

            await waitFor(() => {
                expect(screen.queryByTestId('mock-columns-query-builder')).not.toBeInTheDocument();
            });
        });
    });

    describe('ResultsQueryBuilder', () => {
        it('should show the ResultsQueryBuilder component', async () => {
            renderComponent();

            await waitFor(() => {
                expect(screen.getByTestId('mock-results-query-builder')).toBeInTheDocument();
            });
        });

        it('should pass the filter to the ResultsQueryBuilder component', async () => {
            renderComponent('results filter');

            expect(screen.getByTestId('mock-results-query-builder')).toBeInTheDocument();
            expect(ResultsQueryBuilder).toHaveBeenCalledWith(
                expect.objectContaining({
                    filter: 'results filter',
                }),
                {}
            );
        });

        it('should pass workspaces to the ResultsQueryBuilder component', async () => {
            renderComponent();

            await waitFor(() => {
                expect(ResultsQueryBuilder).toHaveBeenCalledWith(
                    expect.objectContaining({
                        workspaces: expect.arrayContaining([
                            expect.objectContaining({ name: 'WorkspaceName' }),
                            expect.objectContaining({ name: 'AnotherWorkspaceName' }),
                        ]),
                    }),
                    {}
                );
            });
        });

        it('should pass part numbers to the ResultsQueryBuilder component', async () => {
            renderComponent();

            await waitFor(() => {
                expect(ResultsQueryBuilder).toHaveBeenCalledWith(
                    expect.objectContaining({
                        partNumbers: ['PN-001', 'PN-002', 'PN-003'],
                    }),
                    {}
                );
            });
        });

        it('should pass status options to the ResultsQueryBuilder component', async () => {
            renderComponent();

            await waitFor(() => {
                expect(ResultsQueryBuilder).toHaveBeenCalledWith(
                    expect.objectContaining({
                        status: expect.arrayContaining([
                            'Done',
                            'Errored',
                            'Failed',
                            'Passed',
                            'Skipped',
                            'Terminated',
                            'Timed out',
                            'Custom',
                            'Looping',
                            'Running',
                            'Waiting',
                        ]),
                    }),
                    {}
                );
            });
        });

        it('should pass global variable options to the ResultsQueryBuilder component', async () => {
            renderComponent();

            await waitFor(() => {
                expect(ResultsQueryBuilder).toHaveBeenCalledWith(
                    expect.objectContaining({
                        globalVariableOptions: [
                            { label: 'Var1', value: 'Value1' },
                            { label: 'Var2', value: 'Value2' },
                        ],
                    }),
                    {}
                );
            });
        });

        it('should call onResultsFilterChange when the results filter is changed in the ResultsQueryBuilder component', async () => {
           const { onResultsFilterChange } = renderComponent();
           const [[props]] = (ResultsQueryBuilder as jest.Mock).mock.calls;

           // Simulate a change event
           const eventDetail = { linq: 'new results filter' };
           await props.onChange({ detail: eventDetail });

           await waitFor(() => {
               expect(onResultsFilterChange).toHaveBeenCalledWith({ detail: eventDetail });
           });
        });

        it('should call loadPartNumbers from datasource', async () => {
            const { datasource } = renderComponent();

            await waitFor(() => {
                expect(datasource.loadPartNumbers).toHaveBeenCalled();
            });
        });

        it('should not render the ResultsQueryBuilder when feature flag is false', async () => {
            renderComponent('', '', '', false);

            await waitFor(() => {
                expect(screen.queryByTestId('mock-results-query-builder')).not.toBeInTheDocument();
            });
        });
    });
});
