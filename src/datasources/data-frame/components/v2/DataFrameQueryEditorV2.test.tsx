import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

    it("should show the 'DataTableQueryBuilder' component when the query type is data", () => {
        renderComponent();

        expect(screen.getByTestId("data-table-query-builder")).toBeInTheDocument();
    });

    it("should show the DataTableQueryBuilder component when the query type is properties", () => {
        renderComponent({ type: DataFrameQueryType.Properties });

        expect(screen.getByTestId("data-table-query-builder")).toBeInTheDocument();
    });

    it("should show the take field when the query type is properties", () => {
        renderComponent({ type: DataFrameQueryType.Properties });

        expect(screen.getByPlaceholderText("Enter record count")).toBeInTheDocument();
    });

    it("should hide the take field when the query type is data", () => {
        renderComponent({ type: DataFrameQueryType.Data });

        expect(screen.queryByPlaceholderText("Enter record count")).not.toBeInTheDocument();
    });
});
