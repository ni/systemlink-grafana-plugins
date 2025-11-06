import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import { DataFrameQueryBuilderWrapper } from './DataFrameQueryBuilderWrapper';
import { DataFrameDataSource } from 'datasources/data-frame/DataFrameDataSource';
import { Workspace, QueryBuilderOption } from 'core/types';
import { DataSourceQBLookupCallback } from 'datasources/data-frame/types';
import userEvent from '@testing-library/user-event';

jest.mock("./DataTableQueryBuilder", () => ({
    DataTableQueryBuilder: (
        props: {
            filter?: string;
            workspaces?: Workspace[];
            globalVariableOptions: QueryBuilderOption[];
            dataTableNameLookupCallback: DataSourceQBLookupCallback;
            onChange: (event: { dataTableFilter: string }) => void;
        }
    ) => {
        const [options, setOptions] = React.useState<QueryBuilderOption[]>([]);
        const [inputValue, setInputValue] = React.useState(props.filter || '');

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
                    value={inputValue}
                    onChange={(e) => { setInputValue(e.target.value); props.onChange({ dataTableFilter: e.target.value }); }}
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

const renderComponent = (
    dataTableFilter = ''
) => {
    const onDataTableFilterChange = jest.fn();
    const datasource = {
        loadWorkspaces: jest.fn().mockResolvedValue(
            new Map([
                ['1', 'WorkspaceName'],
                ['2', 'AnotherWorkspaceName'],
            ])
        ),
        globalVariableOptions: jest.fn().mockReturnValue(
            [
                { label: 'Var1', value: 'Value1' },
                { label: 'Var2', value: 'Value2' },
            ]
        ),
        queryTables: jest.fn().mockResolvedValue(
            [
                { id: 'table1', name: 'Table 1', columns: [{ name: 'ColumnA' }, {name: 'ColumnB'}] },
                { id: 'table2', name: 'Table 2', columns: [{ name: 'ColumnD' }, {name: 'ColumnE'}] },
            ]
        ),
    } as unknown as DataFrameDataSource;

    const renderResult = render(
        <DataFrameQueryBuilderWrapper
            datasource={datasource}
            dataTableFilter={dataTableFilter}
            onDataTableFilterChange={onDataTableFilterChange}
        />
    );

    return { renderResult, onDataTableFilterChange };
};

describe('DataFrameQueryBuilderWrapper', () => {
  describe("DataTableQueryBuilder", () => {
        it("should show the 'DataTableQueryBuilder' component", async () => {
                await waitFor(() => {
                    expect(screen.getByTestId("data-table-query-builder")).toBeInTheDocument();
                });
        });
        it("should pass the filter to the DataTableQueryBuilder component", async () => {
            renderComponent("test filter");

            await waitFor(() => {
                const filterInput = screen.getByTestId("filter-input");
                expect(filterInput).toHaveValue("test filter");
            });
        });

        it("should pass the workspaces to the DataTableQueryBuilder component", async () => {
            renderComponent();

            await waitFor(() => {
                const workspacesList = screen.getByTestId("workspaces-list");
                expect(workspacesList).toBeInTheDocument();
                expect(within(workspacesList).getByText("WorkspaceName")).toBeInTheDocument();
                expect(within(workspacesList).getByText("AnotherWorkspaceName")).toBeInTheDocument();
            });
        });

        it("should pass the global variable options to the DataTableQueryBuilder component", async () => {
            renderComponent();

            await waitFor(() => {
                const optionsList = screen.getByTestId("global-variable-options-list");
                expect(optionsList).toBeInTheDocument();
                expect(within(optionsList).getByText("Var1:Value1")).toBeInTheDocument();
                expect(within(optionsList).getByText("Var2:Value2")).toBeInTheDocument();
            });
        });

        it("should pass the dataTableNameLookupCallback to the DataTableQueryBuilder component", async () => {
            renderComponent();

            await waitFor(() => {
                const optionsList = screen.getByTestId("data-table-name-options-list");
                expect(optionsList).toBeInTheDocument();
                expect(within(optionsList).getByText("Table 1:Table 1")).toBeInTheDocument();
                expect(within(optionsList).getByText("Table 2:Table 2")).toBeInTheDocument();
            });
        });

        it("should call onDataTableFilterChange when the data table filter is changed in the DataTableQueryBuilder component", async () => {
            const { onDataTableFilterChange } = renderComponent('');
            const filterInput = screen.getByTestId("filter-input");
            const user = userEvent.setup();

            await user.clear(filterInput);
            await user.type(filterInput, "new filter");

            await waitFor(() => {
                expect(onDataTableFilterChange).toHaveBeenCalled();
                const lastCall = onDataTableFilterChange.mock.calls[onDataTableFilterChange.mock.calls.length - 1][0];
                expect(lastCall).toEqual(expect.objectContaining({ dataTableFilter: "new filter" }));
            });
        });
    });
});
