import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { DataSourcePluginOptionsEditorProps, DataSourceSettings } from '@grafana/data';
import userEvent from '@testing-library/user-event';
import { DataFrameConfigEditor } from './DataFrameConfigEditor';
import { DataFrameDataSourceOptions } from '../types';

const mockOnOptionsChange = jest.fn();
jest.mock('@grafana/ui', () => ({
    ...jest.requireActual('@grafana/ui'),
    DataSourceHttpSettings: jest.fn(() => <div>Mock DataSourceHttpSettings</div>),
}));

const defaultProps: DataSourcePluginOptionsEditorProps<any> = {
    options: {
        jsonData: {
            featureToggles: {
                queryUndecimatedData: false,
                highResolutionZoom: false
            },
        },
        id: 0,
    } as DataSourceSettings<DataFrameDataSourceOptions>,
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

    test('should update the queryUndecimatedData feature toggles option when it is toggled', async () => {
        const queryUndecimatedDataToggle = screen.getAllByRole('switch')[2];
        const expectedJsonData = {
            "jsonData": { 
                "featureToggles": { 
                    "queryUndecimatedData": true,
                    "highResolutionZoom": false
                } 
            }
        };  
        expect(queryUndecimatedDataToggle).not.toBeChecked();

        await userEvent.click(queryUndecimatedDataToggle);
        await waitFor(() => {
            expect(mockOnOptionsChange).toHaveBeenCalledWith(
                expect.objectContaining(expectedJsonData)
            );
        });
    });

    test('should update the highResolutionZoom feature toggles option when it is toggled', async () => {
        const highResolutionZoomToggle = screen.getAllByRole('switch')[3];
        const expectedJsonData = {
            "jsonData": { 
                "featureToggles": { 
                    "queryUndecimatedData": false,
                    "highResolutionZoom": true
                } 
            }
        };  
        expect(highResolutionZoomToggle).not.toBeChecked();

        await userEvent.click(highResolutionZoomToggle);
        await waitFor(() => {
            expect(mockOnOptionsChange).toHaveBeenCalledWith(
                expect.objectContaining(expectedJsonData)
            );
        });
    });
});
