import React from "react";
import { render, RenderResult, screen, waitFor, within } from "@testing-library/react";
import userEvent, { UserEvent } from "@testing-library/user-event";
import { DataFrameQueryEditorV2 } from "./DataFrameQueryEditorV2";
import { DataFrameQueryV2, DataFrameQueryType, DataFrameQuery, ValidDataFrameQueryV2, defaultQueryV2, DataTableProjectionLabelLookup, DataSourceQBLookupCallback } from "../../types";
import { DataFrameDataSource } from "datasources/data-frame/DataFrameDataSource";
import { QueryBuilderOption, Workspace } from "core/types";
import { select } from "react-select-event";

jest.mock("./query-builders/DataTableQueryBuilder", () => ({
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

const renderComponent = (
    queryOverrides: Partial<DataFrameQueryV2> = {},
    errorTitle = '',
    errorDescription = ''
) => {
    const onChange = jest.fn();
    const onRunQuery = jest.fn();
    const processQuery = jest
        .fn<DataFrameQuery, [ValidDataFrameQueryV2]>()
        .mockImplementation(query => ({ ...defaultQueryV2, ...query }));
    const datasource = {
        errorTitle,
        errorDescription,
        processQuery,
        loadWorkspaces: jest.fn().mockResolvedValue(
            [
                { id: '1', name: 'WorkspaceName' },
                { id: '2', name: 'AnotherWorkspaceName' },
            ]
        ),
        globalVariableOptions: jest.fn().mockReturnValue(
            [
                { label: 'Var1', value: 'Value1' },
                { label: 'Var2', value: 'Value2' },
            ]
        ),
        queryTables: jest.fn().mockResolvedValue(
            [
                { id: 'table1', name: 'Table 1' },
                { id: 'table2', name: 'Table 2' },
            ]
        ),
    } as unknown as DataFrameDataSource;

    const initialQuery = {
        refId: 'A',
        ...queryOverrides,
    } as DataFrameQueryV2;

    const renderResult = render(
        <DataFrameQueryEditorV2
            datasource={datasource}
            query={initialQuery}
            onChange={onChange}
            onRunQuery={onRunQuery}
        />
    );

    onChange.mockImplementation(newQuery => {
        renderResult.rerender(
            <DataFrameQueryEditorV2
                datasource={datasource}
                query={newQuery}
                onChange={onChange}
                onRunQuery={onRunQuery}
            />
        );
    });

    return { renderResult, onChange, onRunQuery, processQuery };
};

describe("DataFrameQueryEditorV2", () => {
    it("should render query type options", () => {
        renderComponent();

        expect(screen.getByRole("radio", { name: DataFrameQueryType.Data })).toBeInTheDocument();
        expect(screen.getByRole("radio", { name: DataFrameQueryType.Properties })).toBeInTheDocument();
    });

    it("should have the data query type option selected by default", () => {
        renderComponent();

        expect(screen.getByRole("radio", { name: DataFrameQueryType.Data })).toBeChecked();
        expect(screen.getByRole("radio", { name: DataFrameQueryType.Properties })).not.toBeChecked();
    });

    it("should update the query type when a different option is selected", async () => {
        const user = userEvent.setup();
        const { onChange, onRunQuery } = renderComponent();

        await user.click(screen.getByRole("radio", { name: DataFrameQueryType.Properties }));

        await waitFor(() => {
            expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
                type: DataFrameQueryType.Properties,
            }));
        });
        expect(onRunQuery).not.toHaveBeenCalled();
    });

    describe("when the query type is data", () => {
        let onChange: jest.Mock;
        let onRunQuery: jest.Mock;

        beforeEach(() => {
            ({ onChange, onRunQuery } = renderComponent({ type: DataFrameQueryType.Data }));
        });

        describe("hidden fields", () => {
            it("should hide the data table properties field when the query type is data", async () => {
                await waitFor(() => {
                    expect(screen.queryByText("Select data table properties to fetch")).not.toBeInTheDocument();
                });
            });

            it("should hide the column properties field when the query type is data", async () => {
                await waitFor(() => {
                    expect(screen.queryByText("Select column properties to fetch")).not.toBeInTheDocument();
                });
            });

            it("should hide the take field when the query type is data", async () => {
                await waitFor(() => {
                    expect(screen.queryByPlaceholderText("Enter record count")).not.toBeInTheDocument();
                });
            });
        });

        describe("data table querybuilder", () => {
            it("should show the 'DataTableQueryBuilder' component when the query type is data", async () => {
                await waitFor(() => {
                    expect(screen.getByTestId("data-table-query-builder")).toBeInTheDocument();
                });
            });
        });

        describe("column configuration controls", () => {
            it("should show the column configuration controls when the query type is data", async () => {
                await waitFor(() => {
                    expect(screen.getByText("Column configurations")).toBeInTheDocument();
                    expect(screen.getByText("Columns")).toBeInTheDocument();
                    expect(screen.getByText("Include index columns")).toBeInTheDocument();
                    expect(screen.getByText("Filter nulls")).toBeInTheDocument();
                });
            });

            describe("columns field", () => {
                let columnsField: HTMLElement;

                beforeEach(() => {
                    columnsField = screen.getAllByRole('combobox')[0];
                });

                it("should show the columns field", () => {
                    expect(columnsField).toBeInTheDocument();
                    expect(columnsField).toHaveAttribute('aria-expanded', 'false');
                    expect(columnsField).toHaveDisplayValue('');
                });
            });

            describe("include index columns", () => {
                let includeIndexColumnsCheckbox: HTMLElement;
                let user: UserEvent;

                beforeEach(() => {
                    includeIndexColumnsCheckbox = screen.getAllByRole('switch')[0];
                    user = userEvent.setup();
                });

                it("should have the include index columns checkbox unchecked by default", () => {
                    expect(includeIndexColumnsCheckbox).toBeInTheDocument();
                    expect(includeIndexColumnsCheckbox).not.toBeChecked();
                });

                it("should call onChange when the include index columns checkbox is checked", async () => {
                    await user.click(includeIndexColumnsCheckbox);

                    await waitFor(() => {
                        expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
                            includeIndexColumns: true
                        }));
                        expect(onRunQuery).not.toHaveBeenCalled();
                    });
                });
            });

            describe("filter nulls", () => {
                let filterNullsCheckbox: HTMLElement;
                let user: UserEvent;

                beforeEach(() => {
                    filterNullsCheckbox = screen.getAllByRole('switch')[1];
                    user = userEvent.setup();
                });

                it("should have the filter nulls checkbox unchecked by default", () => {
                    expect(filterNullsCheckbox).toBeInTheDocument();
                    expect(filterNullsCheckbox).not.toBeChecked();
                });

                it("should call onChange when the filter nulls checkbox is checked", async () => {
                    await user.click(filterNullsCheckbox);

                    await waitFor(() => {
                        expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
                            filterNulls: true
                        }));
                        expect(onRunQuery).not.toHaveBeenCalled();
                    });
                });
            });
        });

        describe("decimation settings controls", () => {
            it("should show the decimation settings controls when the query type is data", async () => {
                await waitFor(() => {
                    expect(screen.getByText("Decimation settings")).toBeInTheDocument();
                    expect(screen.getByText("Decimation method")).toBeInTheDocument();
                    expect(screen.getByText("X-column")).toBeInTheDocument();
                    expect(screen.getByText("Use time range")).toBeInTheDocument();
                });
            });

            describe("decimation method field", () => {
                let decimationMethodField: HTMLElement;
                let user: UserEvent;

                beforeEach(() => {
                    decimationMethodField = screen.getAllByRole('combobox')[1];
                    user = userEvent.setup();
                });

                it("should show the decimation method field", () => {
                    expect(decimationMethodField).toBeInTheDocument();
                    expect(decimationMethodField).toHaveAttribute('aria-expanded', 'false');
                    expect(decimationMethodField).toHaveDisplayValue('Lossy');
                });

                it("should call onChange when a decimation method is selected", async () => {
                    await user.click(decimationMethodField);
                    await user.keyboard('{ArrowDown}');
                    await user.keyboard('{Enter}');

                    await waitFor(() => {
                        expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
                            decimationMethod: 'MAX_MIN'
                        }));
                        expect(onRunQuery).not.toHaveBeenCalled();
                    });
                });
            });

            describe("x-column field", () => {
                let xColumnField: HTMLElement;

                beforeEach(() => {
                    xColumnField = screen.getAllByRole('combobox')[2];
                });

                it("should show the x-column field", () => {
                    expect(xColumnField).toBeInTheDocument();
                    expect(xColumnField).toHaveAttribute('aria-expanded', 'false');
                    expect(xColumnField).toHaveDisplayValue('');
                });
            });

            describe("use time range", () => {
                let useTimeRangeCheckbox: HTMLElement;
                let user: UserEvent;

                beforeEach(() => {
                    useTimeRangeCheckbox = screen.getAllByRole('switch')[2];
                    user = userEvent.setup();
                });

                it("should have the use time range checkbox unchecked by default", () => {
                    expect(useTimeRangeCheckbox).toBeInTheDocument();
                    expect(useTimeRangeCheckbox).not.toBeChecked();
                });

                it("should call onChange when the use time range checkbox is checked", async () => {
                    await user.click(useTimeRangeCheckbox);

                    await waitFor(() => {
                        expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
                            applyTimeFilters: true
                        }));
                        expect(onRunQuery).not.toHaveBeenCalled();
                    });
                });
            });
        });
    });

    describe("when the query type is properties", () => {
        let renderResult: RenderResult;
        let dataTablePropertiesField: HTMLElement;
        let columnPropertiesField: HTMLElement;
        let onChange: jest.Mock;
        let onRunQuery: jest.Mock;

        beforeEach(() => {
            ({ renderResult, onChange, onRunQuery } = renderComponent({ type: DataFrameQueryType.Properties }));
            dataTablePropertiesField = renderResult.getAllByRole('combobox')[0];
            columnPropertiesField = renderResult.getAllByRole('combobox')[1];
        });

        describe("properties fields", () => {
            it('should render datatable properties select', () => {
                expect(dataTablePropertiesField).toBeInTheDocument();
                expect(dataTablePropertiesField).toHaveAttribute('aria-expanded', 'false');
                expect(dataTablePropertiesField).toHaveDisplayValue('');
            });

            it('should call onChange with datatable properties when user selects properties', async () => {
                await userEvent.click(dataTablePropertiesField);
                await select(dataTablePropertiesField, DataTableProjectionLabelLookup.Properties.label, { container: document.body });

                await waitFor(() => {
                    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
                        dataTableProperties: expect.arrayContaining([DataTableProjectionLabelLookup.Properties.projection])
                    }));
                    expect(onRunQuery).not.toHaveBeenCalled();
                });
            });

            it("should show the expected options in the data table properties field", async () => {
                const dataTablePropertiesField = screen.getAllByRole('combobox')[0];
                await userEvent.click(dataTablePropertiesField);

                await waitFor(() => {
                    expect(document.body).toHaveTextContent("Data table name");
                    expect(document.body).toHaveTextContent("Data table ID");
                    expect(document.body).toHaveTextContent("Rows");
                    expect(document.body).toHaveTextContent("Columns");
                    expect(document.body).toHaveTextContent("Created");
                    expect(document.body).toHaveTextContent("Workspace");
                    expect(document.body).toHaveTextContent("Metadata modified");
                    expect(document.body).toHaveTextContent("Metadata revision");
                    expect(document.body).toHaveTextContent("Rows modified");
                    expect(document.body).toHaveTextContent("Supports append");
                    expect(document.body).toHaveTextContent("Data table properties");
                });
            });

            it('should render column properties select', () => {
                expect(columnPropertiesField).toBeInTheDocument();
                expect(columnPropertiesField).toHaveAttribute('aria-expanded', 'false');
                expect(columnPropertiesField).toHaveDisplayValue('');
            });

            it('should call onChange with columns properties when user selects properties', async () => {
                await userEvent.click(columnPropertiesField);
                await select(columnPropertiesField, DataTableProjectionLabelLookup.ColumnType.label, { container: document.body });

                await waitFor(() => {
                    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
                        columnProperties: expect.arrayContaining([DataTableProjectionLabelLookup.ColumnType.projection])
                    }));
                    expect(onRunQuery).not.toHaveBeenCalled();
                });
            });

            it("should show the expected options in the column properties field", async () => {
                await userEvent.click(columnPropertiesField);

                await waitFor(() => {
                    expect(document.body).toHaveTextContent("Column name");
                    expect(document.body).toHaveTextContent("Column data type");
                    expect(document.body).toHaveTextContent("Column type");
                    expect(document.body).toHaveTextContent("Column properties");
                });
            });
        });

        describe("data table query builder", () => {
            it("should show the DataTableQueryBuilder component", async () => {
                await waitFor(() => {
                    expect(renderResult.getByTestId("data-table-query-builder")).toBeInTheDocument();
                });
            });
        });

        describe("take field", () => {
            let takeInput: HTMLElement;
            let user: UserEvent;

            beforeEach(() => {
                takeInput = screen.getByRole('spinbutton');
                user = userEvent.setup();
            });

            it("should show the take field with default value", async () => {
                await waitFor(() => {
                    expect(takeInput).toBeInTheDocument();
                    expect(takeInput).toHaveValue(1000);
                });
            });

            it("should allow only numeric input in the take field", async () => {
                await user.type(takeInput, "abc");

                expect(takeInput).toHaveValue(1000);
            });

            it("should show an error message when the take value entered is less than or equal to 0", async () => {
                await user.clear(takeInput);
                await user.type(takeInput, "0");

                await waitFor(() => {
                    expect(screen.getByText("The take value must be greater than or equal to 0.")).toBeInTheDocument();
                });
            });

            it("should show an error message when the take value entered is greater than 1000", async () => {
                await user.clear(takeInput);
                await user.type(takeInput, "5000");

                await waitFor(() => {
                    expect(screen.getByText("The take value must be less than or equal to 1000.")).toBeInTheDocument();
                });
            });

            it("should not show an error message when a valid take value is entered", async () => {
                await user.clear(takeInput);
                await user.type(takeInput, "500");

                await waitFor(() => {
                    expect(screen.queryByText("The take value must be greater than or equal to 0.")).not.toBeInTheDocument();
                    expect(screen.queryByText("The take value must be less than or equal to 1000.")).not.toBeInTheDocument();
                });
            });

            it("should call onChange when a valid take value is entered", async () => {
                await user.clear(takeInput);
                await user.type(takeInput, "500");

                await waitFor(() => {
                    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
                        take: 500,
                    }));
                    expect(onRunQuery).not.toHaveBeenCalled();
                });
            });
        });
    });

    describe("DataTableQueryBuilder props", () => {
        it("should pass the filter to the DataTableQueryBuilder component", async () => {
            renderComponent({ dataTableFilter: "test filter" });

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

        it("should call onChange when the data table filter is changed in the DataTableQueryBuilder component", async () => {
            const { onChange } = renderComponent({ dataTableFilter: "" });
            const filterInput = screen.getByTestId("filter-input");
            const user = userEvent.setup();

            await user.clear(filterInput);
            await user.type(filterInput, "new filter");

            await waitFor(() => {
                expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
                    dataTableFilter: "new filter",
                }));
            });
        });
    });

    describe("floating error", () => {
        it("should not be rendered when there is no error", async () => {
            renderComponent();

            await waitFor(() => {
                expect(screen.queryByRole("alert")).not.toBeInTheDocument();
            });
        });

        it("should be rendered when there is an error", async () => {
            renderComponent({}, "Test error title", "Test error description");

            await waitFor(() => {
                const alert = screen.getByRole("alert");
                expect(alert).toBeInTheDocument();
                expect(within(alert).getByText("Test error title")).toBeInTheDocument();
                expect(within(alert).getByText("Test error description")).toBeInTheDocument();
            });
        });
    });
});
