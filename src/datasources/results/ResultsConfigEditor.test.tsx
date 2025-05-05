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
let resultsQueryBuilderToggle: HTMLElement;
let stepsQueryBuilderToggle: HTMLElement;

describe('ResultsConfigEditor', () => {
  beforeEach(() => {
    render(<ResultsConfigEditor {...defaultProps} />);

    resultsQueryBuilderToggle = screen.getAllByRole('checkbox')[0];
    stepsQueryBuilderToggle = screen.getAllByRole('checkbox')[1];
  });
  test('should render DataSourceHttpSettings component when ResultsConfigEditor is loaded', () => {
    expect(screen.getByText('Mock DataSourceHttpSettings')).toBeInTheDocument();
  });

  test('should render the component with feature toggles when loaded', () => {
    expect(resultsQueryBuilderToggle).toBeInTheDocument();
    expect(stepsQueryBuilderToggle).toBeInTheDocument();
  });

  test('should update the queryByResults feature toggles option when it is toggled', async () => {
    expect(resultsQueryBuilderToggle).not.toBeChecked();

    await userEvent.click(resultsQueryBuilderToggle);
    await waitFor(() => {
      expect(mockOnOptionsChange).toHaveBeenCalledWith(
        expect.objectContaining({ "jsonData": {"featureToggles": {"queryByResults": true, "queryBySteps": false}}})
      );
    });
  });

  test('should update the queryBySteps feature toggles option when it is toggled', () => {
    expect(stepsQueryBuilderToggle).not.toBeChecked();

    fireEvent.click(stepsQueryBuilderToggle);

    expect(mockOnOptionsChange).toHaveBeenCalledWith(
      expect.objectContaining({ "jsonData": {"featureToggles": {"queryByResults": false, "queryBySteps": true}}})
    );
  });
});
