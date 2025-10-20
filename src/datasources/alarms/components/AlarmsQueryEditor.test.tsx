import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { AlarmsQueryEditor } from './AlarmsQueryEditor';
import { AlarmsQuery, QueryType } from '../types/types';
import { QueryEditorProps } from '@grafana/data';
import { AlarmsDataSource } from '../AlarmsDataSource';
import { AlarmsCountQueryEditor } from './editors/alarms-count/AlarmsCountQueryEditor';
import userEvent from '@testing-library/user-event';
import { defaultListAlarmsQuery } from '../constants/DefaultQueries.constants';

jest.mock('./editors/alarms-count/AlarmsCountQueryEditor', () => ({
  AlarmsCountQueryEditor: jest.fn(() => <div data-testid="mock-alarms-count" />),
}));

const mockOnChange = jest.fn();
const mockOnRunQuery = jest.fn();
const mockDatasource = {
  prepareQuery: jest.fn((query: AlarmsQuery) => query),
  alarmsCountDataSource: {},
} as unknown as AlarmsDataSource;

const defaultProps: QueryEditorProps<AlarmsDataSource, AlarmsQuery> = {
  query: {
    refId: 'A',
  },
  onChange: mockOnChange,
  onRunQuery: mockOnRunQuery,
  datasource: mockDatasource,
};

function buildQuery(query: Omit<AlarmsQuery, 'refId'> = {}) {
  return { refId: 'A', ...query };
}

async function clickQueryTypeOption(option: QueryType) {
  const queryTypeControl = screen.getAllByRole('combobox')[0];
  await userEvent.click(queryTypeControl);
  const queryTypeOptionControl = await screen.findByRole('option', { name: option });
  await userEvent.click(queryTypeOptionControl);
}

function renderElement(query: AlarmsQuery) {
  const reactNode = React.createElement(AlarmsQueryEditor, { ...defaultProps, query });
  return render(reactNode);
}

describe('AlarmsQueryEditor', () => {
  beforeAll(() => {
    // Mock offsetHeight for virtualization calculations
    Object.defineProperties(HTMLElement.prototype, {
      offsetHeight: {
        get() { return 30; } // Height per option
      },
    });
  });

  it('should call onChange and onRunQuery on initialization meaning query type is not defined', () => {
    const query = buildQuery();

    renderElement(query);

    expect(mockOnChange).toHaveBeenCalledTimes(1);
    expect(mockOnRunQuery).toHaveBeenCalledTimes(1);
  });

  it('should not call onChange and onRunQuery after initialization', () => {
    const query = buildQuery({ queryType: QueryType.ListAlarms });

    renderElement(query);

    expect(mockOnChange).not.toHaveBeenCalled();
    expect(mockOnRunQuery).not.toHaveBeenCalled();
  });

  it('should initialize with ListAlarms when queryType is undefined', () => {
    const query = buildQuery();

    renderElement(query);

    expect(mockOnChange).toHaveBeenCalledWith({ refId: 'A', queryType: QueryType.ListAlarms });
    expect(mockOnRunQuery).toHaveBeenCalled();
  });

  it('should preserve base query properties across query type changes', async () => {
    const initialAlarmsCountQuery = {
      refId: 'A',
      queryType: QueryType.AlarmsCount,
      hide: false, // Base query property
    } as AlarmsQuery;

    const onChange = jest.fn((newQuery) => {
      let currentQuery = { refId: 'A' };
      currentQuery = { ...currentQuery, ...newQuery };

      renderResult.rerender(
        React.createElement(AlarmsQueryEditor, { ...defaultProps, query: currentQuery, onChange })
      );
    });

    // Initial render with AlarmsCount query type
    const renderResult = render(
      React.createElement(AlarmsQueryEditor, { ...defaultProps, query: initialAlarmsCountQuery, onChange })
    );

    await clickQueryTypeOption(QueryType.ListAlarms);

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith({ refId: 'A', queryType: QueryType.ListAlarms, hide: false });
    });

    await clickQueryTypeOption(QueryType.AlarmsCount);

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith({ refId: 'A', queryType: QueryType.AlarmsCount, hide: false });
    });
  });

  describe('ListAlarmsQueryEditor', () => {
    it('should render list alarms query type and its editor in the UI', () => {
      const query = buildQuery({ queryType: QueryType.ListAlarms });
  
      renderElement(query);
  
      const queryTypeControl = screen.getAllByRole('combobox')[0];
      expect(queryTypeControl).toBeInTheDocument();
      expect(queryTypeControl).toHaveDisplayValue(QueryType.ListAlarms);
      expect(screen.getByText('List Alarms query editor')).toBeInTheDocument();
    });

    it('should call onChange with defaultListAlarmsQuery when switch to list alarms query type from other query type', async () => {
      const query = buildQuery({ queryType: QueryType.AlarmsCount });

      renderElement(query);
      await clickQueryTypeOption(QueryType.ListAlarms);

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith(expect.objectContaining(defaultListAlarmsQuery));
        expect(mockOnRunQuery).toHaveBeenCalled();
      });
    });
  });

  describe('AlarmsCountQueryEditor', () => {
    it('should render the AlarmsCountQueryEditor if queryType is AlarmsCount', () => {
      const query = buildQuery({ queryType: QueryType.AlarmsCount });

      renderElement(query);

      expect(screen.getByTestId('mock-alarms-count')).toBeInTheDocument();
    });

    it('should not render the AlarmsCountQueryEditor when queryType is invalid', () => {
      const query = buildQuery({ queryType: undefined });

      renderElement(query);

      expect(screen.queryByTestId('mock-alarms-count')).not.toBeInTheDocument();
    });

    it('should pass the correct props to AlarmsCountQueryEditor', () => {
      const query = buildQuery({ queryType: QueryType.AlarmsCount });

      renderElement(query);

      expect(AlarmsCountQueryEditor).toHaveBeenCalledWith(
        expect.objectContaining({
          query,
          handleQueryChange: expect.any(Function),
          datasource: mockDatasource.alarmsCountDataSource
        }),
        expect.anything()
      );
    });

    it('should call onChange with defaultAlarmsCountQuery when switch to alarms count query type from other query type', async () => {
      const query = buildQuery({ queryType: QueryType.ListAlarms });

      renderElement(query);
      await clickQueryTypeOption(QueryType.AlarmsCount);

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith({ refId: 'A', queryType: 'Alarms Count' });
        expect(mockOnRunQuery).toHaveBeenCalled();
      });
    });
  });
});
