jest.mock('datasources/data-frame/constants', () => {
    const actual = jest.requireActual('datasources/data-frame/constants');
    return { ...actual, COLUMN_OPTION_LIMIT: 10 }; // reduce column option limit for these tests
});

import React from "react";
import { cleanup, render, RenderResult, screen, waitFor, within } from "@testing-library/react";
import userEvent, { UserEvent } from "@testing-library/user-event";
import { DataFrameQueryEditorV2 } from "./DataFrameQueryEditorV2";
import { DataFrameQueryV2, DataFrameQueryType, DataFrameQuery, ValidDataFrameQueryV2, defaultQueryV2, DataTableProjectionLabelLookup, DataTableProperties } from "../../types";
import { DataFrameDataSource } from "datasources/data-frame/DataFrameDataSource";
import { DataFrameQueryBuilderWrapper } from "./query-builders/DataFrameQueryBuilderWrapper";
import { COLUMN_OPTION_LIMIT } from "datasources/data-frame/constants";
import { ComboboxOption } from "@grafana/ui";
import { errorMessages } from "datasources/data-frame/constants/v2/DataFrameQueryEditorV2.constants";

jest.mock("./query-builders/DataFrameQueryBuilderWrapper", () => ({
    DataFrameQueryBuilderWrapper: jest.fn(() => <div data-testid="mock-data-frame-query-builder-wrapper" />)
}));

const renderComponent = (
    queryOverrides: Partial<DataFrameQueryV2> = {},
    errorTitle = '',
    errorDescription = '',
    columnOptions: ComboboxOption[]= []
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
        queryTables: jest.fn().mockResolvedValue(
            [
                { id: 'table1', name: 'Table 1', columns: [{ name: 'ColumnA' }, { name: 'ColumnB' }] },
                { id: 'table2', name: 'Table 2', columns: [{ name: 'ColumnD' }, { name: 'ColumnE' }] },
            ]
        ),
        getColumnOptions: jest.fn().mockResolvedValue(
            [
                { label: 'ColumnA', value: 'ColumnA' },
                { label: 'ColumnB (Numeric)', value: 'ColumnB-Numeric' },
                { label: 'ColumnB (String)', value: 'ColumnB-String' },
                { label: 'ColumnD (String)', value: 'ColumnD-String' },
                { label: 'ColumnE', value: 'ColumnE' },
                ...columnOptions
            ]
        )
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
        const { onChange } = renderComponent();

        await user.click(screen.getByRole("radio", { name: DataFrameQueryType.Properties }));

        await waitFor(() => {
            expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
                type: DataFrameQueryType.Properties,
            }));
        });
    });

    it("should call onRunQuery when the query type is changed", async () => {
        const user = userEvent.setup();
        const { onRunQuery } = renderComponent();

        await user.click(screen.getByRole("radio", { name: DataFrameQueryType.Properties }));

        expect(onRunQuery).toHaveBeenCalled();
    });

    describe("when the query type is data", () => {
        let onChange: jest.Mock;
        let onRunQuery: jest.Mock;
        
        beforeAll(() => { 
            // JSDOM provides offsetHeight as 0 by default. 
            // Mocking it to return 30 because the ComboBox virtualization relies on this value 
            // to correctly calculate and render the dropdown options. 
            jest.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(30); 
        });

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

        describe("column configuration controls", () => {
            it("should show the column configuration fields", async () => {
                await waitFor(() => {
                    expect(screen.getByText("Column configurations")).toBeInTheDocument();
                    expect(screen.getByText("Columns")).toBeInTheDocument();
                    expect(screen.getByText("Include index columns")).toBeInTheDocument();
                    expect(screen.getByText("Filter nulls")).toBeInTheDocument();
                });
            });

            describe('columns field', () => {
              let columnsField: HTMLElement;
              let user: UserEvent;

              async function changeFilterValue() {
                const filterInput = screen.getByTestId('filter-input');
                user = userEvent.setup();

                await user.clear(filterInput);
                await user.type(filterInput, 'new filter');
              }

              // Helper function to get column option texts
              async function clickColumnOptions() {
                const columnsCombobox = screen.getAllByRole('combobox')[0];
                await userEvent.click(columnsCombobox);
              }

              function getColumnOptionTexts() {
                const optionControls = within(document.body).getAllByRole('option');
                return optionControls.map(opt => opt.textContent);
              }

              beforeEach(() => {
                columnsField = screen.getAllByRole('combobox')[0];
              });

              it('should show the columns field', () => {
                expect(columnsField).toBeInTheDocument();
                expect(columnsField).toHaveAttribute('aria-expanded', 'false');
                expect(columnsField).toHaveDisplayValue('');
              });

                it('should load columns combobox options when filter changes', async () => {
                    // Get the onDataTableFilterChange callback from the mock
                    const [[props]] = (DataFrameQueryBuilderWrapper as jest.Mock).mock.calls;
                    const { onDataTableFilterChange } = props;

                    // Simulate the filter change event
                    const mockEvent = { 
                        detail: { linq: "NewFilter" } 
                    } as Event & { detail: { linq: string } };
                    
                    onDataTableFilterChange(mockEvent);

                    // Click on column combobox to load options
                    const columnsCombobox = screen.getAllByRole('combobox')[0];
                    await userEvent.click(columnsCombobox);

                    // Find all option controls by role 'option'
                    const optionControls = within(document.body).getAllByRole('option');
                    const optionTexts = optionControls.map(opt => opt.textContent);
                    expect(optionTexts).toEqual(expect.arrayContaining(
                        [
                            'ColumnA',
                            'ColumnB (Numeric)',
                            'ColumnB (String)',
                            'ColumnD (String)',
                            'ColumnE'
                        ]
                    ));
                });

              it('should not load column options when filter is empty', async () => {
                renderComponent({ dataTableFilter: '' });

                await clickColumnOptions();

                // Assert that no options are shown
                expect(within(document.body).queryAllByRole('option').length).toBe(0);
              });

              describe('column limit', () => {
                it('should not render warning alert when column limit is not exceeded', async () => {
                  await changeFilterValue();
                  await clickColumnOptions();
                  const optionTexts = getColumnOptionTexts();

                  expect(optionTexts.length).toBeLessThanOrEqual(COLUMN_OPTION_LIMIT);
                  await waitFor(() => {
                    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
                  });
                });

                describe('when column limit is exceeded', () => {
                  beforeEach(async () => {
                    cleanup();
                    const columnOptions = Array.from({ length: COLUMN_OPTION_LIMIT + 25 }, (_, i) => ({
                      label: `Column${i + 1}`,
                      value: `Column${i + 1}`,
                    }));

                    // Increase offsetHeight to allow more options to be rendered in the test environment
                    jest.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(200);
                    renderComponent({ dataTableFilter: ' ' }, '', '', columnOptions);

                    await changeFilterValue();
                  });

                  it(`should limit the number of column options to ${COLUMN_OPTION_LIMIT}`, async () => {
                    await clickColumnOptions();
                    const optionTexts = getColumnOptionTexts();
                    expect(optionTexts.length).toBe(COLUMN_OPTION_LIMIT);
                  });

                  it('should render warning alert when column limit is exceeded', async () => {
                    await waitFor(() => {
                      const alert = screen.getByRole('alert');
                      expect(alert).toBeInTheDocument();
                      expect(within(alert).getByText(/Warning/i)).toBeInTheDocument();
                      expect(within(alert).getByText(errorMessages.columnLimitExceeded)).toBeInTheDocument();
                    });
                  });

                  it('should hide the warning alert when filter is removed', async () => {
                    user.clear(screen.getByTestId('filter-input'));
                    user.type(screen.getByTestId('filter-input'), ' ');

                    await waitFor(() => {
                      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
                    });
                  });
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
        let user: UserEvent;

        async function selectProperty(
            container: HTMLElement,
            propertyLabel: string,
            user: UserEvent
        ) {
            await user.click(container);

            // Find all option controls by role 'option'
            const optionControls = within(document.body).getAllByRole('option');
            const targetOption = optionControls.find(opt => opt.textContent === propertyLabel);
            
            if (targetOption) {
                await user.click(targetOption);
            }
        }

        beforeAll(() => {
            // JSDOM provides offsetHeight as 0 by default.
            // Mocking it to return 250 because the MultiCombobox virtualization relies on this value
            // to correctly calculate and render the dropdown options.
            jest.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(250);
        });

        beforeEach(() => {
            ({ renderResult, onChange, onRunQuery } = renderComponent(
                { type: DataFrameQueryType.Properties }
            ));
            user = userEvent.setup();
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

            it('should render data table properties select with default value', async () => {
                expect(dataTablePropertiesField).toBeInTheDocument();
                expect(dataTablePropertiesField).toHaveAttribute('aria-expanded', 'false');
                expect(dataTablePropertiesField).toHaveDisplayValue('');

                await user.click(dataTablePropertiesField);

                await waitFor(() => {
                    expect(document.body).toHaveTextContent("Data table name");
                    expect(document.body).toHaveTextContent("Data table ID");
                    expect(document.body).toHaveTextContent("Rows");
                    expect(document.body).toHaveTextContent("Columns");
                    expect(document.body).toHaveTextContent("Created");
                    expect(document.body).toHaveTextContent("Workspace");
                });
            });

            it('should call onChange with data table properties when user selects properties', async () => {
                await selectProperty(
                    dataTablePropertiesField,
                    DataTableProjectionLabelLookup.Properties.label,
                    user
                );

                await waitFor(() => {
                    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
                        dataTableProperties: expect.arrayContaining([DataTableProperties.Properties])
                    }));
                });
            });

            it('should call onRunQuery when user selects properties', async () => {
                await selectProperty(
                    dataTablePropertiesField,
                    DataTableProjectionLabelLookup.Properties.label,
                    user
                );

                await waitFor(() => {
                    expect(onRunQuery).toHaveBeenCalled();
                });
            });

            it("should show the expected options in the data table properties field", async () => {
                await user.click(dataTablePropertiesField);

                const optionControls = within(document.body).getAllByRole('option');
                const optionTexts = optionControls.map(opt => opt.textContent);
                expect(optionTexts).toEqual(expect.arrayContaining([
                    "Data table name",
                    "Data table ID",
                    "Rows",
                    "Columns",
                    "Created",
                    "Workspace",
                    "Metadata modified",
                    "Metadata revision",
                    "Rows modified",
                    "Supports append",
                    "Data table properties"
                ]));
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
                selectProperty(
                    columnPropertiesField,
                    DataTableProjectionLabelLookup.ColumnType.label,
                    user
                );

                await waitFor(() => {
                    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
                        columnProperties: expect.arrayContaining([DataTableProperties.ColumnType])
                    }));
                });
            });

            it('should call onRunQuery when user selects properties', async () => {
                selectProperty(
                    columnPropertiesField,
                    DataTableProjectionLabelLookup.ColumnType.label,
                    user
                );

                await waitFor(() => {
                    expect(onRunQuery).toHaveBeenCalled();
                });
            });

            it("should show the expected options in the column properties field", async () => {
                await user.click(columnPropertiesField);

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
                    expect(screen.getByText("The take value must be greater than or equal to 0."))
                        .toBeInTheDocument();
                });
            });

            it("should show an error message when the take value entered is greater than 1000", async () => {
                await user.clear(takeInput);
                await user.type(takeInput, "5000");

                await waitFor(() => {
                    expect(screen.getByText("The take value must be less than or equal to 1000."))
                        .toBeInTheDocument();
                });
            });

            it("should not show an error message when a valid take value is entered", async () => {
                await user.clear(takeInput);
                await user.type(takeInput, "500");

                await waitFor(() => {
                    expect(screen.queryByText("The take value must be greater than or equal to 0."))
                        .not.toBeInTheDocument();
                    expect(screen.queryByText("The take value must be less than or equal to 1000."))
                        .not.toBeInTheDocument();
                });
            });

            it("should call onChange when a valid take value is entered", async () => {
                await user.clear(takeInput);
                await user.type(takeInput, "500");

                await waitFor(() => {
                    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
                        take: 500,
                    }));
                });
            });

            it("should call onRunQuery when a valid take value is entered", async () => {
                await user.clear(takeInput);
                await user.type(takeInput, "500");

                await waitFor(() => {
                    expect(onRunQuery).toHaveBeenCalled();
                });
            });
        });
    });
    
    describe("query builder wrapper integration", () => {
        it("should render the query builder wrapper and forward the props", async () => {
            renderComponent({ type: DataFrameQueryType.Data, dataTableFilter: 'InitialFilter' });

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

        it("should call onChange and onRunQuery with updated dataTableFilter when filter changes", async () => {
            const { onChange, onRunQuery } = renderComponent({ type: DataFrameQueryType.Data });

            // Get the onDataTableFilterChange callback from the mock
            const [[props]] = (DataFrameQueryBuilderWrapper as jest.Mock).mock.calls;
            const { onDataTableFilterChange } = props;

            // Simulate the filter change event
            const mockEvent = { 
                detail: { linq: "NewFilter" } 
            } as Event & { detail: { linq: string } };
            
            onDataTableFilterChange(mockEvent);

            await waitFor(() => {
                expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ 
                    dataTableFilter: 'NewFilter' 
                }));
                expect(onRunQuery).toHaveBeenCalled();
            });
        });

        it("should verify dataTableFilter is passed correctly", () => {
            renderComponent({ type: DataFrameQueryType.Data, dataTableFilter: 'TestFilter' });

            const [[props]] = (DataFrameQueryBuilderWrapper as jest.Mock).mock.calls;

            expect(props.dataTableFilter).toBe('TestFilter');
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
