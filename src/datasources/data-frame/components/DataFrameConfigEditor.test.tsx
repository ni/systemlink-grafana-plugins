import React from 'react';
import { render, screen } from '@testing-library/react';
import { DataSourcePluginOptionsEditorProps, DataSourceSettings } from '@grafana/data';
import { DataFrameConfigEditor } from './DataFrameConfigEditor';
import { DataFrameDataSourceOptions } from '../types';

const mockOnOptionsChange = jest.fn();
jest.mock('@grafana/ui', () => ({
    ...jest.requireActual('@grafana/ui'),
    DataSourceHttpSettings: jest.fn(() => <div>Mock DataSourceHttpSettings</div>),
}));

const defaultProps: DataSourcePluginOptionsEditorProps<any> = {
    options: {
        jsonData: {},
        id: 0,
    } as DataSourceSettings<DataFrameDataSourceOptions>,
    onOptionsChange: mockOnOptionsChange,
};

describe('DataFrameConfigEditor', () => {
    beforeEach(() => {
        render(<DataFrameConfigEditor {...defaultProps} />);
    });

    test('should render DataSourceHttpSettings component when DataFrameConfigEditor is loaded', () => {
        expect(screen.getByText('Mock DataSourceHttpSettings')).toBeInTheDocument();
    });
});
