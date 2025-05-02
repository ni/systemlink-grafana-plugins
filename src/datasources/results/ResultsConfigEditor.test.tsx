import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ResultsConfigEditor } from './ResultsConfigEditor';
import { DataSourcePluginOptionsEditorProps, DataSourceSettings } from '@grafana/data';
import userEvent from '@testing-library/user-event';

const mockOnOptionsChange = jest.fn();
jest.mock('@grafana/ui', () => ({
  ...jest.requireActual('@grafana/ui'),
  DataSourceHttpSettings: jest.fn(() => <div>Mock DataSourceHttpSettings</div>),
}));

const defaultProps: DataSourcePluginOptionsEditorProps<any> = {
  options: {
    jsonData: {
      featureToggles: {
        queryByResults: false,
        queryBySteps: false,
      },
    },
    id: 0,
  } as DataSourceSettings<any>,
  onOptionsChange: mockOnOptionsChange,
};
let resultsQueryBuilder: HTMLElement;
let stepsQueryBuilder: HTMLElement;

describe('ResultsConfigEditor', () => {
  beforeEach(() => {
    render(<ResultsConfigEditor {...defaultProps} />);

    resultsQueryBuilder = screen.getAllByRole('checkbox')[0];
    stepsQueryBuilder = screen.getAllByRole('checkbox')[1];
    jest.clearAllMocks();
  });
  test('renders DataSourceHttpSettings component', () => {
    expect(screen.getByText('Mock DataSourceHttpSettings')).toBeInTheDocument();
  });

  test('renders the component with feature toggles', () => {
    expect(resultsQueryBuilder).toBeInTheDocument();
    expect(stepsQueryBuilder).toBeInTheDocument();
  });

  test('toggles Results Query Builder feature', async () => {
    expect(resultsQueryBuilder).not.toBeChecked();

    await userEvent.click(resultsQueryBuilder);
    await waitFor(() => {
      expect(mockOnOptionsChange).toHaveBeenCalledWith(
        expect.objectContaining({ "jsonData": {"featureToggles": {"queryByResults": true, "queryBySteps": false}}})
      );
    });
  });

  test('toggles Steps Query Builder feature', () => {
    expect(stepsQueryBuilder).not.toBeChecked();

    fireEvent.click(stepsQueryBuilder);

    expect(mockOnOptionsChange).toHaveBeenCalledWith(
      expect.objectContaining({ "jsonData": {"featureToggles": {"queryByResults": false, "queryBySteps": true}}})
    );
  });
});
