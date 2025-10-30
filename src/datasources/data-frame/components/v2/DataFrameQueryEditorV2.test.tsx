import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent, { UserEvent } from "@testing-library/user-event";
import { DataFrameQueryEditorV2 } from "./DataFrameQueryEditorV2";
import { DataFrameQueryV2, DataFrameQueryType, DataSourceQBLookupCallback } from "../../types";
import { DataFrameDataSource } from "datasources/data-frame/DataFrameDataSource";
import { QueryBuilderOption, Workspace } from "core/types";

jest.mock("./query-builders/DataTableQueryBuilder", () => ({
    DataTableQueryBuilder: (
        props: {
            workspaces?: Workspace[];
            globalVariableOptions: QueryBuilderOption[];
            dataTableNameLookupCallback: DataSourceQBLookupCallback;
        }
    ) => {
        const [options, setOptions] = React.useState<QueryBuilderOption[]>([]);

        React.useEffect(() => {
            const loadOptions = async () => {
                const result = await props.dataTableNameLookupCallback("test");
                setOptions(result);
            };

            loadOptions();
        }, [props.dataTableNameLookupCallback]);

        return (
            <div data-testid="data-table-query-builder">
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
        .fn<DataFrameQueryV2, [DataFrameQueryV2]>()
        .mockImplementation(query => ({ ...query }));
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
        type: DataFrameQueryType.Data,
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

    return { ...renderResult, onChange, onRunQuery, processQuery };
};

describe("DataFrameQueryEditorV2", () => {
    it("should render query type options", () => {
        const { processQuery } = renderComponent();

        expect(processQuery).toHaveBeenCalledWith(expect.objectContaining({
            type: DataFrameQueryType.Data,
        }));
        expect(screen.getByRole("radio", { name: DataFrameQueryType.Data })).toBeInTheDocument();
        expect(screen.getByRole("radio", { name: DataFrameQueryType.Properties })).toBeInTheDocument();
        expect(screen.getByTestId("data-table-query-builder")).toBeInTheDocument();
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
        beforeEach(() => {
            renderComponent({ type: DataFrameQueryType.Data });
        });

        it("should show the 'DataTableQueryBuilder' component when the query type is data", async () => {
            await waitFor(() => {
                expect(screen.getByTestId("data-table-query-builder")).toBeInTheDocument();
            });
        });

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

        it("should show the column configuration controls when the query type is data", async () => {
            await waitFor(() => {
                expect(screen.getByText("Column configurations")).toBeInTheDocument();
                expect(screen.getByText("Columns")).toBeInTheDocument();
                expect(screen.getByText("Include index columns")).toBeInTheDocument();
                expect(screen.getByText("Filter nulls")).toBeInTheDocument();
            });
        });

        it("should show the decimation settings controls when the query type is data", async () => {
            await waitFor(() => {
                expect(screen.getByText("Decimation settings")).toBeInTheDocument();
                expect(screen.getByText("Decimation method")).toBeInTheDocument();
                expect(screen.getByText("X-column")).toBeInTheDocument();
                expect(screen.getByText("Use time range")).toBeInTheDocument();
            });
        });
    });

    describe("when the query type is properties", () => {
        beforeEach(() => {
            renderComponent({ type: DataFrameQueryType.Properties });
        });

        it("should show the DataTableQueryBuilder component", async () => {
            await waitFor(() => {
                expect(screen.getByTestId("data-table-query-builder")).toBeInTheDocument();
            });
        });

        describe("properties fields", () => {
            it("should show the data table properties field", async () => {
                await waitFor(() => {
                    expect(screen.getByText("Select data table properties to fetch")).toBeInTheDocument();
                });
            });

            it("should show the column properties field", async () => {
                await waitFor(() => {
                    expect(screen.getByText("Select column properties to fetch")).toBeInTheDocument();
                });
            });

            it("should show the expected options in the data table properties field", async () => {
                const dataTablePropertiesField = screen.getByText("Select data table properties to fetch");
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

            it("should show the expected options in the column properties field", async () => {
                const columnPropertiesField = screen.getByText("Select column properties to fetch");
                await userEvent.click(columnPropertiesField);

                await waitFor(() => {
                    expect(document.body).toHaveTextContent("Column name");
                    expect(document.body).toHaveTextContent("Column data type");
                    expect(document.body).toHaveTextContent("Column type");
                    expect(document.body).toHaveTextContent("Column properties");
                });
            });
        });

        describe("take field", () => {
            let takeInput: HTMLElement;
            let user: UserEvent;

            beforeEach(() => {
                takeInput = screen.getByPlaceholderText("Enter record count");
                user = userEvent.setup();
            });

            it("should show the take field", async () => {
                await waitFor(() => {
                    expect(takeInput).toBeInTheDocument();
                });
            });

            it("should allow only numeric input in the take field", async () => {
                await user.type(takeInput, "abc");

                expect(takeInput).toHaveValue(null);
            });

            it("should show an error message when the take value entered is less than or equal to 0", async () => {
                await user.type(takeInput, "0");

                await waitFor(() => {
                    expect(screen.getByText("The take value must be greater than or equal to 0.")).toBeInTheDocument();
                });
            });

            it("should show an error message when the take value entered is greater than 1000", async () => {
                await user.type(takeInput, "5000");

                await waitFor(() => {
                    expect(screen.getByText("The take value must be less than or equal to 1000.")).toBeInTheDocument();
                });
            });

            it("should not show an error message when a valid take value is entered", async () => {
                await user.type(takeInput, "500");

                await waitFor(() => {
                    expect(screen.queryByText("The take value must be greater than or equal to 0.")).not.toBeInTheDocument();
                    expect(screen.queryByText("The take value must be less than or equal to 1000.")).not.toBeInTheDocument();
                });
            });
        });
    });

    describe("DataTableQueryBuilder props", () => {
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
