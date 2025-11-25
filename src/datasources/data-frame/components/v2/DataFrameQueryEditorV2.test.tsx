jest.mock('datasources/data-frame/constants', () => {
    const actual = jest.requireActual('datasources/data-frame/constants');
    return { ...actual, COLUMN_OPTIONS_LIMIT: 10 }; // reduce column option limit for tests
});

import React from "react";
import { cleanup, render, RenderResult, screen, waitFor, within } from "@testing-library/react";
import userEvent, { UserEvent } from "@testing-library/user-event";
import { DataFrameQueryEditorV2 } from "./DataFrameQueryEditorV2";
import { DataFrameQueryV2, DataFrameQueryType, DataFrameQuery, ValidDataFrameQueryV2, defaultQueryV2, DataTableProjectionLabelLookup, DataTableProperties, DataFrameDataQuery } from "../../types";
import { DataFrameDataSource } from "datasources/data-frame/DataFrameDataSource";
import { DataFrameQueryBuilderWrapper } from "./query-builders/DataFrameQueryBuilderWrapper";
import { COLUMN_OPTIONS_LIMIT } from "datasources/data-frame/constants";
import { ComboboxOption } from "@grafana/ui";
import { errorMessages } from "datasources/data-frame/constants/v2/DataFrameQueryEditorV2.constants";
import { of } from "rxjs";

jest.mock("./query-builders/DataFrameQueryBuilderWrapper", () => ({
    DataFrameQueryBuilderWrapper: jest.fn(() => <div data-testid="mock-data-frame-query-builder-wrapper" />)
}));

const renderComponent = (
    queryOverrides: Partial<DataFrameDataQuery> = {},
    errorTitle = '',
    errorDescription = '',
    columnOptions: ComboboxOption[] = [],
    processQueryOverride?: jest.Mock<DataFrameQuery, [ValidDataFrameQueryV2]>,
    variablesCache: Record<string, string> = {},
    mockDatasource: Partial<DataFrameDataSource> = {}
) => {
    const onChange = jest.fn();
    const onRunQuery = jest.fn();
    const processQuery = processQueryOverride ?? jest
        .fn<DataFrameQuery, [ValidDataFrameQueryV2]>()
        .mockImplementation(query => ({ ...defaultQueryV2, ...query }));
    const datasource = {
        errorTitle,
        errorDescription,
        processQuery,
        getColumnOptionsWithVariables: jest.fn().mockResolvedValue(
            [
                { label: 'ColumnA', value: 'ColumnA' },
                { label: 'ColumnB (Numeric)', value: 'ColumnB-Numeric' },
                { label: 'ColumnB (String)', value: 'ColumnB-String' },
                { label: 'ColumnD (String)', value: 'ColumnD-String' },
                { label: 'ColumnE', value: 'ColumnE' },
                ...columnOptions
            ]
        ),
        transformQuery: jest.fn((filter: string) => filter),
        variablesCache
    } as unknown as DataFrameDataSource;

    const initialQuery = {
        refId: 'A',
        ...queryOverrides,
    } as DataFrameQueryV2;

    const renderResult = render(
        <DataFrameQueryEditorV2
            datasource={mockDatasource.processQuery ? mockDatasource as DataFrameDataSource : datasource}
            query={initialQuery}
            onChange={onChange}
            onRunQuery={onRunQuery}
        />
    );

    onChange.mockImplementation(newQuery => {
        renderResult.rerender(
            <DataFrameQueryEditorV2
                datasource={mockDatasource.processQuery ? mockDatasource as DataFrameDataSource : datasource}
                query={newQuery}
                onChange={onChange}
                onRunQuery={onRunQuery}
            />
        );
    });

    return { renderResult, onChange, onRunQuery, processQuery, datasource };
};

describe("DataFrameQueryEditorV2", () => {
    it("should call processQuery with the initial query", () => {
        const { processQuery } = renderComponent({
            type: DataFrameQueryType.Data,
            tableId: 'ExistingFilter',
        });

        expect(processQuery).toHaveBeenCalledWith(expect.objectContaining({
            type: DataFrameQueryType.Data,
            tableId: 'ExistingFilter',
        }));
    });

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
                let datasource: DataFrameDataSource;

                const processQuery = jest.fn(query => ({ ...defaultQueryV2, ...query }))

                async function changeFilterValue(filterValue = 'NewFilter') {
                    // Get the onDataTableFilterChange callback from the mock
                    const [[props]] = (DataFrameQueryBuilderWrapper as jest.Mock).mock.calls;
                    const { onDataTableFilterChange } = props;

                    // Simulate the filter change event
                    const mockEvent = {
                        detail: { linq: filterValue },
                    } as Event & { detail: { linq: string; }; };

                    onDataTableFilterChange(mockEvent);
                }

                async function clickColumnOptions() {
                    const columnsCombobox = screen.getAllByRole('combobox')[0];
                    await userEvent.click(columnsCombobox);
                }

                function getColumnOptionTexts() {
                    const optionControls = within(document.body).getAllByRole('option');
                    return optionControls.map(opt => opt.textContent);
                }

                beforeEach(() => {
                    const latestQueryBuilderWrapperCall = (DataFrameQueryBuilderWrapper as jest.Mock).mock.calls.slice(-1)[0];
                    const latestProps = latestQueryBuilderWrapperCall ? latestQueryBuilderWrapperCall[0] : undefined;
                    columnsField = screen.getAllByRole('combobox')[0];
                    datasource = latestProps?.datasource as DataFrameDataSource;
                });

                it('should show the columns field', () => {
                    expect(columnsField).toBeInTheDocument();
                    expect(columnsField).toHaveAttribute('aria-expanded', 'false');
                    expect(columnsField).toHaveDisplayValue('');
                });

                it('should load columns combobox options when filter changes', async () => {
                    await changeFilterValue();
                    await clickColumnOptions();

                    await waitFor(() => expect(datasource.getColumnOptionsWithVariables).toHaveBeenCalledTimes(1));
                    const optionTexts = getColumnOptionTexts();
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

                it('should not load column options when filter is unchanged', async () => {
                    //Make initial filter change
                    await changeFilterValue();

                    // wait for column to be fetched
                    await waitFor(() => {
                        expect(datasource.getColumnOptionsWithVariables).toHaveBeenCalledTimes(1);
                    });
                    await clickColumnOptions();
                    const firstLoadOptions = getColumnOptionTexts();
                    expect(firstLoadOptions.length).toBeGreaterThan(0);

                    // Switch to Properties query type and back to Data to simulate re-render
                    await userEvent.click(screen.getByRole("radio", { name: DataFrameQueryType.Properties }));
                    await userEvent.click(screen.getByRole("radio", { name: DataFrameQueryType.Data }));

                    // reopen dropdown
                    await clickColumnOptions();
                    const secondLoadOptions = getColumnOptionTexts();

                    expect(secondLoadOptions).toEqual(firstLoadOptions);
                    expect(datasource.getColumnOptionsWithVariables).toHaveBeenCalledTimes(1);
                });

                describe('column limit', () => {
                    it('should not render warning alert when column limit is not exceeded', async () => {
                        await changeFilterValue();
                        await clickColumnOptions();

                        const optionTexts = getColumnOptionTexts();
                        
                        expect(optionTexts.length).toBeLessThanOrEqual(COLUMN_OPTIONS_LIMIT);
                        await waitFor(() => {
                            expect(screen.queryByRole('alert')).not.toBeInTheDocument();
                        });
                    });

                    describe('when column limit is exceeded', () => {
                        beforeEach(async () => {
                            cleanup();
                            jest.clearAllMocks();

                            const columnOptions = Array.from({ length: COLUMN_OPTIONS_LIMIT + 25 }, (_, i) => ({
                                label: `Column${i + 1}`,
                                value: `Column${i + 1}`,
                            }));

                            // Increase offsetHeight to allow more options to be rendered in the test environment
                            jest.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(200);
                            renderComponent({ dataTableFilter: ' ' }, '', '', columnOptions);

                            await changeFilterValue();
                        });

                        it(`should limit the number of column options to ${COLUMN_OPTIONS_LIMIT}`, async () => {
                            await clickColumnOptions();
                            const optionTexts = getColumnOptionTexts();
                            expect(optionTexts.length).toBe(COLUMN_OPTIONS_LIMIT);
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
                            await changeFilterValue();
                            const alert = screen.getByRole('alert');
                            expect(alert).toBeInTheDocument();

                            await changeFilterValue('');

                            await waitFor(() => {
                                expect(alert).not.toBeInTheDocument();
                            });
                        });
                    });
                });

                describe('column options population based on query type', () => {
                    beforeAll(() => {
                        // Mock offsetHeight for combobox virtualization so options render in tests
                        jest.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(120);
                    });

                    beforeEach(() => {
                        cleanup();
                        jest.clearAllMocks();
                    });

                    it('should fetch column options when switching to Data query type with existing non-empty filter', async () => {
                        const user = userEvent.setup();
                        const { datasource } = renderComponent({
                            type: DataFrameQueryType.Properties,
                            dataTableFilter: 'ExistingFilter',
                        });

                        // Switch query type to Data (use first matching radio)
                        const dataRadios = screen.getAllByRole('radio', {
                            name: DataFrameQueryType.Data,
                        });
                        await user.click(dataRadios[0]);

                        const columnsCombobox = screen.getAllByRole('combobox')[0];
                        await user.click(columnsCombobox);

                        expect(datasource.getColumnOptionsWithVariables).toHaveBeenCalledWith('ExistingFilter');

                        // Column options should be fetched and available
                        await waitFor(() => {
                            const optionControls = within(document.body).getAllByRole('option');
                            const texts = optionControls.map(option => option.textContent);
                            expect(texts).toEqual(
                                expect.arrayContaining([
                                    'ColumnA',
                                    'ColumnB (Numeric)',
                                    'ColumnB (String)',
                                    'ColumnD (String)',
                                    'ColumnE',
                                ])
                            );
                        });
                    });

                    it('should not fetch column options when switching to Data query type with existing empty filter', async () => {
                        const user = userEvent.setup();
                        const { datasource } = renderComponent({
                            type: DataFrameQueryType.Properties,
                            dataTableFilter: '',
                        });
                        const dataRadios = screen.getAllByRole('radio', {
                            name: DataFrameQueryType.Data,
                        });
                        await user.click(dataRadios[0]);

                        const columnsCombobox = screen.getAllByRole('combobox')[0];
                        await user.click(columnsCombobox);

                        await waitFor(() => {
                            const optionControls = within(document.body).queryAllByRole('option');
                            expect(optionControls.length).toBe(0);
                        });
                        expect(datasource.getColumnOptionsWithVariables).not.toHaveBeenCalled();
                    });

                    it('should not fetch column options when filter changes while in Properties query type', async () => {
                        const { datasource } = renderComponent({
                            type: DataFrameQueryType.Properties,
                            dataTableFilter: 'InitialFilter',
                        });
                        const [[props]] = (DataFrameQueryBuilderWrapper as jest.Mock).mock.calls;
                        const { onDataTableFilterChange } = props;

                        const mockEvent = { detail: { linq: 'UpdatedFilter' } } as Event & {
                            detail: { linq: string; };
                        };
                        onDataTableFilterChange(mockEvent);

                        // Columns combobox should not be present in Properties mode
                        expect(screen.queryByPlaceholderText('Select columns')).not.toBeInTheDocument();
                        // getColumnOptionsWithVariables should never have been called
                        expect(datasource.getColumnOptionsWithVariables).not.toHaveBeenCalled();
                    });

                    it('should not fetch column options when switching to Properties query type with existing non-empty filter', async () => {
                        const user = userEvent.setup();
                        const { datasource } = renderComponent({
                            type: DataFrameQueryType.Data,
                            dataTableFilter: 'ExistingFilter',
                        });

                        // Switch query type to Properties
                        const propertiesRadios = screen.getAllByRole('radio', {
                            name: DataFrameQueryType.Properties,
                        });
                        await user.click(propertiesRadios[0]);

                        // Columns combobox should not be present in Properties mode
                        expect(screen.queryByPlaceholderText('Select columns')).not.toBeInTheDocument();

                        // getColumnOptionsWithVariables should have been called only once (during initial Data mode render)
                        await waitFor(() => {
                            expect(datasource.getColumnOptionsWithVariables).toHaveBeenCalledTimes(1);
                        });
                    });

                    it('should not fetch column options when switching to Properties query type with existing empty filter', async () => {
                        const user = userEvent.setup();
                        const { datasource } = renderComponent({
                            type: DataFrameQueryType.Data,
                            dataTableFilter: '',
                        });

                        // Switch query type to Properties
                        const propertiesRadios = screen.getAllByRole('radio', {
                            name: DataFrameQueryType.Properties,
                        });
                        await user.click(propertiesRadios[0]);

                        // Columns combobox should not be present in Properties mode
                        expect(screen.queryByPlaceholderText('Select columns')).not.toBeInTheDocument();

                        // getColumnOptionsWithVariables should never have been called (empty filter in Data mode)
                        expect(datasource.getColumnOptionsWithVariables).not.toHaveBeenCalled();
                    });

                    it('should fetch column options when filter changes while in Data query type', async () => {
                        const user = userEvent.setup();
                        const { datasource } = renderComponent({ type: DataFrameQueryType.Data, dataTableFilter: 'InitialFilter' });
                        const [[props]] = (DataFrameQueryBuilderWrapper as jest.Mock).mock.calls;
                        const { onDataTableFilterChange } = props;

                        // Simulate filter change while in Data type
                        const mockEvent = { detail: { linq: 'UpdatedFilter' } } as Event & { detail: { linq: string; }; };
                        onDataTableFilterChange(mockEvent);

                        const columnsCombobox = screen.getAllByRole('combobox')[0];
                        await user.click(columnsCombobox);

                        await waitFor(() => {
                            const optionControls = within(document.body).getAllByRole('option');
                            const texts = optionControls.map(option => option.textContent);
                            expect(texts).toEqual(
                                expect.arrayContaining([
                                    'ColumnA',
                                    'ColumnB (Numeric)',
                                    'ColumnB (String)',
                                    'ColumnD (String)',
                                    'ColumnE',
                                ])
                            );
                        });
                        expect(datasource.getColumnOptionsWithVariables).toHaveBeenCalledWith('UpdatedFilter');
                    });

                    it('should fetch column options when switching to Data query type after changing filter in Properties type', async () => {
                        const user = userEvent.setup();
                        // Start in Properties mode with an initial filter value
                        const { datasource } = renderComponent({ type: DataFrameQueryType.Properties, dataTableFilter: 'InitialFilter' });
                        const [[props]] = (DataFrameQueryBuilderWrapper as jest.Mock).mock.calls;
                        const { onDataTableFilterChange } = props;
                        const getColumnOptionsSpy = jest.spyOn(datasource, 'getColumnOptionsWithVariables');

                        // While in Properties mode the columns combobox should not be rendered
                        expect(screen.queryByPlaceholderText('Select columns')).not.toBeInTheDocument();
                        expect(getColumnOptionsSpy).not.toHaveBeenCalled();

                        // Change the filter while still in Properties mode
                        const mockEvent = { detail: { linq: 'UpdatedFilter' } } as Event & { detail: { linq: string } };
                        onDataTableFilterChange(mockEvent);
    
                        // Still should not fetch columns in Properties mode
                        expect(getColumnOptionsSpy).not.toHaveBeenCalled();

                        // Switch to Data mode – now the use effect should run and fetch columns with the updated filter
                        const dataRadios = screen.getAllByRole('radio', { name: DataFrameQueryType.Data });
                        await user.click(dataRadios[0]);

                        await waitFor(() => {
                            expect(datasource.getColumnOptionsWithVariables).toHaveBeenCalledWith('UpdatedFilter');
                        });
                    });
                });

                describe('column option population based on filter', () => {
                    it('should load column options on initial render with non-empty filter', async () => {
                    const mockColumnOptions = [
                        { label: 'Column1', value: 'Column1' },
                        { label: 'Column2', value: 'Column2' },
                    ];
                    const datasource = {
                        processQuery: jest.fn(query => ({ ...defaultQueryV2, ...query })),
                        getColumnOptionsWithVariables: jest.fn().mockResolvedValue(mockColumnOptions),
                        transformQuery: jest.fn(f => f),
                    } as any;

                    renderComponent({
                            ...defaultQueryV2,
                            refId: 'A',
                            type: DataFrameQueryType.Data,
                            dataTableFilter: 'InitialFilter',
                        }, '', '', [], processQuery,{}, datasource);

                    await waitFor(() => {
                        expect(datasource.getColumnOptionsWithVariables).toHaveBeenCalledWith('InitialFilter');
                    });
                    });

                    it('should not load column options when filter becomes empty', async () => {
                        const { datasource, renderResult } = renderComponent({
                            type: DataFrameQueryType.Data,
                            dataTableFilter: 'InitialFilter',
                        });
                        const getColumnOptionsSpy = jest.spyOn(datasource, 'getColumnOptionsWithVariables');

                        await waitFor(() => expect(getColumnOptionsSpy).toHaveBeenCalledTimes(1));
                        getColumnOptionsSpy.mockClear();
                        renderResult.rerender(
                            <DataFrameQueryEditorV2
                                datasource={datasource}
                                query={{ ...defaultQueryV2, refId: 'A', type: DataFrameQueryType.Data, dataTableFilter: '' }}
                                onChange={() => {}}
                                onRunQuery={() => {}}
                            />
                        );
                        
                        await waitFor(() => expect(datasource.getColumnOptionsWithVariables).not.toHaveBeenCalled());
                    });

                    it('should call getColumnOptionsWithVariables with transformed filter on initial render', async () => {
                        const datasource = {
                            processQuery: jest.fn(query => ({ ...defaultQueryV2, ...query })),
                            getColumnOptionsWithVariables: jest.fn().mockResolvedValue([{ label: 'Col1', value: 'Col1' }]),
                            transformQuery: jest.fn((filter: string) => `TRANSFORMED_${filter}`),
                        } as any;

                        renderComponent(
                            {
                                ...defaultQueryV2,
                                refId: 'A',
                                type: DataFrameQueryType.Data,
                                dataTableFilter: 'InitialFilter',
                            },
                            '',
                            '',
                            [],
                            processQuery,
                            {},
                            datasource
                        );

                        await waitFor(() => {
                            expect(datasource.transformQuery).toHaveBeenCalledWith('InitialFilter');
                            expect(datasource.getColumnOptionsWithVariables).toHaveBeenCalledWith('TRANSFORMED_InitialFilter');
                        });
                    });

                    it('should call transformQuery before deciding to load column options', async () => {
                        const datasource = {
                            processQuery: jest.fn(query => ({ ...defaultQueryV2, ...query })),
                            getColumnOptionsWithVariables: jest.fn().mockResolvedValue([{ label: 'Col1', value: 'Col1' }]),
                            transformQuery: jest.fn(f => f),
                        } as any;
                        renderComponent(
                            {
                                ...defaultQueryV2,
                                refId: 'A',
                                type: DataFrameQueryType.Data,
                                dataTableFilter: 'FilterX',
                            },
                            '',
                            '',
                            [],
                            processQuery,
                            {},
                            datasource
                        );
                        
                        await waitFor(() => expect(datasource.transformQuery).toHaveBeenCalledWith('FilterX'));
                        expect(datasource.getColumnOptionsWithVariables).toHaveBeenCalledWith('FilterX');
                    });
                })

                describe('column option population based on variables cache', () => {
                    it('should trigger useEffect when variables cache object reference changes', async () => {
                        const initialVariablesCache = { var1: 'value1' };
                        const updatedVariablesCache = { var1: 'value2' };
                        const datasource = {
                            processQuery: jest.fn(query => ({ ...defaultQueryV2, ...query })),
                            getColumnOptionsWithVariables: jest.fn().mockResolvedValue([{ label: 'Col1', value: 'Col1' }]),
                            transformQuery: jest.fn(f => f),
                        } as any;

                        renderComponent(
                            {
                                    ...defaultQueryV2,
                                    refId: 'A',
                                    type: DataFrameQueryType.Data,
                                    dataTableFilter: 'FilterWithVar',
                                },
                            '',
                            '',
                            [],
                            processQuery,
                            initialVariablesCache,
                            datasource,
                        );

                        await waitFor(() => {
                            expect(datasource.transformQuery).toHaveBeenCalledWith('FilterWithVar');
                            expect(datasource.getColumnOptionsWithVariables).toHaveBeenCalledWith('FilterWithVar');
                        });

                        datasource.getColumnOptionsWithVariables.mockClear();
                        datasource.transformQuery.mockClear();

                        // Update variables cache reference and rerender
                        renderComponent(
                            {
                                    ...defaultQueryV2,
                                    refId: 'A',
                                    type: DataFrameQueryType.Data,
                                    dataTableFilter: 'FilterWithVar',
                                },
                            '',
                            '',
                            [],
                            processQuery,
                            updatedVariablesCache,
                            datasource
                        );

                        await waitFor(() => {
                            expect(datasource.transformQuery).toHaveBeenCalledWith('FilterWithVar');
                        });
                    });
                });

                describe("columns value setting", () => {
                    beforeAll(() => {
                        // Mock offsetHeight for combobox virtualization so options render in tests
                        jest.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(300);
                    });

                    it("should be set with a value when a list of columns is provided in the query", async () => {
                        renderComponent({
                            type: DataFrameQueryType.Data,
                            dataTableFilter: 'name = "TestTable"',
                            columns: ['ColumnD-String']
                        });

                        await waitFor(() => {
                            expect(document.body).toHaveTextContent('ColumnD (String)');
                        });
                    });

                    it("should be set with a value when the processQuery returns an observable", async () => {
                        const columns = of(['ColumnB-Numeric']);
                        const processQueryOverride = jest
                            .fn<DataFrameQuery, [ValidDataFrameQueryV2]>()
                            .mockImplementation(query => ({
                                ...defaultQueryV2,
                                ...query,
                                columns
                            }));

                        renderComponent(
                            {
                                type: DataFrameQueryType.Data,
                                dataTableFilter: 'name = "TestTable"',
                                columns: ['ColumnB']
                            },
                            '',
                            '',
                            [],
                            processQueryOverride
                        );

                        await waitFor(() => {
                            expect(document.body).toHaveTextContent('ColumnB (Numeric)');
                        });
                    });

                    it("should call onChange with a list of columns when processQuery returns an observable", async () => {
                        const columns = of(['ColumnB-Numeric', 'ColumnD-String']);
                        const processQueryOverride = jest
                            .fn<DataFrameQuery, [ValidDataFrameQueryV2]>()
                            .mockImplementation(query => ({
                                ...defaultQueryV2,
                                ...query,
                                columns
                            }));

                        const { onChange } = renderComponent(
                            {
                                type: DataFrameQueryType.Data,
                                dataTableFilter: 'name = "TestTable"',
                                columns: ['ColumnB', 'ColumnD']
                            },
                            '',
                            '',
                            [],
                            processQueryOverride
                        );

                        await waitFor(() => {
                            expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
                                columns: ['ColumnB-Numeric', 'ColumnD-String']
                            }));
                        });
                    });

                    it("should call onRunQuery with a list of columns when processQuery returns an observable", async () => {
                        const columns = of(['ColumnB-Numeric', 'ColumnD-String']);
                        const processQueryOverride = jest
                            .fn<DataFrameQuery, [ValidDataFrameQueryV2]>()
                            .mockImplementation(query => ({
                                ...defaultQueryV2,
                                ...query,
                                columns
                            }));

                        const { onRunQuery } = renderComponent(
                            {
                                type: DataFrameQueryType.Data,
                                dataTableFilter: 'name = "TestTable"',
                                columns: ['ColumnB', 'ColumnD']
                            },
                            '',
                            '',
                            [],
                            processQueryOverride
                        );

                        await waitFor(() => {
                            expect(onRunQuery).toHaveBeenCalled();
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

        describe("alert", () => {
            beforeEach(() => {
                cleanup();
                renderComponent(
                    {
                        type: DataFrameQueryType.Properties,
                        dataTableProperties: [],
                        columnProperties: []
                    }
                );
                user = userEvent.setup();
            });

            it('should render error alert when no properties are selected', async () => {
                const alert = screen.queryByRole('alert');

                expect(alert).toBeInTheDocument();
                expect(alert).toHaveTextContent(errorMessages.propertiesNotSelected);
            });

            it('should not render error alert when at least one data tabe property is selected', async () => {
                const dataTablePropertiesField = renderResult.getAllByRole('combobox')[0];

                await selectProperty(
                    dataTablePropertiesField,
                    DataTableProjectionLabelLookup.Properties.label,
                    user
                );

                await waitFor(() => {
                    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
                });
            });

            it('should not render error alert when at least one column property is selected', async () => {
                const columnPropertiesField = renderResult.getAllByRole('combobox')[1];

                await selectProperty(
                    columnPropertiesField,
                    DataTableProjectionLabelLookup.ColumnType.label,
                    user
                );

                await waitFor(() => {
                    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
                });
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
            } as Event & { detail: { linq: string; }; };

            onDataTableFilterChange(mockEvent);

            await waitFor(() => {
                expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
                    dataTableFilter: 'NewFilter'
                }));
                expect(onRunQuery).toHaveBeenCalled();
            });
        });

        it("should not call onChange or onRunQuery when the dataTableFilter remains unchanged", async () => {
            const { onChange, onRunQuery } = renderComponent({
                type: DataFrameQueryType.Data,
                dataTableFilter: 'SameFilter'
            });

            // Get the onDataTableFilterChange callback from the mock
            const [[props]] = (DataFrameQueryBuilderWrapper as jest.Mock).mock.calls;
            const { onDataTableFilterChange } = props;

            // Simulate the filter change event with the same filter
            const mockEvent = {
                detail: { linq: "SameFilter" }
            } as Event & { detail: { linq: string; }; };

            onDataTableFilterChange(mockEvent);

            await waitFor(() => {
                expect(onChange).not.toHaveBeenCalled();
                expect(onRunQuery).not.toHaveBeenCalled();
            });
        });

        it("should verify dataTableFilter is passed correctly", () => {
            renderComponent({ type: DataFrameQueryType.Data, dataTableFilter: 'TestFilter' });

            const [[props]] = (DataFrameQueryBuilderWrapper as jest.Mock).mock.calls;

            expect(props.dataTableFilter).toBe('TestFilter');
        });

        it("should pass columnsFilter to the query builder wrapper", () => {
            renderComponent({ type: DataFrameQueryType.Data, columnsFilter: 'InitialColumnsFilter' });

            expect(DataFrameQueryBuilderWrapper).toHaveBeenCalledWith(
                expect.objectContaining({
                    columnsFilter: 'InitialColumnsFilter',
                    onColumnsFilterChange: expect.any(Function),
                }),
                expect.anything() // React context
            );
        });

        it("should call onChange with updated columnsFilter when columns filter changes", async () => {
            const { onChange } = renderComponent({ type: DataFrameQueryType.Data });

            // Get the onColumnsFilterChange callback from the mock
            const [[props]] = (DataFrameQueryBuilderWrapper as jest.Mock).mock.calls;
            const { onColumnsFilterChange } = props;

            // Simulate the filter change event
            const mockEvent = {
                detail: { linq: "NewColumnsFilter" }
            } as Event & { detail: { linq: string; }; };

            onColumnsFilterChange(mockEvent);

            await waitFor(() => {
                expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
                    columnsFilter: 'NewColumnsFilter'
                }));
            });
        });

        it("should not call onChange or onRunQuery when the columnsFilter remains unchanged", async () => {
            const { onChange, onRunQuery } = renderComponent({
                type: DataFrameQueryType.Data,
                columnsFilter: 'SameColumnsFilter'
            });

            // Get the onColumnsFilterChange callback from the mock
            const [[props]] = (DataFrameQueryBuilderWrapper as jest.Mock).mock.calls;
            const { onColumnsFilterChange } = props;

            // Simulate the filter change event with the same filter
            const mockEvent = {
                detail: { linq: "SameColumnsFilter" }
            } as Event & { detail: { linq: string; }; };

            onColumnsFilterChange(mockEvent);

            await waitFor(() => {
                expect(onChange).not.toHaveBeenCalled();
                expect(onRunQuery).not.toHaveBeenCalled();
            });
        });

        it('should pass resultsFilter to the query builder wrapper', () => {
            renderComponent({ type: DataFrameQueryType.Data, resultsFilter: 'InitialResultsFilter' });

            expect(DataFrameQueryBuilderWrapper).toHaveBeenCalledWith(
                expect.objectContaining({
                    resultsFilter: 'InitialResultsFilter',
                    onResultsFilterChange: expect.any(Function),
                }),
                expect.anything() // React context
            );
        });

        it('should call onChange with updated resultsFilter when results filter changes', async () => {
            const { onChange } = renderComponent({ type: DataFrameQueryType.Data });

            // Get the onResultsFilterChange callback from the mock
            const [[props]] = (DataFrameQueryBuilderWrapper as jest.Mock).mock.calls;
            const { onResultsFilterChange } = props;

            // Simulate the filter change event
            const mockEvent = {
                detail: { linq: 'NewResultsFilter' }
            } as Event & { detail: { linq: string; }; };

            onResultsFilterChange(mockEvent);

            await waitFor(() => {
                expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
                    resultsFilter: 'NewResultsFilter'
                }));
            });
        });

        it('should not call onChange or onRunQuery when the resultsFilter remains unchanged', async () => {
            const { onChange, onRunQuery } = renderComponent({
                type: DataFrameQueryType.Data,
                resultsFilter: 'SameResultsFilter'
            });

            // Get the onResultsFilterChange callback from the mock
            const [[props]] = (DataFrameQueryBuilderWrapper as jest.Mock).mock.calls;
            const { onResultsFilterChange } = props;

            // Simulate the filter change event with the same filter
            const mockEvent = {
                detail: { linq: 'SameResultsFilter' }
            } as Event & { detail: { linq: string; }; };

            onResultsFilterChange(mockEvent);

            await waitFor(() => {
                expect(onChange).not.toHaveBeenCalled();
                expect(onRunQuery).not.toHaveBeenCalled();
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
