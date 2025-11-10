import { DataFrameDataSource } from "datasources/data-frame/DataFrameDataSource";
import { DataFrameVariableQuery, DataFrameVariableQueryType, defaultVariableQueryV2, ValidDataFrameVariableQuery } from "datasources/data-frame/types";
import { DataFrameVariableQueryEditorV2 } from "./DataFrameVariableQueryEditorV2";
import React from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

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

            expect(combobox.value).toBe('List Data tables');
        });

        it('should show the expected options in the query type combobox', async () => {
            renderComponent();
            const combobox = screen.getByRole('combobox');
            const user = userEvent.setup();

            await user.click(combobox);

            const optionControls = within(document.body).getAllByRole('option');
            const optionValues = optionControls.map(option => option.textContent);
            expect(optionValues).toEqual([
                'List Data tables',
                'List Data table columns'
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

    it('should display FloatingError when there is an error', () => {
        const errorTitle = 'Test Error Title';
        const errorDescription = 'Test Error Description';

        renderComponent({}, errorTitle, errorDescription);

        expect(screen.getByText(errorTitle)).toBeInTheDocument();
        expect(screen.getByText(errorDescription)).toBeInTheDocument();
    });
});
