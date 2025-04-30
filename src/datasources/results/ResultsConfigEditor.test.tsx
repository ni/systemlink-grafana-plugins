import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ResultsConfigEditor } from './ResultsConfigEditor';
import { DataSourcePluginOptionsEditorProps } from '@grafana/data';
import userEvent from '@testing-library/user-event';

const mockOnOptionsChange = jest.fn();

const defaultProps: DataSourcePluginOptionsEditorProps<any> = {
  options: {
    jsonData: {
      featureToggles: {
        queryByResults: false,
        queryBySteps: false,
      },
    },
    id: 0,
    uid: '',
    orgId: 0,
    name: '',
    typeLogoUrl: '',
    type: '',
    typeName: '',
    access: '',
    url: '',
    user: '',
    database: '',
    basicAuth: true,
    basicAuthUser: '',
    isDefault: false,
    secureJsonFields: {},
    readOnly: false,
    withCredentials: false,
  },
  onOptionsChange: mockOnOptionsChange,
};
let resultsQueryBuilder: HTMLElement;
let stepsQueryBuilder: HTMLElement;

describe('ResultsConfigEditor', () => {
  beforeEach(() => {
    render(<ResultsConfigEditor {...defaultProps} />);
    resultsQueryBuilder = screen.getAllByRole('checkbox')[3];
    stepsQueryBuilder = screen.getAllByRole('checkbox')[7];
  });

  test('renders the component with feature toggles', () => {
    expect(resultsQueryBuilder).toBeInTheDocument();
    expect(stepsQueryBuilder).toBeInTheDocument();
  });

  test('toggles Results Query Builder feature', async () => {
    render(<ResultsConfigEditor {...defaultProps} />);

    expect(resultsQueryBuilder).not.toBeChecked();

    await userEvent.click(resultsQueryBuilder);
    await waitFor(() => {
      expect(mockOnOptionsChange).toHaveBeenCalledWith(expect.objectContaining({ queryByResults: true }));
    });
  });

  test('toggles Steps Query Builder feature', () => {
    render(<ResultsConfigEditor {...defaultProps} />);

    expect(stepsQueryBuilder).not.toBeChecked();

    fireEvent.click(stepsQueryBuilder);

    expect(mockOnOptionsChange).toHaveBeenCalledWith({
      ...defaultProps.options,
      jsonData: {
        featureToggles: {
          ...defaultProps.options.jsonData.featureToggles,
          queryBySteps: true,
        },
      },
    });
  });

  test('renders DataSourceHttpSettings component', () => {
    render(<ResultsConfigEditor {...defaultProps} />);

    expect(screen.getByText('URL')).toBeInTheDocument();
  });
});
