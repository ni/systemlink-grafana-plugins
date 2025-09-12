import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { DataSourcePluginOptionsEditorProps, DataSourceSettings } from '@grafana/data';
import userEvent from '@testing-library/user-event';
import { DataFrameConfigEditor } from './DataFrameConfigEditor';

const mockOnOptionsChange = jest.fn();
jest.mock('@grafana/ui', () => ({
    ...jest.requireActual('@grafana/ui'),
    DataSourceHttpSettings: jest.fn(() => <div>Mock DataSourceHttpSettings</div>),
}));

const defaultProps: DataSourcePluginOptionsEditorProps<any> = {
    options: {
        jsonData: {
            featureToggles: {
                queryByDataTableProperties: false
            },
        },
        id: 0,
    } as DataSourceSettings<any>,
    onOptionsChange: mockOnOptionsChange,
};
let dataTableQueryBuilderToggle: HTMLElement;

describe('DataFrameConfigEditor', () => {
    beforeEach(() => {
        render(<DataFrameConfigEditor {...defaultProps} />);

        dataTableQueryBuilderToggle = screen.getAllByRole('switch')[0];
    });

    test('should render DataSourceHttpSettings component when DataFrameConfigEditor is loaded', () => {
        expect(screen.getByText('Mock DataSourceHttpSettings')).toBeInTheDocument();
    });

    test('should render the component with feature toggle when loaded', () => {
        expect(dataTableQueryBuilderToggle).toBeInTheDocument();
    });

    test('should update the queryByDataTableProperties feature toggles option when it is toggled', async () => {
        const expecteJsonData = {
            "jsonData": { "featureToggles": { "queryByDataTableProperties": true } }
        };

        expect(dataTableQueryBuilderToggle).not.toBeChecked();

        await userEvent.click(dataTableQueryBuilderToggle);
        await waitFor(() => {
            expect(mockOnOptionsChange).toHaveBeenCalledWith(
                expect.objectContaining(expecteJsonData)
            );
        });
    });
});
