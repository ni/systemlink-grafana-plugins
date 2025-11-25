import { DataFrameDataSource } from "datasources/data-frame/DataFrameDataSource";
import { DataFrameVariableQuery, DataFrameVariableQueryType, defaultVariableQueryV2, ValidDataFrameVariableQuery } from "datasources/data-frame/types";
import { DataFrameVariableQueryEditorV2 } from "./DataFrameVariableQueryEditorV2";
import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DataFrameQueryBuilderWrapper } from "./query-builders/DataFrameQueryBuilderWrapper";

jest.mock("./query-builders/DataFrameQueryBuilderWrapper", () => ({
    DataFrameQueryBuilderWrapper: jest.fn(() => <div data-testid="mock-data-frame-query-builder-wrapper" />)
}));

const renderComponent = (
    queryOverrides: Partial<DataFrameVariableQuery> = {},
    errorTitle = '',
    errorDescription = ''
) => {
    const onChange = jest.fn();
    const processVariableQuery = jest
        .fn<DataFrameVariableQuery, [ValidDataFrameVariableQuery]>()
        .mockImplementation(query => ({ ...defaultVariableQueryV2, ...query }));
    const datasource = {
        errorTitle,
        errorDescription,
        processVariableQuery
    } as unknown as DataFrameDataSource;

    const initialQuery = {
        refId: 'A',
        ...queryOverrides,
    } as DataFrameVariableQuery;

    const renderResult = render(
        <DataFrameVariableQueryEditorV2
            datasource={datasource}
            query={initialQuery}
            onChange={onChange}
            onRunQuery={() => { }}
        />
    );

    onChange.mockImplementation(newQuery => {
        renderResult.rerender(
            <DataFrameVariableQueryEditorV2
                datasource={datasource}
                query={newQuery}
                onChange={onChange}
                onRunQuery={() => { }}
            />
        );
    });

    return { renderResult, onChange, processVariableQuery };
};

describe('DataFrameVariableQueryEditorV2', () => {
    beforeAll(() => {
        // JSDOM provides offsetHeight as 0 by default. 
        // Mocking it to return 30 because the ComboBox virtualization relies on this value 
        // to correctly calculate and render the dropdown options. 
        jest.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(30);
    });

    describe('Query Type Combobox', () => {
        it('should call processVariableQuery on render', () => {
            const { processVariableQuery } = renderComponent();

            expect(processVariableQuery).toHaveBeenCalled();
        });

        it('should render query type combobox with default value', () => {
            renderComponent();
            const combobox = screen.getByRole('combobox') as HTMLSelectElement;

            expect(combobox.value).toBe('List data tables');
        });

        it('should show the expected options in the query type combobox', async () => {
            renderComponent();
            const combobox = screen.getByRole('combobox');
            const user = userEvent.setup();

            await user.click(combobox);

            const optionControls = within(document.body).getAllByRole('option');
            const optionValues = optionControls.map(option => option.textContent);
            expect(optionValues).toEqual([
                'List data tables',
                'List data table columns'
            ]);
        });

        it('should call onChange when query type is changed', async () => {
            const { onChange } = renderComponent();
            const combobox = screen.getByRole('combobox');
            const user = userEvent.setup();

            await user.click(combobox);

            await user.keyboard('{ArrowDown}');
            await user.keyboard('{Enter}');

            expect(onChange).toHaveBeenCalledWith(
                expect.objectContaining({
                    queryType: DataFrameVariableQueryType.ListColumns,
                })
            );
        });
    });

    describe("query builder wrapper integration", () => {
        it("should render the query builder wrapper and forward the props", async () => {
            renderComponent(
                {
                    queryType: DataFrameVariableQueryType.ListDataTables,
                    dataTableFilter: 'InitialFilter',
                    refId: 'A'
                }
            );

            expect(screen.getByTestId("mock-data-frame-query-builder-wrapper")).toBeInTheDocument();
            expect(DataFrameQueryBuilderWrapper).toHaveBeenCalledWith(
                expect.objectContaining({
                    dataTableFilter: 'InitialFilter',
                    datasource: expect.any(Object),
                    onDataTableFilterChange: expect.any(Function),
                }),
                expect.anything() // React context
            );
        });

        it("should call onChange with updated dataTableFilter when filter changes", async () => {
            const { onChange } = renderComponent(
                {
                    queryType: DataFrameVariableQueryType.ListDataTables,
                    dataTableFilter: 'InitialFilter',
                    refId: 'A'
                }
            );

            // Get the onDataTableFilterChange callback from the mock
            const [[props]] = (DataFrameQueryBuilderWrapper as jest.Mock).mock.calls;
            const { onDataTableFilterChange } = props;

            // Simulate the filter change event
            const mockEvent = {
                detail: { linq: "NewFilter" }
            } as Event & { detail: { linq: string; }; };

            onDataTableFilterChange(mockEvent);

            await waitFor(() => {
                expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
                    dataTableFilter: 'NewFilter'
                }));
            });
        });

        it("should verify dataTableFilter is passed correctly", () => {
            renderComponent(
                {
                    queryType: DataFrameVariableQueryType.ListDataTables,
                    dataTableFilter: 'InitialFilter',
                    refId: 'A'
                }
            );

            const [[props]] = (DataFrameQueryBuilderWrapper as jest.Mock).mock.calls;

            expect(props.dataTableFilter).toBe('InitialFilter');
        });

        it("should pass columnFilter to the query builder wrapper", () => {
            renderComponent(
                {
                    queryType: DataFrameVariableQueryType.ListDataTables,
                    columnFilter: 'InitialColumnFilter',
                    refId: 'A'
                }
            );

            expect(DataFrameQueryBuilderWrapper).toHaveBeenCalledWith(
                expect.objectContaining({
                    columnFilter: 'InitialColumnFilter',
                    onColumnFilterChange: expect.any(Function),
                }),
                expect.anything() // React context
            );
        });

        it("should call onChange with updated columnFilter when columns filter changes", async () => {
            const { onChange } = renderComponent(
                {
                    queryType: DataFrameVariableQueryType.ListDataTables,
                    columnFilter: 'InitialColumnFilter',
                    refId: 'A'
                }
            );

            // Get the onColumnFilterChange callback from the mock
            const [[props]] = (DataFrameQueryBuilderWrapper as jest.Mock).mock.calls;
            const { onColumnFilterChange } = props;

            // Simulate the filter change event
            const mockEvent = {
                detail: { linq: "NewColumnFilter" }
            } as Event & { detail: { linq: string; }; };

            onColumnFilterChange(mockEvent);

            await waitFor(() => {
                expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
                    columnFilter: 'NewColumnFilter'
                }));
            });
        });

        it("should pass resultFilter to the query builder wrapper", () => {
            renderComponent(
                {
                    queryType: DataFrameVariableQueryType.ListDataTables,
                    resultFilter: 'InitialResultFilter',
                    refId: 'A'
                }
            );

            expect(DataFrameQueryBuilderWrapper).toHaveBeenCalledWith(
                expect.objectContaining({
                    resultFilter: 'InitialResultFilter',
                    onResultFilterChange: expect.any(Function),
                }),
                expect.anything() // React context
            );
        });

        it("should call onChange with updated resultFilter when results filter changes", async () => {
            const { onChange } = renderComponent(
                {
                    queryType: DataFrameVariableQueryType.ListDataTables,
                    resultFilter: 'InitialResultFilter',
                    refId: 'A'
                }
            );

            // Get the onResultFilterChange callback from the mock
            const [[props]] = (DataFrameQueryBuilderWrapper as jest.Mock).mock.calls;
            const { onResultFilterChange } = props;

            // Simulate the filter change event
            const mockEvent = {
                detail: { linq: "NewResultFilter" }
            } as Event & { detail: { linq: string; }; };

            onResultFilterChange(mockEvent);

            await waitFor(() => {
                expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
                    resultFilter: 'NewResultFilter'
                }));
            });
        });
    });

    it('should display FloatingError when there is an error', () => {
        const errorTitle = 'Test Error Title';
        const errorDescription = 'Test Error Description';

        renderComponent({}, errorTitle, errorDescription);

        expect(screen.getByText(errorTitle)).toBeInTheDocument();
        expect(screen.getByText(errorDescription)).toBeInTheDocument();
    });
});
