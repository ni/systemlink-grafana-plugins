import React from "react";
import { render, RenderResult, screen, waitFor, within, cleanup } from "@testing-library/react";
import userEvent, { UserEvent } from "@testing-library/user-event";
import { DataFrameQueryEditorV2 } from "./DataFrameQueryEditorV2";
import { DataFrameQueryV2, DataFrameQueryType, DataFrameQuery, ValidDataFrameQueryV2, defaultQueryV2, DataTableProjectionLabelLookup, DataSourceQBLookupCallback, DataTableProperties } from "../../types";
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
    errorDescription = '',
    mockDataTables = [
        { tableName: 'Table 1', columns: [{ name: 'ColumnA', dataType: 'INT32' }, { name: 'ColumnB', dataType: 'STRING' }] },
        { tableName: 'Table 2', columns: [{ name: 'ColumnD', dataType: 'FLOAT64' }, { name: 'ColumnE', dataType: 'BOOLEAN' }] },
    ]
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
            mockDataTables.map((table, i) => ({
                id: `table${i + 1}`,
                name: table.tableName,
                columns: table.columns,
            }))
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
            const result = renderComponent({ type: DataFrameQueryType.Data });
            onChange = result.onChange;
            onRunQuery = result.onRunQuery;
        });

        describe("hidden fields", () => {
            it("should hide the data table properties", async () => {
                expect(screen.queryByText("Data table properties")).not.toBeInTheDocument();
            });

            it("should hide the column properties", async () => {
                expect(screen.queryByText("Column properties")).not.toBeInTheDocument();
            });

            it("should hide the take", async () => {
                expect(screen.queryByText("Take")).not.toBeInTheDocument();
            });
        });

        describe("data table query builder", () => {
            it("should show the 'DataTableQueryBuilder' component", async () => {
                await waitFor(() => {
                    expect(screen.getByTestId("data-table-query-builder")).toBeInTheDocument();
                });
            });
        });

        describe("column configuration controls", () => {
            it("should show the column configuration fields", async () => {
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

                describe('column combobox options', () => {
                    async function getColumnOptions() {
                      //Clear and type in filter input to trigger options load
                      const filterInput = screen.getByTestId('filter-input');
                      const user = userEvent.setup();

                      await user.clear(filterInput);
                      await user.type(filterInput, 'new filter');

                      // Click on column combobox to load options
                      const columnsCombobox = screen.getAllByRole('combobox')[0];
                      await userEvent.click(columnsCombobox);

                      // Find all option controls by role 'option'
                      const optionControls = within(document.body).getAllByRole('option');
                      const optionTexts = optionControls.map(opt => opt.textContent);

                      return optionTexts;
                    }

                    beforeEach(() => {
                        cleanup();
                        jest.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(30); 
                    });

                    it('should set column options to empty array when there are no tables', async () => {
                        renderComponent({ dataTableFilter: '' }, '', '', []);

                        // Click on column combobox to load options
                        const columnsCombobox = screen.getAllByRole('combobox')[0];
                        await userEvent.click(columnsCombobox);
                    
                        // Assert that no options are shown
                        expect(within(document.body).queryAllByRole('option').length).toBe(0);
                    });

                    it('should aggregate columns and show only the name when column names do not repeat', async () => {
                      renderComponent({ dataTableFilter: '' }, '', '', [
                        {
                          tableName: 'Table1',
                          columns: [
                            { name: 'ColumnA', dataType: 'INT32' },
                            { name: 'ColumnB', dataType: 'FLOAT64' },
                          ],
                        },
                        {
                          tableName: 'Table2',
                          columns: [
                            { name: 'ColumnC', dataType: 'STRING' },
                            { name: 'ColumnD', dataType: 'TIMESTAMP' },
                          ],
                        },
                      ]);

                      const options = await getColumnOptions();

                      expect(options).toEqual(['ColumnA', 'ColumnB', 'ColumnC', 'ColumnD']);
                      expect(options.length).toBe(4);
                    });

                    describe('when column names repeat but data type differs', () => {
                        it('should group all the numeric types as Numeric and show the column name only once', async () => {
                            renderComponent({ dataTableFilter: '' }, '', '', [
                                {
                                    tableName: 'Table1',
                                    columns: [
                                        { name: 'ColumnA', dataType: 'INT32' },
                                        { name: 'ColumnB', dataType: 'FLOAT64' },
                                        { name: 'ColumnC', dataType: 'FLOAT32' },
                                        { name: 'ColumnD', dataType: 'INT64' },
                                    ],
                                },
                                {
                                    tableName: 'Table2',
                                    columns: [
                                        { name: 'ColumnA', dataType: 'INT32' },
                                        { name: 'ColumnB', dataType: 'FLOAT64' },
                                        { name: 'ColumnC', dataType: 'FLOAT32' },
                                        { name: 'ColumnD', dataType: 'INT64' },
                                    ],
                                },
                            ]);

                            const options = await getColumnOptions();

                            expect(options).toEqual(
                                [ 
                                    'ColumnA',
                                    'ColumnB',
                                    'ColumnC',
                                    'ColumnD'
                                ]);
                            expect(options.length).toBe(4);
                        });

                        it('should show name with type suffixes for non-numeric types', async () => {
                            renderComponent({ dataTableFilter: '' }, '', '', [
                                {
                                    tableName: 'Table1',
                                    columns: [
                                        { name: 'ColumnA', dataType: 'STRING' },
                                        { name: 'ColumnB', dataType: 'BOOLEAN' },
                                    ]
                                },
                                {
                                    tableName: 'Table2',
                                    columns: [
                                        { name: 'ColumnA', dataType: 'TIMESTAMP' },
                                        { name: 'ColumnB', dataType: 'STRING' },
                                    ]
                                }
                            ]);

                            const options = await getColumnOptions();
                            expect(options).toEqual([
                                'ColumnA (String)',
                                'ColumnA (Timestamp)',
                                'ColumnB (Boolean)',
                                'ColumnB (String)',
                            ])
                            expect(options.length).toBe(4);
                        });

                        it('should show name with type suffixes for mixed numeric and non-numeric types', async () => {
                            renderComponent({ dataTableFilter: '' }, '', '', [
                                {
                                    tableName: 'Table1',
                                    columns: [
                                        { name: 'ColumnA', dataType: 'INT32' },
                                        { name: 'ColumnB', dataType: 'STRING' },
                                        { name: 'ColumnC', dataType: 'FLOAT32' },
                                    ]
                                },
                                {
                                    tableName: 'Table2',
                                    columns: [
                                        { name: 'ColumnA', dataType: 'FLOAT64' },
                                        { name: 'ColumnB', dataType: 'BOOLEAN' },
                                        { name: 'ColumnC', dataType: 'INT64' },
                                    ]
                        
                                }
                            ]);
                            const options = await getColumnOptions();
                            expect(options).toEqual([
                                'ColumnA (Numeric)',
                                'ColumnB (String)',
                                'ColumnB (Boolean)',
                                'ColumnC (Numeric)',
                            ]);
                        });
                    });

                    it('should limit the number of column options to 10000', async () => {
                        jest.clearAllMocks();
                        // Extend the offsetHeight to simulate a very tall container
                        jest.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(3000000); 

                        // Create 10001 columns
                        const manyColumns = Array.from({ length: 10001 }, (_, i) => ({
                            name: `Column${i}`,
                            dataType: 'INT32',
                        }));
                        renderComponent({dataTableFilter:''}, '', '', [
                            { tableName: 'Table1', columns: [...manyColumns] },
                        ]);

                        const options = await getColumnOptions();

                        expect(options.length).toBe(10000);
                        expect(options).toContain('Column10000');
                        expect(options).not.toContain('Column10001');       
                    });
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
            it("should show the decimation settings fields", async () => {
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

                it("should show the decimation method field with default value", () => {
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
        let onChange: jest.Mock;
        let onRunQuery: jest.Mock;

        beforeEach(() => {
            ({ renderResult, onChange, onRunQuery } = renderComponent({ type: DataFrameQueryType.Properties }));
        });

        describe("hidden fields", () => {
            it("should hide the column configuration fields", async () => {
                expect(screen.queryByText("Column configurations")).not.toBeInTheDocument();
                expect(screen.queryByPlaceholderText("Select columns")).not.toBeInTheDocument();
                expect(screen.queryByText("Include index columns")).not.toBeInTheDocument();
                expect(screen.queryByText("Filter nulls")).not.toBeInTheDocument();
            });

            it("should hide the decimation settings fields", async () => {
                expect(screen.queryByText("Decimation settings")).not.toBeInTheDocument();
                expect(screen.queryByText("Decimation method")).not.toBeInTheDocument();
                expect(screen.queryByText("X-column")).not.toBeInTheDocument();
                expect(screen.queryByText("Use time range")).not.toBeInTheDocument();
            });
        });

        describe("data table properties fields", () => {
            let dataTablePropertiesField: HTMLElement;

            beforeEach(() => {
                dataTablePropertiesField = renderResult.getAllByRole('combobox')[0];
            });

            it('should render data table properties select with default value', () => {
                expect(dataTablePropertiesField).toBeInTheDocument();
                expect(dataTablePropertiesField).toHaveAttribute('aria-expanded', 'false');
                expect(dataTablePropertiesField).toHaveDisplayValue('');
                expect(document.body).toHaveTextContent("Data table name");
                expect(document.body).toHaveTextContent("Data table ID");
                expect(document.body).toHaveTextContent("Rows");
                expect(document.body).toHaveTextContent("Columns");
                expect(document.body).toHaveTextContent("Created");
                expect(document.body).toHaveTextContent("Workspace");
            });

            it('should call onChange with data table properties when user selects properties', async () => {
                await userEvent.click(dataTablePropertiesField);
                await select(dataTablePropertiesField, DataTableProjectionLabelLookup.Properties.label, { container: document.body });

                await waitFor(() => {
                    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
                        dataTableProperties: expect.arrayContaining([DataTableProperties.Properties])
                    }));
                    expect(onRunQuery).not.toHaveBeenCalled();
                });
            });

            it("should show the expected options in the data table properties field", async () => {
                const dataTablePropertiesField = screen.getAllByRole('combobox')[0];
                await userEvent.click(dataTablePropertiesField);

                await waitFor(() => {
                    expect(document.body).toHaveTextContent("Metadata modified");
                    expect(document.body).toHaveTextContent("Metadata revision");
                    expect(document.body).toHaveTextContent("Rows modified");
                    expect(document.body).toHaveTextContent("Supports append");
                    expect(document.body).toHaveTextContent("Data table properties");
                });
            });
        });

        describe("column properties fields", () => {
            let columnPropertiesField: HTMLElement;

            beforeEach(() => {
                columnPropertiesField = renderResult.getAllByRole('combobox')[1];
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
                        columnProperties: expect.arrayContaining([DataTableProperties.ColumnType])
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
})
