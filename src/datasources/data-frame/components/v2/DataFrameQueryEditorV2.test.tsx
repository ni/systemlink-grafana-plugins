jest.mock('datasources/data-frame/constants', () => {
    const actual = jest.requireActual('datasources/data-frame/constants');
    return { ...actual, COLUMN_OPTIONS_LIMIT: 10 }; // reduce column option limit for tests
});

jest.mock('@grafana/runtime', () => ({
    ...jest.requireActual('@grafana/runtime'),
    locationService: {
        getSearchObject: jest.fn(),
        partial: jest.fn(),
    },
}));

jest.mock('react-router', () => ({
    ...jest.requireActual('react-router'),
    useLocation: jest.fn(),
}));

import React from "react";
import { cleanup, render, RenderResult, screen, waitFor, within } from "@testing-library/react";
import userEvent, { UserEvent } from "@testing-library/user-event";
import { DataFrameQueryEditorV2 } from "./DataFrameQueryEditorV2";
import { DataFrameQueryV2, DataFrameQueryType, ValidDataFrameQuery, ValidDataFrameQueryV2, defaultQueryV2, DataTableProjectionLabelLookup, DataTableProperties, DataFrameDataQuery } from "../../types";
import { DataFrameDataSource } from "datasources/data-frame/DataFrameDataSource";
import { DataFrameQueryBuilderWrapper } from "./query-builders/DataFrameQueryBuilderWrapper";
import { COLUMN_OPTIONS_LIMIT } from "datasources/data-frame/constants";
import { ComboboxOption } from "@grafana/ui";
import { errorMessages, infoMessage } from "datasources/data-frame/constants/v2/DataFrameQueryEditorV2.constants";
import { of } from "rxjs";
import { locationService } from '@grafana/runtime';
import { useLocation } from 'react-router';
import { DataFrameQueryParamsHandler } from 'datasources/data-frame/datasources/v2/DataFrameQueryParamsHandler';

jest.mock("./query-builders/DataFrameQueryBuilderWrapper", () => ({
    DataFrameQueryBuilderWrapper: jest.fn(() => <div data-testid="mock-data-frame-query-builder-wrapper" />)
}));

const mockParseColumnIdentifier = (columnIdentifier: string) => {
  const parts = columnIdentifier.split('-');
  // Remove transformed column type
  const transformedDataType = parts.pop() ?? '';
  const columnName = parts.join('-');

  return {
    columnName,
    transformedDataType,
  };
};

const mockHasRequiredFilters = jest.fn((query: ValidDataFrameQueryV2) => {
    return (query.resultFilter !== '' || query.dataTableFilter !== '');
});

const renderComponent = (
    queryOverrides: Partial<DataFrameDataQuery> = {},
    errorTitle = '',
    errorDescription = '',
    columnOptions: ComboboxOption[] = [],
    xColumnOptions: ComboboxOption[] = [],
    processQueryOverride?: jest.Mock<ValidDataFrameQuery, [DataFrameDataQuery, DataFrameDataQuery[]]>,
    variablesCache: Record<string, string> = {},
    mockDatasource: Partial<DataFrameDataSource> = {},
    queries: DataFrameDataQuery[] = []
) => {
    const onChange = jest.fn();
    const onRunQuery = jest.fn();
    const processQuery = processQueryOverride ?? jest
        .fn<ValidDataFrameQuery, [DataFrameDataQuery, DataFrameDataQuery[]]>()
        .mockImplementation((query, _queries) => ({ ...defaultQueryV2, ...query }));
    const datasource = {
        errorTitle,
        errorDescription,
        processQuery,
        getColumnOptionsWithVariables: jest.fn().mockResolvedValue({
            uniqueColumnsAcrossTables: [
                { label: 'ColumnA', value: 'ColumnA-String' },
                { label: 'ColumnB (Numeric)', value: 'ColumnB-Numeric' },
                { label: 'ColumnB (String)', value: 'ColumnB-String' },
                { label: 'ColumnD', value: 'ColumnD-String' },
                { label: 'ColumnE', value: 'ColumnE-String' },
                ...columnOptions
            ],
            commonColumnsAcrossTables: [
                { label: 'ColumnA', value: 'ColumnA' },
                ...xColumnOptions
            ]
        }),
        transformDataTableQuery: jest.fn((filter: string) => filter),
        transformResultQuery: jest.fn((filter: string) => filter),
        transformColumnQuery: jest.fn((filter: string) => filter),
        hasRequiredFilters: mockHasRequiredFilters,
        variablesCache,
        parseColumnIdentifier: mockParseColumnIdentifier,
        instanceSettings: {
            jsonData: {
                featureToggles: {
                    queryUndecimatedData: true,
                    highResolutionZoom: true
                }
            }
        },
        ...mockDatasource
    } as unknown as DataFrameDataSource;

    const initialQuery = {
        refId: 'A',
        ...queryOverrides,
    } as DataFrameQueryV2;

    const renderResult = render(
        <DataFrameQueryEditorV2
            datasource={datasource}
            query={initialQuery}
            queries={queries}
            onChange={onChange}
            onRunQuery={onRunQuery}
        />
    );

    onChange.mockImplementation(newQuery => {
        renderResult.rerender(
            <DataFrameQueryEditorV2
                datasource={datasource}
                query={newQuery}
                queries={queries}
                onChange={onChange}
                onRunQuery={onRunQuery}
            />
        );
    });

    return { renderResult, onChange, onRunQuery, processQuery, datasource, initialQuery };
};

describe("DataFrameQueryEditorV2", () => {
    let mockGetSearchObject: jest.Mock;
    let mockPartial: jest.Mock;
    let mockUseLocation: jest.Mock;

    beforeEach(() => {
        mockGetSearchObject = locationService.getSearchObject as jest.Mock;
        mockPartial = locationService.partial as jest.Mock;
        mockUseLocation = useLocation as jest.Mock;

        mockGetSearchObject.mockReturnValue({});
        mockPartial.mockImplementation(() => {});
        mockUseLocation.mockReturnValue({ search: '' });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it("should call processQuery with the initial query and queries array", () => {
        const query1: DataFrameDataQuery = {
            type: DataFrameQueryType.Data,
            tableId: 'Table1',
            refId: 'A',
        };

        const query2: DataFrameDataQuery = {
            type: DataFrameQueryType.Data,
            tableId: 'Table2',
            refId: 'B',
        };

        const { processQuery } = renderComponent(
            query1,
            '',
            '',
            [],
            [],
            undefined,
            {},
            undefined,
            [query1, query2]
        );

        expect(processQuery).toHaveBeenCalledWith(
            query1,
            [query1, query2]
        );
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

    it("should call onRunQuery on first render when query matches default query", async () => {
        const { onChange, onRunQuery } = renderComponent({});

        await waitFor(() => {
            expect(onRunQuery).toHaveBeenCalled();
            expect(onChange).not.toHaveBeenCalled();
        });
    });

    it("should not call onRunQuery on first render when query is not default", async () => {
        const { onChange, onRunQuery } = renderComponent({
            type: DataFrameQueryType.Data,
            dataTableFilter: 'SomeFilter',
        });

        await waitFor(() => {
            expect(onRunQuery).not.toHaveBeenCalled();
            expect(onChange).not.toHaveBeenCalled();
        });
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

                const processQuery = jest.fn((query, _queries) => ({ ...defaultQueryV2, ...query }));

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
                            'ColumnD',
                            'ColumnE'
                        ]
                    ));
                });

                it('should only show metadata column options when filter is empty', async () => {
                    renderComponent({ dataTableFilter: '', resultFilter: '' });

                    await clickColumnOptions();

                    const options = within(document.body).queryAllByRole('option');
                    expect(options.length).toBe(2);
                    expect(options.map(opt => opt.textContent)).toEqual(
                        expect.arrayContaining(['MetadataData table ID', 'Data table name'])
                    );
                });

                it('should only show metadata column options when only column filter is set', async () => {
                    renderComponent({ columnFilter: 'ColumnB' });
                    
                    await clickColumnOptions();

                    const options = within(document.body).queryAllByRole('option');
                    expect(options.length).toBe(2);
                    expect(options.map(opt => opt.textContent)).toEqual(
                        expect.arrayContaining(['MetadataData table ID', 'Data table name'])
                    );
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
                    describe('when column limit is exceeded', () => {
                        beforeEach(async () => {
                            cleanup();
                            jest.clearAllMocks();

                            const columnOptions = [
                                { label: 'Data table ID', value: 'Data table ID-Metadata' },
                                { label: 'Data table name', value: 'Data table name-Metadata' },
                                ...Array.from({ length: COLUMN_OPTIONS_LIMIT + 25 }, (_, i) => ({
                                    label: `Column${i + 1}`,
                                    value: `Column${i + 1}`,
                                }))
                            ];

                            // Increase offsetHeight to allow more options to be rendered in the test environment
                            jest.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(300);
                            const result = renderComponent({ dataTableFilter: ' ' }, '', '', columnOptions);
                            datasource = result.datasource;

                            await changeFilterValue();
                        });

                        it(`should limit column options to ${COLUMN_OPTIONS_LIMIT + 2} as metadata options are included in the dropdown`, async () => {
                            await clickColumnOptions();
                            const optionTexts = getColumnOptionTexts();
                            expect(optionTexts.length).toBe(COLUMN_OPTIONS_LIMIT + 2);
                            expect(optionTexts).toContain('Data table ID');
                            expect(optionTexts).toContain('Data table name');
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

                        expect(datasource.getColumnOptionsWithVariables).toHaveBeenCalledWith({
                            dataTableFilter: 'ExistingFilter',
                            resultFilter: '',
                            columnFilter: ''
                        });

                        // Column options should be fetched and available
                        await waitFor(() => {
                            const optionControls = within(document.body).getAllByRole('option');
                            const texts = optionControls.map(option => option.textContent);
                            expect(texts).toEqual(
                                expect.arrayContaining([
                                    'ColumnA',
                                    'ColumnB (Numeric)',
                                    'ColumnB (String)',
                                    'ColumnD',
                                    'ColumnE',
                                ])
                            );
                        });
                    });

                    it('should only show metadata options when switching to Data query type with existing empty filter', async () => {
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
                            expect(optionControls.length).toBe(2);
                            expect(optionControls.map(opt => opt.textContent)).toEqual(
                                expect.arrayContaining(['MetadataData table ID', 'Data table name'])
                            );
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
                                    'ColumnD',
                                    'ColumnE',
                                ])
                            );
                        });
                        expect(datasource.getColumnOptionsWithVariables).toHaveBeenCalledWith({
                            dataTableFilter: 'UpdatedFilter',
                            resultFilter: '',
                            columnFilter: ''
                        });
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
                            expect(datasource.getColumnOptionsWithVariables).toHaveBeenCalledWith({
                                dataTableFilter: 'UpdatedFilter',
                                resultFilter: '',
                                columnFilter: ''
                            });
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
                            getColumnOptionsWithVariables: jest.fn().mockResolvedValue({
                                uniqueColumnsAcrossTables: mockColumnOptions,
                                commonColumnsAcrossTables: []
                            }),
                            transformDataTableQuery: jest.fn(f => f),
                            transformResultQuery: jest.fn(f => f),
                            transformColumnQuery: jest.fn(f => f),
                            hasRequiredFilters: mockHasRequiredFilters,
                        } as any;

                            renderComponent({
                                ...defaultQueryV2,
                                refId: 'A',
                                type: DataFrameQueryType.Data,
                                dataTableFilter: 'InitialFilter',
                                columnFilter: '',
                            }, '', '', [], [], processQuery, {}, datasource);

                        await waitFor(() => {
                            expect(datasource.getColumnOptionsWithVariables).toHaveBeenCalledWith({
                                dataTableFilter: 'InitialFilter',
                                resultFilter: '',
                                columnFilter: ''
                            });
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
                                onChange={() => { }}
                                onRunQuery={() => { }}
                            />
                        );

                        await waitFor(() => expect(datasource.getColumnOptionsWithVariables).not.toHaveBeenCalled());
                    });

                    it('should call getColumnOptionsWithVariables with transformed filters on initial render', async () => {
                        const datasource = {
                            processQuery: jest.fn(query => ({ ...defaultQueryV2, ...query })),
                            getColumnOptionsWithVariables: jest.fn().mockResolvedValue({
                                uniqueColumnsAcrossTables: [{ label: 'Col1', value: 'Col1' }],
                                commonColumnsAcrossTables: []
                            }),
                            transformDataTableQuery: jest.fn((filter: string) => `TRANSFORMED_${filter}`),
                            transformResultQuery: jest.fn((filter: string) => `TRANSFORMED_${filter}`),
                            transformColumnQuery: jest.fn((filter: string) => `TRANSFORMED_${filter}`),
                            hasRequiredFilters: mockHasRequiredFilters,
                        } as any;

                        renderComponent(
                            {
                                ...defaultQueryV2,
                                refId: 'A',
                                type: DataFrameQueryType.Data,
                                dataTableFilter: 'InitialDataTableFilter',
                                resultFilter: 'InitialResultFilter',
                                columnFilter: 'InitialColumnFilter',
                            },
                            '',
                            '',
                            [],
                            [],
                            processQuery,
                            {},
                            datasource
                        );

                        await waitFor(() => {
                            expect(datasource.transformDataTableQuery).toHaveBeenCalledWith('InitialDataTableFilter');
                            expect(datasource.transformResultQuery).toHaveBeenCalledWith('InitialResultFilter');
                            expect(datasource.transformColumnQuery).toHaveBeenCalledWith('InitialColumnFilter');
                            expect(datasource.getColumnOptionsWithVariables).toHaveBeenCalledWith({
                                dataTableFilter: 'TRANSFORMED_InitialDataTableFilter',
                                resultFilter: 'TRANSFORMED_InitialResultFilter',
                                columnFilter: 'TRANSFORMED_InitialColumnFilter'
                            });
                        });
                    });

                    it('should transform variables before deciding to load column options', async () => {
                        const datasource = {
                            processQuery: jest.fn(query => ({ ...defaultQueryV2, ...query })),
                            getColumnOptionsWithVariables: jest.fn().mockResolvedValue({
                                uniqueColumnsAcrossTables: [{ label: 'Col1', value: 'Col1' }],
                                commonColumnsAcrossTables: []
                            }),
                            transformDataTableQuery: jest.fn(f => f),
                            transformResultQuery: jest.fn(f => f),
                            transformColumnQuery: jest.fn(f => f),
                            hasRequiredFilters: mockHasRequiredFilters,
                        } as any;
                        renderComponent(
                            {
                                ...defaultQueryV2,
                                refId: 'A',
                                type: DataFrameQueryType.Data,
                                dataTableFilter: 'FilterX',
                                resultFilter: 'FilterY',
                                columnFilter: 'FilterZ',
                            },
                            '',
                            '',
                            [],
                            [],
                            processQuery,
                            {},
                            datasource
                        );
                        
                        await waitFor(() => {
                            expect(datasource.transformDataTableQuery).toHaveBeenCalledWith('FilterX');
                            expect(datasource.transformResultQuery).toHaveBeenCalledWith('FilterY');
                            expect(datasource.transformColumnQuery).toHaveBeenCalledWith('FilterZ');
                        });
                        expect(datasource.getColumnOptionsWithVariables).toHaveBeenCalledWith({
                            dataTableFilter: 'FilterX',
                            resultFilter: 'FilterY',
                            columnFilter: 'FilterZ'
                        });
                    });
                });

                describe('column option population based on variables cache', () => {
                    it('should trigger useEffect when variables cache object reference changes', async () => {
                        const initialVariablesCache = { var1: 'value1' };
                        const updatedVariablesCache = { var1: 'value2' };
                        const datasource = {
                            processQuery: jest.fn(query => ({ ...defaultQueryV2, ...query })),
                            getColumnOptionsWithVariables: jest.fn().mockResolvedValue({
                                uniqueColumnsAcrossTables: [{ label: 'Col1', value: 'Col1' }],
                                commonColumnsAcrossTables: []
                            }),
                            transformDataTableQuery: jest.fn(f => f),
                            transformResultQuery: jest.fn(f => f),
                            transformColumnQuery: jest.fn(f => f),
                            hasRequiredFilters: mockHasRequiredFilters,
                        } as any;

                        renderComponent(
                            {
                                    ...defaultQueryV2,
                                    refId: 'A',
                                    type: DataFrameQueryType.Data,
                                    dataTableFilter: 'FilterWithVar',
                                    resultFilter: 'ResultWithVar',
                                    columnFilter: 'ColumnWithVar',
                                },
                            '',
                            '',
                            [],
                            [],
                            processQuery,
                            initialVariablesCache,
                            datasource,
                        );

                        await waitFor(() => {
                            expect(datasource.transformDataTableQuery).toHaveBeenCalledWith('FilterWithVar');
                            expect(datasource.transformResultQuery).toHaveBeenCalledWith('ResultWithVar');
                            expect(datasource.transformColumnQuery).toHaveBeenCalledWith('ColumnWithVar');
                            expect(datasource.getColumnOptionsWithVariables).toHaveBeenCalledWith({
                                dataTableFilter: 'FilterWithVar',
                                resultFilter: 'ResultWithVar',
                                columnFilter: 'ColumnWithVar'
                            });
                        });

                        datasource.getColumnOptionsWithVariables.mockClear();
                        datasource.transformDataTableQuery.mockClear();

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
                            [],
                            processQuery,
                            updatedVariablesCache,
                            datasource
                        );

                        await waitFor(() => {
                            expect(datasource.transformDataTableQuery).toHaveBeenCalledWith('FilterWithVar');
                        });
                    });
                });

                it('should only refetch column options when either resultFilter or dataTableFilter changes', async () => {
                    const datasource = {
                        processQuery: jest.fn(query => ({ ...defaultQueryV2, ...query })),
                        getColumnOptionsWithVariables: jest.fn().mockResolvedValue({
                            uniqueColumnsAcrossTables: [{ label: 'Col1', value: 'Col1' }],
                            commonColumnsAcrossTables: []
                        }),
                        transformDataTableQuery: jest.fn((filter: string) => filter),
                        transformResultQuery: jest.fn((filter: string) => filter),
                        transformColumnQuery: jest.fn((filter: string) => filter),
                        hasRequiredFilters: mockHasRequiredFilters,
                    } as any;

                    const { onChange } = renderComponent(
                        {
                            ...defaultQueryV2,
                            refId: 'A',
                            type: DataFrameQueryType.Data,
                            dataTableFilter: 'name = "Table1"',
                            resultFilter: 'status = "Passed"',
                            columnFilter: '',
                        },
                        '',
                        '',
                        [],
                        [],
                        undefined,
                        {},
                        datasource
                    );

                    await waitFor(() => {
                        expect(datasource.getColumnOptionsWithVariables).toHaveBeenCalledTimes(1);
                    });

                    datasource.getColumnOptionsWithVariables.mockClear();

                    // Update resultFilter only
                    onChange({
                        ...defaultQueryV2,
                        refId: 'A',
                        type: DataFrameQueryType.Data,
                        dataTableFilter: 'name = "Table1"',
                        resultFilter: 'status = "Failed"',
                        columnFilter: '',
                    });

                    await waitFor(() => {
                        expect(datasource.getColumnOptionsWithVariables).toHaveBeenCalledTimes(1);
                        expect(datasource.getColumnOptionsWithVariables).toHaveBeenCalledWith({
                            dataTableFilter: 'name = "Table1"',
                            resultFilter: 'status = "Failed"',
                            columnFilter: '',
                        });
                    });
                });

                it('should refetch column options when columnFilter changes', async () => {
                    const datasource = {
                        processQuery: jest.fn(query => ({ ...defaultQueryV2, ...query })),
                        getColumnOptionsWithVariables: jest.fn().mockResolvedValue({
                            uniqueColumnsAcrossTables: [{ label: 'Col1', value: 'Col1' }],
                            commonColumnsAcrossTables: []
                        }),
                        transformDataTableQuery: jest.fn((filter: string) => filter),
                        transformResultQuery: jest.fn((filter: string) => filter),
                        transformColumnQuery: jest.fn((filter: string) => filter),
                        hasRequiredFilters: mockHasRequiredFilters,
                    } as any;

                    const { onChange } = renderComponent(
                        {
                            ...defaultQueryV2,
                            refId: 'A',
                            type: DataFrameQueryType.Data,
                            dataTableFilter: 'name = "Table1"',
                            resultFilter: '',
                            columnFilter: 'columnName = "Col1"',
                        },
                        '',
                        '',
                        [],
                        [],
                        undefined,
                        {},
                        datasource
                    );

                    await waitFor(() => {
                        expect(datasource.getColumnOptionsWithVariables).toHaveBeenCalledTimes(1);
                    });

                    datasource.getColumnOptionsWithVariables.mockClear();

                    // Update columnFilter only
                    onChange({
                        ...defaultQueryV2,
                        refId: 'A',
                        type: DataFrameQueryType.Data,
                        dataTableFilter: 'name = "Table1"',
                        resultFilter: '',
                        columnFilter: 'columnName = "Col2"',
                    });

                    await waitFor(() => {
                        expect(datasource.getColumnOptionsWithVariables).toHaveBeenCalledTimes(1);
                        expect(datasource.getColumnOptionsWithVariables).toHaveBeenCalledWith({
                            dataTableFilter: 'name = "Table1"',
                            resultFilter: '',
                            columnFilter: 'columnName = "Col2"',
                        });
                    });
                });

                it('should not refetch column options when filters remain the same after variable substitution', async () => {
                    const datasource = {
                        processQuery: jest.fn(query => ({ ...defaultQueryV2, ...query })),
                        getColumnOptionsWithVariables: jest.fn().mockResolvedValue({
                            uniqueColumnsAcrossTables: [{ label: 'Col1', value: 'Col1' }],
                            commonColumnsAcrossTables: []
                        }),
                        transformDataTableQuery: jest.fn(() => 'name = "Table1"'),
                        transformResultQuery: jest.fn(() => 'status = "Passed"'),
                        transformColumnQuery: jest.fn(() => 'columnName = "Col1"'),
                        hasRequiredFilters: mockHasRequiredFilters,
                    } as any;

                    const { onChange } = renderComponent(
                        {
                            ...defaultQueryV2,
                            refId: 'A',
                            type: DataFrameQueryType.Data,
                            dataTableFilter: 'name = "$tableName"',
                            resultFilter: 'status = "$status"',
                            columnFilter: 'columnName = "$columnName"',
                        },
                        '',
                        '',
                        [],
                        [],
                        undefined,
                        {},
                        datasource
                    );

                    await waitFor(() => {
                        expect(datasource.getColumnOptionsWithVariables).toHaveBeenCalledTimes(1);
                    });

                    datasource.getColumnOptionsWithVariables.mockClear();

                    // Update with same filter values (variables expand to same values)
                    onChange({
                        ...defaultQueryV2,
                        refId: 'A',
                        type: DataFrameQueryType.Data,
                        dataTableFilter: 'name = "$tableName"',
                        resultFilter: 'status = "$status"',
                        columnFilter: 'columnName = "$columnName"',
                    });

                    // Should not refetch since transformed values are the same
                    await waitFor(() => {
                        expect(datasource.getColumnOptionsWithVariables).not.toHaveBeenCalled();
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
                            expect(document.body).toHaveTextContent('ColumnD');
                        });
                    });

                    it("should call onChange with a list of columns when processQuery returns an observable", async () => {
                        const columns = of(['ColumnB-Numeric', 'ColumnD-String']);
                        const processQueryOverride = jest
                            .fn<ValidDataFrameQuery, [DataFrameDataQuery, DataFrameDataQuery[]]>()
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
                            .fn<ValidDataFrameQuery, [DataFrameDataQuery, DataFrameDataQuery[]]>()
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
                            [],
                            processQueryOverride
                        );

                        await waitFor(() => {
                            expect(onRunQuery).toHaveBeenCalled();
                        });
                    });
                });

                describe('onColumnsChange', () => {
                    let user: UserEvent;
                    let onChange: jest.Mock;
                    let onRunQuery: jest.Mock;

                    beforeAll(() => {
                        jest.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(300);
                    });

                    beforeEach(async () => {
                        user = userEvent.setup();
                        cleanup();
                        jest.clearAllMocks();
                        const result = renderComponent({
                            type: DataFrameQueryType.Data,
                            dataTableFilter: '',
                            columns: [],
                        });
                        onChange = result.onChange;
                        onRunQuery = result.onRunQuery;

                        await changeFilterValue('TestFilter');
                        // Wait for columns to be loaded
                        await new Promise(resolve => setTimeout(resolve, 50));
                        onChange.mockClear();
                    });

                    it('should update the query with selected columns when columns are added', async () => {
                        await clickColumnOptions();

                        const columnOption = await screen.findByRole('option', { name: 'ColumnA' });
                        await user.click(columnOption);

                        await waitFor(() => {
                            expect(onChange).toHaveBeenCalledWith(
                                expect.objectContaining({
                                    columns: ['ColumnA-String'],
                                })
                            );
                            expect(onRunQuery).toHaveBeenCalled();
                        });
                    });

                    it('should update the query with multiple selected columns', async () => {
                        // Add first column
                        await clickColumnOptions();
                        const firstColumnOption = await screen.findByRole('option', { name: 'ColumnA' });
                        await user.click(firstColumnOption);

                        await waitFor(() => {
                            expect(onChange).toHaveBeenCalledWith(
                                expect.objectContaining({
                                    columns: ['ColumnA-String'],
                                })
                            );
                        });
                        onChange.mockClear();

                        // Wait for re-render to complete after first selection
                        await waitFor(() => {
                            expect(screen.getAllByRole('combobox')[0]).toBeInTheDocument();
                        });

                        // The MultiCombobox should still be open, find the second option
                        const secondColumnOption = await screen.findByRole('option', { name: 'ColumnB (Numeric)' });
                        await user.click(secondColumnOption);
                        await waitFor(() => {
                            expect(onChange).toHaveBeenCalledWith(
                                expect.objectContaining({
                                    columns: ['ColumnA-String', 'ColumnB-Numeric'],
                                })
                            );
                        });
                        expect(onRunQuery).toHaveBeenCalled();
                    });

                    it('should update the query when a column is removed', async () => {
                        const { onChange, onRunQuery } = renderComponent({
                            type: DataFrameQueryType.Data,
                            dataTableFilter: 'TestFilter',
                            columns: ['ColumnA-String', 'ColumnB-Numeric'],
                        });

                        const removeButton = screen.getAllByLabelText(/remove/i)[0];
                        await user.click(removeButton);

                        await waitFor(() => {
                            expect(onChange).toHaveBeenCalledWith(
                                expect.objectContaining({
                                    columns: ['ColumnB-Numeric'],
                                })
                            );
                            expect(onRunQuery).toHaveBeenCalled();
                        });
                    });

                    it('should update the query with an empty array when all columns are removed', async () => {
                        const { onChange, onRunQuery } = renderComponent({
                            type: DataFrameQueryType.Data,
                            dataTableFilter: 'TestFilter',
                            columns: ['ColumnA-String'],
                        });

                        const removeButton = screen.getByLabelText(/remove/i);
                        await user.click(removeButton);

                        await waitFor(() => {
                            expect(onChange).toHaveBeenCalledWith(
                                expect.objectContaining({
                                    columns: [],
                                })
                            );
                            expect(onRunQuery).toHaveBeenCalled();
                        });
                    });
                });

                describe('column validation and error handling', () => {
                    let mockDatasource: any;

                    beforeAll(() => {
                        jest.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(300);
                    });

                    beforeEach(() => {
                        cleanup();
                        jest.clearAllMocks();

                        mockDatasource = {
                            processQuery: jest.fn(query => ({ ...defaultQueryV2, ...query })),
                            getColumnOptionsWithVariables: jest.fn().mockResolvedValue({
                                uniqueColumnsAcrossTables: [
                                    { label: 'ColumnA', value: 'ColumnA-String' },
                                    { label: 'ColumnB (Numeric)', value: 'ColumnB-Numeric' },
                                    { label: 'ColumnB (String)', value: 'ColumnB-String' },
                                ],
                                commonColumnsAcrossTables: [
                                    { label: 'ColumnA', value: 'ColumnA-String' },
                                    { label: 'ColumnB (Numeric)', value: 'ColumnB-Numeric' },
                                    { label: 'ColumnB (String)', value: 'ColumnB-String' },
                                ]
                            }),
                            transformDataTableQuery: jest.fn((filter: string) => filter),
                            transformResultQuery: jest.fn((filter: string) => filter),
                            transformColumnQuery: jest.fn((filter: string) => filter),
                            hasRequiredFilters: mockHasRequiredFilters,
                            parseColumnIdentifier: mockParseColumnIdentifier,
                            instanceSettings: {
                                jsonData: {
                                    featureToggles: {
                                        queryUndecimatedData: true
                                    }
                                }
                            }
                        } as any;
                    });

                    describe('when existing columns are valid', () => {
                        beforeEach(async () => {
                            renderComponent(
                                {
                                    type: DataFrameQueryType.Data,
                                    dataTableFilter: 'name = "TestTable"',
                                    columns: ['ColumnA-String', 'ColumnB-Numeric'],
                                },
                                '',
                                '',
                                [],
                                [],
                                undefined,
                                {},
                                mockDatasource
                            );
                        
                        }); 

                        it('should not show an error message when selected columns exist in column options', async () => {
                            await waitFor(() => {
                                expect(mockDatasource.getColumnOptionsWithVariables).toHaveBeenCalled();
                            });

                            // No error message should be displayed
                            await waitFor(() => {
                                expect(screen.queryByText(/not valid/i)).not.toBeInTheDocument();
                            });
                        });
                    });

                    describe('when existing columns are invalid', () => {
                        it('should show an error message when a single selected column does not exist in column options', async () => {
                            renderComponent(
                                {
                                    type: DataFrameQueryType.Data,
                                    dataTableFilter: 'name = "TestTable"',
                                    columns: ['InvalidColumn-String'],
                                },
                                '',
                                '',
                                [],
                                [],
                                undefined,
                                {},
                                mockDatasource
                            );

                            await waitFor(() => {
                                expect(
                                    screen.getByText("The following selected column is not valid: 'InvalidColumn (String)'")
                                ).toBeInTheDocument();
                            });
                        });

                        it('should show an error message when multiple selected columns do not exist in column options', async () => {
                            renderComponent(
                                {
                                    type: DataFrameQueryType.Data,
                                    dataTableFilter: 'name = "TestTable"',
                                    columns: ['InvalidColumn1-String', 'InvalidColumn2-Numeric'],
                                },
                                '',
                                '',
                                [],
                                [],
                                undefined,
                                {},
                                mockDatasource
                            );

                            await waitFor(() => {
                                expect(
                                    screen.getByText(
                                        "The following selected columns are not valid: 'InvalidColumn1 (String), InvalidColumn2 (Numeric)'"
                                    )
                                ).toBeInTheDocument();
                            });
                        });
                    });

                    describe('when some columns are valid and some are invalid', () => {
                        it('should only show error for invalid columns', async () => {
                            renderComponent(
                                {
                                    type: DataFrameQueryType.Data,
                                    dataTableFilter: 'name = "TestTable"',
                                    columns: ['ColumnA-String', 'InvalidColumn-String'],
                                },
                                '',
                                '',
                                [],
                                [],
                                undefined,
                                {},
                                mockDatasource
                            );

                            await waitFor(() => {
                                expect(
                                    screen.getByText("The following selected column is not valid: 'InvalidColumn (String)'")
                                ).toBeInTheDocument();
                            });
                        });

                        it('should display both valid and invalid columns in the combobox', async () => {
                            renderComponent(
                                {
                                    type: DataFrameQueryType.Data,
                                    dataTableFilter: 'name = "TestTable"',
                                    columns: ['ColumnA-String', 'InvalidColumn-String'],
                                },
                                '',
                                '',
                                [],
                                [],
                                undefined,
                                {},
                                mockDatasource
                            );

                            await waitFor(() => {
                                expect(mockDatasource.getColumnOptionsWithVariables).toHaveBeenCalled();
                            });

                            // Verify both valid and invalid columns are displayed
                            await waitFor(() => {
                                expect(document.body).toHaveTextContent('ColumnA');
                                expect(document.body).toHaveTextContent('InvalidColumn');
                            });
                        });

                        it('should clear error message when invalid columns become valid', async () => {
                            // Initial filter - column is valid
                            mockDatasource.getColumnOptionsWithVariables.mockResolvedValue({
                                uniqueColumnsAcrossTables: [
                                    { label: 'ColumnA', value: 'ColumnA-String' },
                                    { label: 'ColumnB (Numeric)', value: 'ColumnB-Numeric' },
                                ],
                                commonColumnsAcrossTables: [
                                    { label: 'ColumnA', value: 'ColumnA-String' },
                                ]
                            });

                            const { renderResult } = renderComponent(
                                {
                                    type: DataFrameQueryType.Data,
                                    dataTableFilter: 'name = "Table1"',
                                    columns: ['ColumnA-String'],
                                },
                                '',
                                '',
                                [],
                                [],
                                undefined,
                                {},
                                mockDatasource
                            );

                            // Wait for initial options to load
                            await waitFor(() => {
                                expect(mockDatasource.getColumnOptionsWithVariables).toHaveBeenCalled();
                            });

                            // Verify no error is shown
                            expect(screen.queryByText(/not valid/i)).not.toBeInTheDocument();

                            // Change filter to a table that doesn't have ColumnA
                            mockDatasource.getColumnOptionsWithVariables.mockResolvedValue({
                                uniqueColumnsAcrossTables: [
                                    { label: 'ColumnX', value: 'ColumnX-String' },
                                    { label: 'ColumnY (Numeric)', value: 'ColumnY-Numeric' },
                                ],
                                commonColumnsAcrossTables: [
                                    { label: 'ColumnX', value: 'ColumnX-String' },
                                ]
                            });

                            renderResult.rerender(
                                <DataFrameQueryEditorV2
                                    query={{
                                        refId: 'A',
                                        type: DataFrameQueryType.Data,
                                        dataTableFilter: 'name = "Table2"',
                                        columns: ['ColumnA-String'],
                                    }}
                                    onChange={jest.fn()}
                                    onRunQuery={jest.fn()}
                                    datasource={mockDatasource}
                                />
                            );

                            // Wait for error to appear
                            await waitFor(() => {
                                expect(
                                    screen.getByText("The following selected column is not valid: 'ColumnA (String)'")
                                ).toBeInTheDocument();
                            });

                            // Change filter back to original table that has ColumnA
                            mockDatasource.getColumnOptionsWithVariables.mockResolvedValue({
                                uniqueColumnsAcrossTables: [
                                    { label: 'ColumnA', value: 'ColumnA-String' },
                                    { label: 'ColumnB (Numeric)', value: 'ColumnB-Numeric' },
                                ],
                                commonColumnsAcrossTables: [
                                    { label: 'ColumnA', value: 'ColumnA-String' },
                                ]
                            });

                            renderResult.rerender(
                                <DataFrameQueryEditorV2
                                    query={{
                                        refId: 'A',
                                        type: DataFrameQueryType.Data,
                                        dataTableFilter: 'name = "Table1"',
                                        columns: ['ColumnA-String'],
                                    }}
                                    onChange={jest.fn()}
                                    onRunQuery={jest.fn()}
                                    datasource={mockDatasource}
                                />
                            );

                            // Wait for error to disappear
                            await waitFor(() => {
                                expect(screen.queryByText(/not valid/i)).not.toBeInTheDocument();
                            });
                        });
                    });

                    it('should not show error before fetching column options', () => {
                        mockDatasource.getColumnOptionsWithVariables = jest.fn().mockReturnValue(
                            new Promise(() => {})
                        );

                        renderComponent(
                            {
                                type: DataFrameQueryType.Data,
                                dataTableFilter: 'name = "TestTable"',
                                columns: ['ColumnA-String'],
                            },
                            '',
                            '',
                            [],
                            [],
                            undefined,
                            {},
                            mockDatasource
                        );

                        // No error message should be displayed
                        expect(screen.queryByText(/not valid/i)).not.toBeInTheDocument();
                    });

                    it('should show error when columns selected and required filters are not provided', async () => {
                        mockDatasource.hasRequiredFilters = jest.fn().mockReturnValue(false);
                        renderComponent(
                            {
                                type: DataFrameQueryType.Data,
                                columnFilter: 'name = "TestTable"',
                                columns: ['ColumnA-String'],
                            },
                            '',
                            '',
                            [],
                            [],
                            undefined,
                            {},
                            mockDatasource
                        );

                        // Error message should be displayed
                        expect(screen.getByText(
                            "The following selected column is not valid: 'ColumnA (String)'"
                        )).toBeInTheDocument();
                    });

                    it('should show error when columns selected and all filters are not provided', async () => {
                        renderComponent(
                            {
                                type: DataFrameQueryType.Data,
                                columns: ['ColumnA-String'],
                            },
                            '',
                            '',
                            [],
                            [],
                            undefined,
                            {},
                            mockDatasource
                        );

                        // Error message should be displayed
                        expect(screen.getByText(
                            "The following selected column is not valid: 'ColumnA (String)'"
                        )).toBeInTheDocument();
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

                it("should call onChange and onRunQuery when the include index columns checkbox is checked", async () => {
                    await user.click(includeIndexColumnsCheckbox);

                    await waitFor(() => {
                        expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
                            includeIndexColumns: true
                        }));
                        expect(onRunQuery).toHaveBeenCalled();
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

                it("should call onChange and onRunQuery when the filter nulls checkbox is checked", async () => {
                    await user.click(filterNullsCheckbox);

                    await waitFor(() => {
                        expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
                            filterNulls: true
                        }));
                        expect(onRunQuery).toHaveBeenCalled();
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

                it("should call onChange and onRunQuery when a decimation method is selected", async () => {
                    await user.click(decimationMethodField);
                    await user.keyboard('{ArrowDown}');
                    await user.keyboard('{Enter}');

                    await waitFor(() => {
                        expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
                            decimationMethod: 'MAX_MIN'
                        }));
                        expect(onRunQuery).toHaveBeenCalled();
                    });
                });

                it("should include 'None' as a decimation method option", async () => {
                    await user.click(decimationMethodField);

                    await waitFor(() => {
                        const options = within(document.body).getAllByRole('option');
                        const optionTexts = options.map(opt => opt.textContent);
                        expect(optionTexts.some(text => text?.startsWith('None'))).toBe(true);
                    });
                });

                it("should allow selecting 'None' decimation method", async () => {
                    await user.click(decimationMethodField);
                    const options = within(document.body).getAllByRole('option');
                    const noneOption = options.find(opt => opt.textContent?.startsWith('None'));
                    
                    expect(noneOption).toBeDefined();
                    await user.click(noneOption!);

                    await waitFor(() => {
                        expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
                            decimationMethod: 'NONE'
                        }));
                        expect(onRunQuery).toHaveBeenCalled();
                    });
                });

                it("should display undecimated record count field when 'None' decimation is selected", async () => {
                    renderComponent({ 
                        type: DataFrameQueryType.Data,
                        decimationMethod: 'NONE'
                    });

                    await waitFor(() => {
                        const recordCountInput = screen.getAllByRole('spinbutton');
                        expect(recordCountInput.length).toBe(1);
                    });
                });

                it("should not display undecimated record count field when decimation method is not 'None'", async () => {
                    renderComponent({ 
                        type: DataFrameQueryType.Data,
                        decimationMethod: 'LOSSY'
                    });

                    await waitFor(() => {
                        const recordCountInput = screen.queryAllByRole('spinbutton');
                        expect(recordCountInput.length).toBe(0);
                    });
                });

                describe("undecimated record count field", () => {
                    let undecimatedInput: HTMLElement;
                    let user: UserEvent;

                    beforeEach(() => {
                        cleanup();
                        renderComponent({ 
                            type: DataFrameQueryType.Data,
                            decimationMethod: 'NONE'
                        });
                        user = userEvent.setup();
                    });

                    it("should show the undecimated record count field with default value", async () => {
                        await waitFor(() => {
                            const recordCountInput = screen.getAllByRole('spinbutton');
                            expect(recordCountInput.length).toBe(1);
                            
                            undecimatedInput = recordCountInput[0];
                            expect(undecimatedInput).toBeInTheDocument();
                            expect(undecimatedInput).toHaveValue(10_000);
                        });
                    });

                    it("should allow only numeric input", async () => {
                        await waitFor(() => {
                            const recordCountInput = screen.getAllByRole('spinbutton');
                            undecimatedInput = recordCountInput[0];
                        });

                        await user.type(undecimatedInput, "abc");
                        await user.tab();

                        expect(undecimatedInput).toHaveValue(10_000);
                    });

                    it("should show an error message when value is less than or equal to 0", async () => {
                        await waitFor(() => {
                            const recordCountInput = screen.getAllByRole('spinbutton');
                            undecimatedInput = recordCountInput[0];
                        });

                        await user.clear(undecimatedInput);
                        await user.type(undecimatedInput, "0");
                        await user.tab();

                        await waitFor(() => {
                            expect(screen.getByText("Enter a value greater than or equal to 1."))
                                .toBeInTheDocument();
                        });
                    });

                    it("should show an error message when value is greater than 1000000", async () => {
                        await waitFor(() => {
                            const recordCountInput = screen.getAllByRole('spinbutton');
                            undecimatedInput = recordCountInput[0];
                        });

                        await user.clear(undecimatedInput);
                        await user.type(undecimatedInput, "2000000");
                        await user.tab();

                        await waitFor(() => {
                            expect(screen.getByText("Enter a value less than or equal to 1000000."))
                                .toBeInTheDocument();
                        });
                    });

                    it("should not show an error message when a valid value is entered", async () => {
                        await waitFor(() => {
                            const recordCountInput = screen.getAllByRole('spinbutton');
                            undecimatedInput = recordCountInput[0];
                        });

                        await user.clear(undecimatedInput);
                        await user.type(undecimatedInput, "50000");
                        await user.tab();

                        await waitFor(() => {
                            expect(screen.queryByText("Enter a value greater than or equal to 1."))
                                .not.toBeInTheDocument();
                            expect(screen.queryByText("Enter a value less than or equal to 1000000."))
                                .not.toBeInTheDocument();
                        });
                    });

                    it("should call onChange and onRunQuery when a valid value is entered", async () => {
                        cleanup();
                        const { onChange, onRunQuery } = renderComponent({ 
                            type: DataFrameQueryType.Data,
                            decimationMethod: 'NONE'
                        });

                        await waitFor(() => {
                            const recordCountInput = screen.getAllByRole('spinbutton');
                            undecimatedInput = recordCountInput[0];
                        });

                        await user.clear(undecimatedInput);
                        await user.type(undecimatedInput, "50000");
                        await user.tab();

                        await waitFor(() => {
                            expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
                                undecimatedRecordCount: 50_000,
                            }));
                            expect(onRunQuery).toHaveBeenCalled();
                        });
                    });

                    it("should not call onChange and onRunQuery until input loses focus", async () => {
                        cleanup();
                        const { onChange, onRunQuery } = renderComponent({ 
                            type: DataFrameQueryType.Data,
                            decimationMethod: 'NONE'
                        });

                        await waitFor(() => {
                            const recordCountInput = screen.getAllByRole('spinbutton');
                            undecimatedInput = recordCountInput[0];
                        });

                        await user.clear(undecimatedInput);
                        await user.type(undecimatedInput, "50000");

                        await waitFor(() => {
                            expect(onChange).not.toHaveBeenCalled();
                            expect(onRunQuery).not.toHaveBeenCalled();
                        });
                    });
                });

                describe("when queryUndecimatedData feature flag is disabled", () => {
                    let mockDatasource: Partial<DataFrameDataSource>;

                    beforeEach(() => {
                        cleanup();
                        mockDatasource = {
                            processQuery: jest.fn(query => ({ ...defaultQueryV2, ...query })),
                            getColumnOptionsWithVariables: jest.fn().mockResolvedValue({
                                uniqueColumnsAcrossTables: [],
                                commonColumnsAcrossTables: []
                            }),
                            transformDataTableQuery: jest.fn((filter: string) => filter),
                            transformResultQuery: jest.fn((filter: string) => filter),
                            transformColumnQuery: jest.fn((filter: string) => filter),
                            hasRequiredFilters: mockHasRequiredFilters,
                            parseColumnIdentifier: mockParseColumnIdentifier,
                            instanceSettings: {
                                jsonData: {
                                    featureToggles: {
                                        queryUndecimatedData: false
                                    }
                                }
                            }
                        } as unknown as Partial<DataFrameDataSource>;
                    });

                    it("should not include 'None' as a decimation method option", async () => {
                        const user = userEvent.setup();

                        renderComponent(
                            { type: DataFrameQueryType.Data },
                            '',
                            '',
                            [],
                            [],
                            undefined,
                            {},
                            mockDatasource
                        );

                        const decimationMethodField = screen.getAllByRole('combobox')[1];
                        await user.click(decimationMethodField);

                        await waitFor(() => {
                            const options = within(document.body).getAllByRole('option');
                            const optionTexts = options.map(opt => opt.textContent);
                            expect(optionTexts.some(text => text?.startsWith('None'))).toBe(false);
                        });
                    });

                    it("should not display undecimated record count field even when decimation method is 'NONE'", async () => {
                        renderComponent(
                            { 
                                type: DataFrameQueryType.Data,
                                decimationMethod: 'NONE'
                            },
                            '',
                            '',
                            [],
                            [],
                            undefined,
                            {},
                            mockDatasource
                        );

                        await waitFor(() => {
                            const recordCountInput = screen.queryAllByRole('spinbutton');
                            // Should have no record count inputs when feature flag is disabled
                            expect(recordCountInput.length).toBe(0);
                        });
                    });
                });
            });

            describe("x-column field", () => {
                let xColumnField: HTMLElement;
                let datasource: DataFrameDataSource;

                const processQuery = jest.fn((query, _queries) => ({ ...defaultQueryV2, ...query }));

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

                async function clickXColumnCombobox() {
                    const xColumnCombobox = screen.getAllByRole('combobox')[2];
                    await userEvent.click(xColumnCombobox);
                }

                function getXColumnOptionTexts() {
                    const optionControls = within(document.body).getAllByRole('option');
                    return optionControls.map(option => option.textContent);
                }

                beforeEach(() => {
                    const latestQueryBuilderWrapperCall = (
                        DataFrameQueryBuilderWrapper as jest.Mock
                    ).mock.calls.slice(-1)[0];
                    const latestProps = latestQueryBuilderWrapperCall
                        ? latestQueryBuilderWrapperCall[0]
                        : undefined;
                    xColumnField = screen.getAllByRole('combobox')[2];
                    datasource = latestProps?.datasource as DataFrameDataSource;
                });

                it("should show the x-column field", () => {
                    expect(xColumnField).toBeInTheDocument();
                    expect(xColumnField).toHaveAttribute('aria-expanded', 'false');
                    expect(xColumnField).toHaveDisplayValue('');
                });

                it('should load x-column combobox options when filter changes', async () => {
                    await changeFilterValue();
                    await waitFor(() =>
                        expect(datasource.getColumnOptionsWithVariables).toHaveBeenCalledTimes(1)
                    );
                    await clickXColumnCombobox();
                    const optionTexts = getXColumnOptionTexts();
                    expect(optionTexts).toEqual(expect.arrayContaining(['ColumnA']));
                });

                it('should not load x-column options when filter is empty', async () => {
                    renderComponent({ dataTableFilter: '' });

                    await clickXColumnCombobox();

                    // Assert that no options are shown
                    expect(within(document.body).queryAllByRole('option').length).toBe(0);
                });

                it('should not load x-column options when filter is unchanged', async () => {
                    //Make initial filter change
                    await changeFilterValue();

                    // wait for x-column to be fetched
                    await waitFor(() => {
                        expect(datasource.getColumnOptionsWithVariables).toHaveBeenCalledTimes(1);
                    });
                    await clickXColumnCombobox();
                    const firstLoadOptions = getXColumnOptionTexts();
                    expect(firstLoadOptions.length).toBeGreaterThan(0);

                    // Switch to Properties query type and back to Data to simulate re-render
                    await userEvent.click(
                        screen.getByRole("radio", { name: DataFrameQueryType.Properties })
                    );
                    await userEvent.click(
                        screen.getByRole("radio", { name: DataFrameQueryType.Data })
                    );

                    // reopen dropdown
                    await clickXColumnCombobox();
                    const secondLoadOptions = getXColumnOptionTexts();

                    expect(secondLoadOptions).toEqual(firstLoadOptions);
                    expect(datasource.getColumnOptionsWithVariables).toHaveBeenCalledTimes(1);
                });

                describe('x-column limit', () => {
                    describe('when x-column limit is exceeded', () => {
                        beforeEach(async () => {
                            cleanup();
                            jest.clearAllMocks();

                            const xColumnOptions = Array.from(
                                { length: COLUMN_OPTIONS_LIMIT + 25 }, (_, i) => ({
                                    label: `XColumn${i + 1}`,
                                    value: `XColumn${i + 1}`,
                                })
                            );

                            // Increase offsetHeight to allow more options to be rendered in the test environment
                            jest.spyOn(HTMLElement.prototype, 'offsetHeight', 'get')
                                .mockReturnValue(200);
                            const result = renderComponent({ dataTableFilter: ' ' }, '', '', [], xColumnOptions);
                            datasource = result.datasource;

                            await changeFilterValue();
                        });

                        it(`should limit the number of x-column options to ${COLUMN_OPTIONS_LIMIT}`, async () => {
                            await clickXColumnCombobox();
                            const optionTexts = getXColumnOptionTexts();
                            expect(optionTexts.length).toBe(COLUMN_OPTIONS_LIMIT);
                        });
                    });
                });

                describe('x-column options population based on query type', () => {
                    beforeAll(() => {
                        // Mock offsetHeight for combobox virtualization so options render in tests
                        jest.spyOn(HTMLElement.prototype, 'offsetHeight', 'get')
                            .mockReturnValue(120);
                    });

                    beforeEach(() => {
                        cleanup();
                        jest.clearAllMocks();
                    });

                    it('should fetch x-column options when switching to Data query type with existing non-empty filter', async () => {
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

                        const xColumnCombobox = screen.getAllByRole('combobox')[2];
                        await user.click(xColumnCombobox);

                        expect(datasource.getColumnOptionsWithVariables).toHaveBeenCalledWith({
                             dataTableFilter: 'ExistingFilter',
                             resultFilter: '',
                             columnFilter: ''
                        });

                        // X-column options should be fetched and available
                        await waitFor(() => {
                            const optionControls = within(document.body).getAllByRole('option');
                            const texts = optionControls.map(option => option.textContent);
                            expect(texts).toEqual(expect.arrayContaining(['ColumnA']));
                        });
                    });

                    it('should not fetch x-column options when switching to Data query type with existing empty filter', async () => {
                        const user = userEvent.setup();
                        const { datasource } = renderComponent({
                            type: DataFrameQueryType.Properties,
                            dataTableFilter: '',
                        });
                        const dataRadios = screen.getAllByRole('radio', {
                            name: DataFrameQueryType.Data,
                        });
                        await user.click(dataRadios[0]);

                        const xColumnCombobox = screen.getAllByRole('combobox')[2];
                        await user.click(xColumnCombobox);

                        await waitFor(() => {
                            const optionControls = within(document.body).queryAllByRole('option');
                            expect(optionControls.length).toBe(0);
                        });
                        expect(datasource.getColumnOptionsWithVariables).not.toHaveBeenCalled();
                    });

                    it('should not fetch x-column options when filter changes while in Properties query type', async () => {
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

                        // X-column combobox should not be present in Properties mode
                        expect(screen.queryByPlaceholderText('Select x-column'))
                            .not.toBeInTheDocument();
                        // getColumnOptionsWithVariables should never have been called
                        expect(datasource.getColumnOptionsWithVariables).not.toHaveBeenCalled();
                    });

                    it('should not fetch x-column options when switching to Properties query type with existing non-empty filter', async () => {
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

                        // X-column combobox should not be present in Properties mode
                        expect(screen.queryByPlaceholderText('Select x-column'))
                            .not.toBeInTheDocument();

                        // getColumnOptionsWithVariables should have been called only once (during initial Data mode render)
                        await waitFor(() => {
                            expect(datasource.getColumnOptionsWithVariables)
                                .toHaveBeenCalledTimes(1);
                        });
                    });

                    it('should not fetch x-column options when switching to Properties query type with existing empty filter', async () => {
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

                        // X-column combobox should not be present in Properties mode
                        expect(screen.queryByPlaceholderText('Select x-column'))
                            .not.toBeInTheDocument();

                        // getColumnOptionsWithVariables should never have been called (empty filter in Data mode)
                        expect(datasource.getColumnOptionsWithVariables).not.toHaveBeenCalled();
                    });

                    it('should fetch x-column options when filter changes while in Data query type', async () => {
                        const user = userEvent.setup();
                        const { datasource } = renderComponent(
                            { type: DataFrameQueryType.Data, dataTableFilter: 'InitialFilter' }
                        );
                        const [[props]] = (DataFrameQueryBuilderWrapper as jest.Mock).mock.calls;
                        const { onDataTableFilterChange } = props;

                        // Simulate filter change while in Data type
                        const mockEvent = { detail: { linq: 'UpdatedFilter' } } as Event
                            & { detail: { linq: string; }; };
                        onDataTableFilterChange(mockEvent);

                        const xColumnCombobox = screen.getAllByRole('combobox')[2];
                        await user.click(xColumnCombobox);

                        await waitFor(() => {
                            const optionControls = within(document.body).getAllByRole('option');
                            const texts = optionControls.map(option => option.textContent);
                            expect(texts).toEqual(expect.arrayContaining(['ColumnA']));
                        });
                        expect(datasource.getColumnOptionsWithVariables).toHaveBeenCalledWith({
                             dataTableFilter: 'UpdatedFilter' ,
                             resultFilter: '',
                             columnFilter: ''
                        });
                    });

                    it('should fetch x-column options when switching to Data query type after changing filter in Properties type', async () => {
                        const user = userEvent.setup();
                        // Start in Properties mode with an initial filter value
                        const { datasource } = renderComponent(
                            { type: DataFrameQueryType.Properties, dataTableFilter: 'InitialFilter' }
                        );
                        const [[props]] = (DataFrameQueryBuilderWrapper as jest.Mock).mock.calls;
                        const { onDataTableFilterChange } = props;
                        const getColumnOptionsSpy = jest.spyOn(
                            datasource,
                            'getColumnOptionsWithVariables'
                        );

                        // While in Properties mode the x-column combobox should not be rendered
                        expect(screen.queryByPlaceholderText('Select x-column'))
                            .not.toBeInTheDocument();
                        expect(getColumnOptionsSpy).not.toHaveBeenCalled();

                        // Change the filter while still in Properties mode
                        const mockEvent = { detail: { linq: 'UpdatedFilter' } } as Event
                            & { detail: { linq: string; }; };
                        onDataTableFilterChange(mockEvent);

                        // Still should not fetch x-columns in Properties mode
                        expect(getColumnOptionsSpy).not.toHaveBeenCalled();

                        // Switch to Data mode – now the use effect should run and fetch x-columns with the updated filter
                        const dataRadios = screen.getAllByRole(
                            'radio',
                            { name: DataFrameQueryType.Data }
                        );
                        await user.click(dataRadios[0]);

                        await waitFor(() => {
                            expect(datasource.getColumnOptionsWithVariables).toHaveBeenCalledWith({
                                dataTableFilter: 'UpdatedFilter' ,
                                resultFilter: '',
                                columnFilter: ''
                            });
                        });
                    });
                });

                describe('x-column option population based on filter', () => {
                    it('should load x-column options on initial render with non-empty filter', async () => {
                        const mockXColumnOptions = [
                            { label: 'XColumn1', value: 'XColumn1' },
                            { label: 'XColumn2', value: 'XColumn2' },
                        ];

                        const { datasource } = renderComponent({
                            ...defaultQueryV2,
                            refId: 'A',
                            type: DataFrameQueryType.Data,
                            dataTableFilter: 'InitialFilter',
                        }, '', '', [], mockXColumnOptions);

                        await waitFor(() => {
                            expect(datasource.getColumnOptionsWithVariables).toHaveBeenCalledWith({
                                dataTableFilter: 'InitialFilter',
                                resultFilter: '',
                                columnFilter: ''
                            });
                        });
                    });

                    it('should not load x-column options when filter becomes empty', async () => {
                        const { datasource, renderResult } = renderComponent({
                            type: DataFrameQueryType.Data,
                            dataTableFilter: 'InitialFilter',
                        });
                        const getColumnOptionsSpy = jest.spyOn(
                            datasource,
                            'getColumnOptionsWithVariables'
                        );

                        await waitFor(() => expect(getColumnOptionsSpy).toHaveBeenCalledTimes(1));
                        getColumnOptionsSpy.mockClear();
                        renderResult.rerender(
                            <DataFrameQueryEditorV2
                                datasource={datasource}
                                query={
                                    {
                                        ...defaultQueryV2,
                                        refId: 'A',
                                        type: DataFrameQueryType.Data,
                                        dataTableFilter: ''
                                    }
                                }
                                onChange={() => { }}
                                onRunQuery={() => { }}
                            />
                        );

                        await waitFor(() => expect(datasource.getColumnOptionsWithVariables)
                            .not.toHaveBeenCalled());
                    });

                    it('should call getColumnOptionsWithVariables with transformed filter on initial render', async () => {
                        const datasource = {
                            processQuery: jest.fn(query => ({ ...defaultQueryV2, ...query })),
                            getColumnOptionsWithVariables: jest.fn().mockResolvedValue({
                                uniqueColumnsAcrossTables: [],
                                commonColumnsAcrossTables: [{ label: 'XCol1', value: 'XCol1' }]
                            }),
                            transformResultQuery: jest.fn((filter: string) => `TRANSFORMED_${filter}`),
                            transformDataTableQuery: jest.fn((filter: string) => `TRANSFORMED_${filter}`),
                            transformColumnQuery: jest.fn((filter: string) => `TRANSFORMED_${filter}`),
                            hasRequiredFilters: mockHasRequiredFilters,
                        } as any;

                        renderComponent(
                            {
                                ...defaultQueryV2,
                                refId: 'A',
                                type: DataFrameQueryType.Data,
                                dataTableFilter: 'InitialDataTableFilter',
                                resultFilter: 'InitialResultFilter',
                            },
                            '',
                            '',
                            [],
                            [],
                            processQuery,
                            {},
                            datasource
                        );

                        await waitFor(() => {
                            expect(datasource.transformDataTableQuery).toHaveBeenCalledWith('InitialDataTableFilter');
                            expect(datasource.transformResultQuery).toHaveBeenCalledWith('InitialResultFilter');
                            expect(datasource.transformColumnQuery).toHaveBeenCalledWith('');
                            expect(datasource.getColumnOptionsWithVariables).toHaveBeenCalledWith({
                                dataTableFilter: 'TRANSFORMED_InitialDataTableFilter',
                                resultFilter: 'TRANSFORMED_InitialResultFilter',
                                columnFilter: 'TRANSFORMED_'
                            });
                        });
                    });

                    it('should call transformDataTableQuery before deciding to load x-column options', async () => {
                        const datasource = {
                            processQuery: jest.fn(query => ({ ...defaultQueryV2, ...query })),
                            getColumnOptionsWithVariables: jest.fn().mockResolvedValue({
                                uniqueColumnsAcrossTables: [],
                                commonColumnsAcrossTables: [{ label: 'XCol1', value: 'XCol1' }]
                            }),
                            transformResultQuery: jest.fn(f => f),
                            transformDataTableQuery: jest.fn(f => f),
                            transformColumnQuery: jest.fn(f => f),
                            hasRequiredFilters: mockHasRequiredFilters,
                        } as any;
                        renderComponent(
                            {
                                ...defaultQueryV2,
                                refId: 'A',
                                type: DataFrameQueryType.Data,
                                dataTableFilter: 'FilterX',
                                resultFilter: 'FilterY',
                            },
                            '',
                            '',
                            [],
                            [],
                            processQuery,
                            {},
                            datasource
                        );

                        await waitFor(() => {
                            expect(datasource.transformDataTableQuery).toHaveBeenCalledWith('FilterX');
                            expect(datasource.transformResultQuery).toHaveBeenCalledWith('FilterY');
                            expect(datasource.transformColumnQuery).toHaveBeenCalledWith('');
                        });
                        expect(datasource.getColumnOptionsWithVariables).toHaveBeenCalledWith({
                            dataTableFilter: 'FilterX',
                            resultFilter: 'FilterY',
                            columnFilter: ''
                        });
                    });
                });

                describe('x-column option population based on variables cache', () => {
                    it('should trigger useEffect when variables cache object reference changes', async () => {
                        const initialVariablesCache = { var1: 'value1' };
                        const updatedVariablesCache = { var1: 'value2' };
                        const datasource = {
                            processQuery: jest.fn(query => ({ ...defaultQueryV2, ...query })),
                            getColumnOptionsWithVariables: jest.fn().mockResolvedValue({
                                uniqueColumnsAcrossTables: [],
                                commonColumnsAcrossTables: [{ label: 'XCol1', value: 'XCol1' }]
                            }),
                            transformResultQuery: jest.fn(f => f),
                            transformDataTableQuery: jest.fn(f => f),
                            transformColumnQuery: jest.fn(f => f),
                            hasRequiredFilters: mockHasRequiredFilters,
                        } as any;

                        renderComponent(
                            {
                                ...defaultQueryV2,
                                refId: 'A',
                                type: DataFrameQueryType.Data,
                                dataTableFilter: 'FilterWithVar',
                                resultFilter: 'ResultWithVar'
                            },
                            '',
                            '',
                            [],
                            [],
                            undefined,
                            initialVariablesCache,
                            datasource,
                        );

                        await waitFor(() => {
                            expect(datasource.transformDataTableQuery).toHaveBeenCalledWith('FilterWithVar');
                            expect(datasource.transformResultQuery).toHaveBeenCalledWith('ResultWithVar');
                            expect(datasource.transformColumnQuery).toHaveBeenCalledWith('');
                            expect(datasource.getColumnOptionsWithVariables).toHaveBeenCalledWith({
                                dataTableFilter: 'FilterWithVar',
                                resultFilter: 'ResultWithVar',
                                columnFilter: ''
                            });
                        });

                        datasource.getColumnOptionsWithVariables.mockClear();
                        datasource.transformDataTableQuery.mockClear();

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
                            [],
                            undefined,
                            updatedVariablesCache,
                            datasource
                        );

                        await waitFor(() => {
                            expect(datasource.transformDataTableQuery).toHaveBeenCalledWith('FilterWithVar');
                        });
                    });
                });

                describe("x-column value setting", () => {
                    beforeAll(() => {
                        // Mock offsetHeight for combobox virtualization so options render in tests
                        jest.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(300);
                    });

                    it("should be set with a value when an x-column is provided in the query", async () => {
                        renderComponent({
                            type: DataFrameQueryType.Data,
                            dataTableFilter: 'name = "TestTable"',
                            xColumn: 'ColumnA'
                        });

                        await waitFor(() => {
                            expect(screen.getByDisplayValue('ColumnA')).toBeInTheDocument();
                        });
                    });

                    it("should show expected label when the x-column is invalid", async () => {
                        renderComponent({
                            type: DataFrameQueryType.Data,
                            dataTableFilter: 'name = "TestTable"',
                            xColumn: 'InvalidColumn-Numeric'
                        });

                        await waitFor(() => {
                            expect(screen.getByDisplayValue('InvalidColumn (Numeric)')).toBeInTheDocument();
                        });
                    });
                });

                describe('onXColumnChange', () => {
                    let user: UserEvent;
                    let onChange: jest.Mock;
                    let onRunQuery: jest.Mock;

                    beforeAll(() => {
                        jest.spyOn(HTMLElement.prototype, 'offsetHeight', 'get')
                            .mockReturnValue(300);
                    });

                    beforeEach(async () => {
                        user = userEvent.setup();
                        cleanup();
                        jest.clearAllMocks();
                        const result = renderComponent({
                            type: DataFrameQueryType.Data,
                            dataTableFilter: '',
                            xColumn: null,
                        });
                        onChange = result.onChange;
                        onRunQuery = result.onRunQuery;

                        await changeFilterValue('TestFilter');
                        // Wait for x-columns to be loaded
                        await new Promise(resolve => setTimeout(resolve, 50));
                        onChange.mockClear();
                    });

                    it('should update the query with selected x-column when an x-column is selected', async () => {
                        await clickXColumnCombobox();

                        const xColumnOption = await screen.findByRole(
                            'option',
                            { name: 'ColumnA' }
                        );
                        await user.click(xColumnOption);

                        await waitFor(() => {
                            expect(onChange).toHaveBeenCalledWith(
                                expect.objectContaining({
                                    xColumn: 'ColumnA',
                                })
                            );
                        });
                        expect(onRunQuery).toHaveBeenCalled();
                    });

                    it('should update the query when x-column is changed to a different value', async () => {
                        cleanup();
                        jest.clearAllMocks();

                        const xColumns = [
                            { label: 'ColumnA', value: 'ColumnA' },
                            { label: 'ColumnB', value: 'ColumnB' },
                        ];

                        // Start with ColumnA already selected
                        const { onChange, onRunQuery } = renderComponent(
                            {
                                type: DataFrameQueryType.Data,
                                dataTableFilter: 'TestFilter',
                                xColumn: 'ColumnA',
                            },
                            '',
                            '',
                            [],
                            xColumns
                        );

                        await waitFor(() => {
                            const xColumnCombobox = screen.getAllByRole('combobox')[2];
                            expect(xColumnCombobox).toHaveDisplayValue('ColumnA');
                        });

                        onChange.mockClear();
                        onRunQuery.mockClear();

                        // Now change to a different value
                        const xColumnCombobox = screen.getAllByRole('combobox')[2];
                        await user.click(xColumnCombobox);

                        // Wait for options to appear and click on ColumnB
                        const xColumnOption = await screen.findByRole(
                            'option',
                            { name: 'ColumnB' }
                        );
                        await user.click(xColumnOption);

                        await waitFor(() => {
                            expect(onChange).toHaveBeenCalledWith(
                                expect.objectContaining({
                                    xColumn: 'ColumnB',
                                })
                            );
                        });
                        expect(onRunQuery).toHaveBeenCalled();
                    });
                });

                describe('x-column validation', () => {
                    let mockDatasource: any;
                    beforeAll(() => {
                        jest.spyOn(HTMLElement.prototype, 'offsetHeight', 'get')
                            .mockReturnValue(300);
                    });

                    beforeEach(() => {
                        cleanup();
                        jest.clearAllMocks();
                        mockDatasource = {
                            processQuery: jest.fn(query => ({ ...defaultQueryV2, ...query })),
                            getColumnOptionsWithVariables: jest.fn().mockResolvedValue({
                                uniqueColumnsAcrossTables: [
                                    { label: 'ColumnA', value: 'ColumnA-String' },
                                    { label: 'ColumnB (Numeric)', value: 'ColumnB-Numeric' },
                                    { label: 'ColumnB (String)', value: 'ColumnB-String' },
                                ],
                                commonColumnsAcrossTables: [
                                    { label: 'ColumnA', value: 'ColumnA-String' },
                                    { label: 'ColumnB (Numeric)', value: 'ColumnB-Numeric' },
                                    { label: 'ColumnB (String)', value: 'ColumnB-String' },
                                ]
                            }),
                            transformDataTableQuery: jest.fn((filter: string) => filter),
                            transformResultQuery: jest.fn((filter: string) => filter),
                            transformColumnQuery: jest.fn((filter: string) => filter),
                            hasRequiredFilters: mockHasRequiredFilters,
                            parseColumnIdentifier: mockParseColumnIdentifier,
                        } as any;
                    });

                    it('should not show validation error when selected x-column is in the options list', async () => {
                        const xColumns = [
                            { label: 'ColumnA', value: 'ColumnA' },
                            { label: 'ColumnB', value: 'ColumnB' },
                        ];

                        renderComponent(
                            {
                                type: DataFrameQueryType.Data,
                                dataTableFilter: 'TestFilter',
                                xColumn: 'ColumnA',
                            },
                            '',
                            '',
                            [],
                            xColumns
                        );

                        await waitFor(() => {
                            expect(screen.queryByText(errorMessages.xColumnSelectionInvalid))
                                .not.toBeInTheDocument();
                        });
                    });

                    it('should show validation error when selected x-column is not in the options list', async () => {
                        const xColumns = [
                            { label: 'ColumnA', value: 'ColumnA' },
                        ];

                        renderComponent(
                            {
                                type: DataFrameQueryType.Data,
                                dataTableFilter: 'TestFilter',
                                xColumn: 'MissingColumn',
                            },
                            '',
                            '',
                            [],
                            xColumns
                        );

                        await waitFor(() => {
                            expect(screen.getByText(errorMessages.xColumnSelectionInvalid))
                                .toBeInTheDocument();
                        });
                    });

                    it('should not show validation error when x-column is null', async () => {
                        const xColumns = [
                            { label: 'ColumnA', value: 'ColumnA' },
                        ];

                        renderComponent(
                            {
                                type: DataFrameQueryType.Data,
                                dataTableFilter: 'TestFilter',
                                xColumn: null,
                            },
                            '',
                            '',
                            [],
                            xColumns
                        );

                        await waitFor(() => {
                            expect(screen.queryByText(errorMessages.xColumnSelectionInvalid))
                                .not.toBeInTheDocument();
                        });
                    });

                    it('should update validation state when x-column options change', async () => {
                        const initialXColumns = [
                            { label: 'ColumnA', value: 'ColumnA' },
                        ];
                        const { datasource } = renderComponent(
                            {
                                type: DataFrameQueryType.Data,
                                dataTableFilter: 'InitialFilter',
                                xColumn: 'ColumnA',
                            },
                            '',
                            '',
                            [],
                            initialXColumns
                        );

                        // Initially, validation should pass
                        await waitFor(() => {
                            expect(screen.queryByText(errorMessages.xColumnSelectionInvalid))
                                .not.toBeInTheDocument();
                        });

                        // Update x-column options to not include ColumnA
                        const updatedXColumns = [
                            { label: 'ColumnB', value: 'ColumnB' },
                        ];
                        datasource.getColumnOptionsWithVariables = jest.fn().mockResolvedValue({
                            allColumns: [],
                            xColumns: updatedXColumns
                        });
                        // Trigger filter change to reload options
                        const [[props]] = (DataFrameQueryBuilderWrapper as jest.Mock).mock.calls;
                        const { onDataTableFilterChange } = props;
                        const mockEvent = {
                            detail: { linq: 'UpdatedFilter' }
                        } as Event & { detail: { linq: string; }; };

                        onDataTableFilterChange(mockEvent);

                        // Now validation should fail since ColumnA is not in the updated options
                        await waitFor(() => {
                            expect(screen.getByText(errorMessages.xColumnSelectionInvalid))
                                .toBeInTheDocument();
                        });
                    });

                    it('should not show error before fetching column options', () => {
                        mockDatasource.getColumnOptionsWithVariables = jest.fn().mockReturnValue(
                            new Promise(() => {})
                        );

                        renderComponent(
                            {
                                type: DataFrameQueryType.Data,
                                dataTableFilter: 'name = "TestTable"',
                                columns: ['ColumnA-String'],
                                xColumn: 'ColumnA-String',
                            },
                            '',
                            '',
                            [],
                            [],
                            undefined,
                            {},
                            mockDatasource
                        );

                        // No error message should be displayed
                        expect(screen.queryByText(
                            'The selected x-column is not available in all the tables matching the query.'
                        )).not.toBeInTheDocument();
                    });

                    it('should show error when x-column selected and required filters are not provided', async () => {
                        mockDatasource.hasRequiredFilters = jest.fn().mockReturnValue(false);
                        renderComponent(
                            {
                                type: DataFrameQueryType.Data,
                                columnFilter: 'name = "TestTable"',
                                columns: ['ColumnA-String'],
                                xColumn: 'ColumnA-String',
                            },
                            '',
                            '',
                            [],
                            [],
                            undefined,
                            {},
                            mockDatasource
                        );

                        // Error message should be displayed
                        expect(screen.getByText(
                            'The selected x-column is not available in all the tables matching the query.'
                        )).toBeInTheDocument();
                    });

                    it('should show error when x-column selected and all filters are not provided', async () => {
                        renderComponent(
                            {
                                type: DataFrameQueryType.Data,
                                columns: ['ColumnA-String'],
                                xColumn: 'ColumnA-String',
                            },
                            '',
                            '',
                            [],
                            [],
                            undefined,
                            {},
                            mockDatasource
                        );

                        // Error message should be displayed
                        expect(screen.getByText(
                            'The selected x-column is not available in all the tables matching the query.'
                        )).toBeInTheDocument();
                    });
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

                it("should call DataFrameQueryParamsHandler.updateSyncXAxisRangeTargetsQueryParam when the use time range checkbox is checked", async () => {
                    const mockUpdateSyncXAxisRangeTargetsQueryParam = jest
                        .spyOn(DataFrameQueryParamsHandler, 'updateSyncXAxisRangeTargetsQueryParam');
                    const mockGetSearchObject = locationService
                        .getSearchObject as jest.Mock;
                    mockGetSearchObject.mockReturnValue({ editPanel: '42' });

                    await user.click(useTimeRangeCheckbox);

                    await waitFor(() => {
                        expect(mockUpdateSyncXAxisRangeTargetsQueryParam).toHaveBeenCalledWith(true, '42');
                    });
                });

                describe('when high resolution zoom feature is disabled', () => {
                    let mockDatasource: Partial<DataFrameDataSource>;
                    let onChange: jest.Mock;
                    let onRunQuery: jest.Mock;

                    beforeEach(() => {
                        cleanup();
                        jest.clearAllMocks();
                        mockDatasource = {
                            processQuery: jest.fn(query => ({ ...defaultQueryV2, ...query })),
                            getColumnOptionsWithVariables: jest.fn().mockResolvedValue({
                                uniqueColumnsAcrossTables: [],
                                commonColumnsAcrossTables: []
                            }),
                            transformDataTableQuery: jest.fn((filter: string) => filter),
                            transformResultQuery: jest.fn((filter: string) => filter),
                            transformColumnQuery: jest.fn((filter: string) => filter),
                            hasRequiredFilters: mockHasRequiredFilters,
                            parseColumnIdentifier: mockParseColumnIdentifier,
                            instanceSettings: {
                                jsonData: {
                                    featureToggles: {
                                        highResolutionZoom: false
                                    }
                                }
                            }
                        } as unknown as Partial<DataFrameDataSource>;
                    });

                    it("should call onChange and onRunQuery when the use time range checkbox is checked", async () => {
                        const result = renderComponent(
                            { type: DataFrameQueryType.Data },
                            '',
                            '',
                            [],
                            [],
                            undefined,
                            {},
                            mockDatasource
                        );
                        onChange = result.onChange;
                        onRunQuery = result.onRunQuery;
                        useTimeRangeCheckbox = screen.getAllByRole('switch')[2];

                        await user.click(useTimeRangeCheckbox);

                        await waitFor(() => {
                            expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
                                filterXRangeOnZoomPan: true
                            }));
                            expect(onRunQuery).toHaveBeenCalled();
                        });
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

            it("should show the expected options in sorted order in the data table properties field", async () => {
                await user.click(dataTablePropertiesField);

                const optionControls = screen.getAllByRole('option');
                const optionTexts = optionControls.map(opt => opt.textContent);
                expect(optionTexts).toEqual([
                    "Columns",
                    "Created",
                    "Data table ID",
                    "Data table name",
                    "Data table properties",
                    "Metadata modified",
                    "Metadata revision",
                    "Rows",
                    "Rows modified",
                    "Supports append",
                    "Workspace"
                ]);
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

            it("should show the expected options in sorted order in the column properties field", async () => {
                await user.click(columnPropertiesField);

                const optionControls = screen.getAllByRole('option');
                const optionTexts = optionControls.map(opt => opt.textContent);
                expect(optionTexts).toEqual([
                    "Column data type",
                    "Column name",
                    "Column properties",
                    "Column type"
                ]);
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
                await user.tab();

                expect(takeInput).toHaveValue(1000);
            });

            it("should show an error message when the take value entered is less than or equal to 0", async () => {
                await user.clear(takeInput);
                await user.type(takeInput, "0");
                await user.tab();

                await waitFor(() => {
                    expect(screen.getByText("Enter a value greater than or equal to 1."))
                        .toBeInTheDocument();
                });
            });

            it("should show an error message when the take value entered is greater than 1000", async () => {
                await user.clear(takeInput);
                await user.type(takeInput, "5000");
                await user.tab();

                await waitFor(() => {
                    expect(screen.getByText("Enter a value less than or equal to 1000."))
                        .toBeInTheDocument();
                });
            });

            it("should not show an error message when a valid take value is entered", async () => {
                await user.clear(takeInput);
                await user.type(takeInput, "500");
                await user.tab();

                await waitFor(() => {
                    expect(screen.queryByText("Enter a value greater than or equal to 1."))
                        .not.toBeInTheDocument();
                    expect(screen.queryByText("Enter a value less than or equal to 1000."))
                        .not.toBeInTheDocument();
                });
            });

            it("should call onChange when a valid take value is entered", async () => {
                await user.clear(takeInput);
                await user.type(takeInput, "500");
                await user.tab();

                await waitFor(() => {
                    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
                        take: 500,
                    }));
                });
            });

            it("should call onRunQuery when a valid take value is entered", async () => {
                await user.clear(takeInput);
                await user.type(takeInput, "500");
                await user.tab();

                await waitFor(() => {
                    expect(onRunQuery).toHaveBeenCalled();
                });
            });

            it("should not call onChange and onRunQuery until take input loses focus", async () => {
                await user.clear(takeInput);
                await user.type(takeInput, "500");

                await waitFor(() => {
                    expect(onChange).not.toHaveBeenCalled();
                    expect(onRunQuery).not.toHaveBeenCalled();
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

        it("should update query prop when dataTableFilter changes", async () => {
            const { initialQuery } = renderComponent({
                type: DataFrameQueryType.Data,
                dataTableFilter: 'InitialFilter'
            });

            // Get the onDataTableFilterChange callback from the mock
            const [[props]] = (DataFrameQueryBuilderWrapper as jest.Mock).mock.calls;
            const { onDataTableFilterChange } = props;

            // Simulate the filter change event
            const mockEvent = {
                detail: { linq: "NewFilter" }
            } as Event & { detail: { linq: string; }; };

            onDataTableFilterChange(mockEvent);

            expect(initialQuery.dataTableFilter).toBe('NewFilter');
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

        it('should pass datasourceHelp message as additionalInfoMessage to the wrapper', () => {
          renderComponent({ type: DataFrameQueryType.Data, dataTableFilter: 'TestFilter' });

          const [[props]] = (DataFrameQueryBuilderWrapper as jest.Mock).mock.calls;

          expect(props.additionalInfoMessage).toBe(infoMessage.datasourceHelp);
        });

        it("should pass columnFilter to the query builder wrapper", () => {
            renderComponent({ type: DataFrameQueryType.Data, columnFilter: 'InitialColumnFilter' });

            expect(DataFrameQueryBuilderWrapper).toHaveBeenCalledWith(
                expect.objectContaining({
                    columnFilter: 'InitialColumnFilter',
                    onColumnFilterChange: expect.any(Function),
                }),
                expect.anything() // React context
            );
        });

        it("should call onChange with updated columnFilter when columns filter changes", async () => {
            const { onChange } = renderComponent({ type: DataFrameQueryType.Data });

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

        it("should update query prop when columnFilter changes", async () => {
            const { initialQuery } = renderComponent({
                type: DataFrameQueryType.Data,
                dataTableFilter: 'InitialFilter'
            });

            // Get the onColumnFilterChange callback from the mock
            const [[props]] = (DataFrameQueryBuilderWrapper as jest.Mock).mock.calls;
            const { onColumnFilterChange } = props;

            // Simulate the filter change event
            const mockEvent = {
                detail: { linq: "NewColumnFilter" }
            } as Event & { detail: { linq: string; }; };

            onColumnFilterChange(mockEvent);

            expect(initialQuery.columnFilter).toBe('NewColumnFilter');
        });

        it("should not call onChange or onRunQuery when the columnFilter remains unchanged", async () => {
            const { onChange, onRunQuery } = renderComponent({
                type: DataFrameQueryType.Data,
                columnFilter: 'SameColumnFilter'
            });

            // Get the onColumnFilterChange callback from the mock
            const [[props]] = (DataFrameQueryBuilderWrapper as jest.Mock).mock.calls;
            const { onColumnFilterChange } = props;

            // Simulate the filter change event with the same filter
            const mockEvent = {
                detail: { linq: "SameColumnFilter" }
            } as Event & { detail: { linq: string; }; };

            onColumnFilterChange(mockEvent);

            await waitFor(() => {
                expect(onChange).not.toHaveBeenCalled();
                expect(onRunQuery).not.toHaveBeenCalled();
            });
        });

        it('should pass resultFilter to the query builder wrapper', () => {
            renderComponent({ type: DataFrameQueryType.Data, resultFilter: 'InitialResultFilter' });

            expect(DataFrameQueryBuilderWrapper).toHaveBeenCalledWith(
                expect.objectContaining({
                    resultFilter: 'InitialResultFilter',
                    onResultFilterChange: expect.any(Function),
                }),
                expect.anything() // React context
            );
        });

        it('should call onChange with updated resultFilter when results filter changes', async () => {
            const { onChange } = renderComponent({ type: DataFrameQueryType.Data });

            // Get the onResultFilterChange callback from the mock
            const [[props]] = (DataFrameQueryBuilderWrapper as jest.Mock).mock.calls;
            const { onResultFilterChange } = props;

            // Simulate the filter change event
            const mockEvent = {
                detail: { linq: 'NewResultFilter' }
            } as Event & { detail: { linq: string; }; };

            onResultFilterChange(mockEvent);

            await waitFor(() => {
                expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
                    resultFilter: 'NewResultFilter'
                }));
            });
        });

        it('should update query prop when resultFilter changes', async () => {
            const { initialQuery } = renderComponent({
                type: DataFrameQueryType.Data,
                resultFilter: 'InitialResultFilter'
            });

            // Get the onResultFilterChange callback from the mock
            const [[props]] = (DataFrameQueryBuilderWrapper as jest.Mock).mock.calls;
            const { onResultFilterChange } = props;

            // Simulate the filter change event
            const mockEvent = {
                detail: { linq: 'NewResultFilter' }
            } as Event & { detail: { linq: string; }; };

            onResultFilterChange(mockEvent);

            expect(initialQuery.resultFilter).toBe('NewResultFilter');
        });

        it('should not call onChange or onRunQuery when the resultFilter remains unchanged', async () => {
            const { onChange, onRunQuery } = renderComponent({
                type: DataFrameQueryType.Data,
                resultFilter: 'SameResultFilter'
            });

            // Get the onResultFilterChange callback from the mock
            const [[props]] = (DataFrameQueryBuilderWrapper as jest.Mock).mock.calls;
            const { onResultFilterChange } = props;

            // Simulate the filter change event with the same filter
            const mockEvent = {
                detail: { linq: 'SameResultFilter' }
            } as Event & { detail: { linq: string; }; };

            onResultFilterChange(mockEvent);

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

