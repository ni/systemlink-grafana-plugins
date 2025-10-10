import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent, { UserEvent } from "@testing-library/user-event";
import { DataFrameQueryEditorV2 } from "./DataFrameQueryEditorV2";
import type { DataFrameDataSource } from "datasources/data-frame/DataFrameDataSource";
import { DataFrameQuery, DataFrameQueryType } from "datasources/data-frame/types";

jest.mock("./query-builders/DataTableQueryBuilder", () => ({
    DataTableQueryBuilder: () => <div data-testid="data-table-query-builder" />
}));

const renderComponent = (queryOverrides: Partial<DataFrameQuery> = {}) => {
    const onChange = jest.fn();
    const onRunQuery = jest.fn();
    const processQuery = jest.fn<DataFrameQuery, [DataFrameQuery]>().mockImplementation(query => ({ ...query }));
    const datasource = { processQuery } as unknown as DataFrameDataSource;
    const initialQuery = {
        refId: "A",
        type: DataFrameQueryType.Data,
        ...queryOverrides,
    } as DataFrameQuery;

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
        const { onChange, onRunQuery } = renderComponent();
        const user = userEvent.setup();

        await user.click(screen.getByRole("radio", { name: DataFrameQueryType.Properties }));

        await waitFor(() => {
            expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
                type: DataFrameQueryType.Properties,
            }));
        });
        expect(onRunQuery).not.toHaveBeenCalled();
        expect(screen.getByPlaceholderText("Enter record count")).toBeInTheDocument();
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

        it("should hide the properties field when the query type is data", async () => {
            await waitFor(() => {
                expect(screen.queryByText("Select properties to fetch")).not.toBeInTheDocument();
            });
        });

        it("should hide the take field when the query type is data", async () => {
            await waitFor(() => {
                expect(screen.queryByPlaceholderText("Enter record count")).not.toBeInTheDocument();
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

        it("should show the properties field", async () => {
            await waitFor(() => {
                expect(screen.getByText("Select properties to fetch")).toBeInTheDocument();
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

});
