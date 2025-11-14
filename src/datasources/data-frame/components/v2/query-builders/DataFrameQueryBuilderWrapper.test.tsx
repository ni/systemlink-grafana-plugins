import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import { DataFrameQueryBuilderWrapper } from './DataFrameQueryBuilderWrapper';
import { DataFrameDataSource } from 'datasources/data-frame/DataFrameDataSource';
import { Workspace, QueryBuilderOption } from 'core/types';
import { DataSourceQBLookupCallback, TableProperties } from 'datasources/data-frame/types';
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
            dataTableIdOptions?: QueryBuilderOption[];
            dataTableNameOptions?: QueryBuilderOption[];
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
                <ul data-testid="data-table-id-options-list">
                    {props.dataTableIdOptions?.map(option => (
                        <li key={option.value}>{`${option.label}:${option.value}`}</li>
                    ))}
                </ul>
                <ul data-testid="data-table-name-options-prop-list">
                    {props.dataTableNameOptions?.map(option => (
                        <li key={option.value}>{`${option.label}:${option.value}`}</li>
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
    queryByResultAndColumnProperties = true,
    tablesForResultsResponse: { tables: Partial<TableProperties>[]; hasMore: boolean } = {
        tables: [
            { id: 'table3', name: 'Results Table 3' },
            { id: 'table4', name: 'Results Table 4' },
        ],
        hasMore: false,
    }
) => {
    const onResultsFilterChange = jest.fn();
    const onDataTableFilterChange = jest.fn();
    const onColumnsFilterChange = jest.fn();
    const onResultsLimitExceededChange = jest.fn();
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
        getTablesForResultsFilter: jest.fn().mockResolvedValue({
            tables: tablesForResultsResponse.tables as TableProperties[],
            hasMore: tablesForResultsResponse.hasMore,
        }),
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
            onResultsLimitExceededChange={onResultsLimitExceededChange}
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
                onResultsLimitExceededChange={onResultsLimitExceededChange}
            />
        );
    });

    return {
        renderResult,
        onResultsFilterChange,
        onDataTableFilterChange,
        onColumnsFilterChange,
        datasource,
        onResultsLimitExceededChange,
    };
};

describe('DataFrameQueryBuilderWrapper', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

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
                expect(screen.getByTestId('filter-input')).toHaveValue('test filter');
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

        it('should fetch data tables when results filter is provided', async () => {
            const { datasource, onResultsLimitExceededChange } = renderComponent('results filter');

            await waitFor(() => {
                expect(datasource.getTablesForResultsFilter).toHaveBeenCalledWith('results filter');
                expect(onResultsLimitExceededChange).toHaveBeenCalledWith(false);
            });

            await waitFor(() => {
                const idOptionsList = screen.getByTestId('data-table-id-options-list');
                expect(within(idOptionsList).getByText('table3:table3')).toBeInTheDocument();
                expect(within(idOptionsList).getByText('table4:table4')).toBeInTheDocument();

                const nameOptionsList = screen.getByTestId('data-table-name-options-prop-list');
                expect(within(nameOptionsList).getByText('Results Table 3:Results Table 3')).toBeInTheDocument();
                expect(within(nameOptionsList).getByText('Results Table 4:Results Table 4')).toBeInTheDocument();
            });
        });

        it('should not fetch data tables when results filter is empty', async () => {
            const { datasource, onResultsLimitExceededChange } = renderComponent();

            await waitFor(() => {
                expect(datasource.getTablesForResultsFilter).not.toHaveBeenCalled();
                expect(onResultsLimitExceededChange).toHaveBeenCalledWith(false);
            });
        });

        it('should notify when results limit is exceeded', async () => {
            const tablesResponse = {
                tables: [
                    { id: 'table5', name: 'Results Table 5' },
                ],
                hasMore: true,
            };
            const { datasource, onResultsLimitExceededChange } = renderComponent('results filter', '', '', true, tablesResponse);

            await waitFor(() => {
                expect(datasource.getTablesForResultsFilter).toHaveBeenCalledWith('results filter');
                expect(onResultsLimitExceededChange).toHaveBeenCalledWith(true);
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

            await waitFor(() => {
                expect(ColumnsQueryBuilder).toHaveBeenCalled();
            });

            const calls = (ColumnsQueryBuilder as jest.Mock).mock.calls;
            const props = calls[calls.length - 1][0];
            expect(props.filter).toBe('column filter');
        });

        it('should call onColumnsFilterChange when the columns filter is changed in the ColumnsQueryBuilder component', async () => {
            const { onColumnsFilterChange } = renderComponent();

            await waitFor(() => {
                expect(ColumnsQueryBuilder).toHaveBeenCalled();
            });

            const calls = (ColumnsQueryBuilder as jest.Mock).mock.calls;
            const props = calls[calls.length - 1][0];

            const eventDetail = { linq: 'new column filter' };
            await props.onChange({ detail: eventDetail });

            await waitFor(() => {
                expect(onColumnsFilterChange).toHaveBeenCalledWith({ detail: eventDetail });
            });
        });

        it('should disable the ColumnsQueryBuilder when the results filter is empty', async () => {
            renderComponent();

            await waitFor(() => {
                expect(ColumnsQueryBuilder).toHaveBeenCalled();
            });

            const calls = (ColumnsQueryBuilder as jest.Mock).mock.calls;
            const props = calls[calls.length - 1][0];
            expect(props.disabled).toBe(true);
        });

        it('should enable the ColumnsQueryBuilder when the results filter is provided', async () => {
            renderComponent('results filter');

            await waitFor(() => {
                const calls = (ColumnsQueryBuilder as jest.Mock).mock.calls;
                const props = calls[calls.length - 1][0];
                expect(props.disabled).toBe(false);
            });
        });
    });

    describe('ResultsQueryBuilder', () => {
        it('should pass the filter to the ResultsQueryBuilder component', async () => {
            renderComponent('results filter');

            await waitFor(() => {
                expect(ResultsQueryBuilder).toHaveBeenCalledWith(
                    expect.objectContaining({
                        filter: 'results filter',
                    }),
                    {}
                );
            });
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
                        status: expect.arrayContaining(['Done', 'Errored', 'Failed', 'Passed']),
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

            await waitFor(() => {
                expect(ResultsQueryBuilder).toHaveBeenCalled();
            });

            const calls = (ResultsQueryBuilder as jest.Mock).mock.calls;
            const props = calls[calls.length - 1][0];

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
                expect(ResultsQueryBuilder).not.toHaveBeenCalled();
            });
        });
    });
});
