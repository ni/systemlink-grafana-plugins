import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { AlarmsQueryEditor } from './AlarmsQueryEditor';
import { AlarmsQuery, QueryType } from '../types/types';
import { QueryEditorProps } from '@grafana/data';
import { AlarmsDataSource } from '../AlarmsDataSource';
import userEvent from '@testing-library/user-event';
import { defaultAlarmTrendQuery, defaultListAlarmsQuery } from '../constants/DefaultQueries.constants';
import { ListAlarmsQueryEditor } from './editors/list-alarms/ListAlarmsQueryEditor';
import { AlarmTrendQueryEditor } from './editors/alarm-trend/AlarmTrendQueryEditor';

jest.mock('./editors/list-alarms/ListAlarmsQueryEditor', () => ({
  ListAlarmsQueryEditor: jest.fn(() => <div data-testid="mock-list-alarms" />),
}));
jest.mock('./editors/alarm-trend/AlarmTrendQueryEditor', () => ({
  AlarmTrendQueryEditor: jest.fn(() => <div data-testid="mock-alarm-trend" />),
}));

const mockListAlarmsQueryHandler = {
  defaultQuery: defaultListAlarmsQuery,
};
const mockAlarmTrendQueryHandler = {
  defaultQuery: defaultAlarmTrendQuery,
};
const mockOnChange = jest.fn();
const mockOnRunQuery = jest.fn();
const mockDatasource = {
  prepareQuery: jest.fn((query: AlarmsQuery) => query),
  listAlarmsQueryHandler: mockListAlarmsQueryHandler,
  alarmTrendQueryHandler: mockAlarmTrendQueryHandler,
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

function renderAlarmsQueryEditorWithRerender(
  initialQuery: AlarmsQuery,
  datasource: AlarmsDataSource,
  onRunQuery: jest.Mock
) {
  const onChange = jest.fn();
  const renderResult = render(
    <AlarmsQueryEditor
      datasource={datasource}
      query={initialQuery}
      onChange={onChange}
      onRunQuery={onRunQuery}
    />
  );

  onChange.mockImplementation(newQuery => {
    renderResult.rerender(
      <AlarmsQueryEditor
        datasource={datasource}
        query={newQuery}
        onChange={onChange}
        onRunQuery={onRunQuery}
      />
    );
  });

  return { renderResult, onChange };
}

describe('AlarmsQueryEditor', () => {
  beforeAll(() => {
    // JSDOM provides offsetHeight as 0 by default.
    // Mocking it to return 30 because the ComboBox virtualization relies on this value
    // to correctly calculate and render the dropdown options.
    jest.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(30);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('should call onChange and onRunQuery on initialization', () => {
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

    expect(mockOnChange).toHaveBeenCalledWith(
      expect.objectContaining({
        queryType: QueryType.ListAlarms,
      })
    );
    expect(mockOnRunQuery).toHaveBeenCalled();
  });

  it('should preserve base query properties across query type changes', async () => {
    const initialAlarmTrendQuery = {
      refId: 'A',
      queryType: QueryType.AlarmTrend,
      hide: false, // Base query property
    } as AlarmsQuery;
    const { onChange } = renderAlarmsQueryEditorWithRerender(initialAlarmTrendQuery, mockDatasource, mockOnRunQuery);

    await clickQueryTypeOption(QueryType.ListAlarms);

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          refId: 'A',
          hide: false,
          queryType: QueryType.ListAlarms,
          ...defaultListAlarmsQuery,
        })
      );
    });

    await clickQueryTypeOption(QueryType.AlarmTrend);

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          refId: 'A',
          hide: false,
          queryType: QueryType.AlarmTrend,
          ...defaultAlarmTrendQuery,
        })
      );
    });
  });

  describe('ListAlarmsQueryEditor', () => {
    it('should display description text for List Alarms query type', () => {
      const query = buildQuery({ queryType: QueryType.ListAlarms });

      renderElement(query);

      expect(screen.getByText('List alarms allows you to search for alarms based on various filters.')).toBeInTheDocument();
    });

    it('should render list alarms query type and its editor in the UI', () => {
      const query = buildQuery({ queryType: QueryType.ListAlarms });
  
      renderElement(query);
      const queryTypeControl = screen.getAllByRole('combobox')[0];

      expect(queryTypeControl).toBeInTheDocument();
      expect(queryTypeControl).toHaveDisplayValue(QueryType.ListAlarms);
      expect(screen.getByTestId('mock-list-alarms')).toBeInTheDocument();
    });

    it('should pass the correct props to ListAlarmsQueryEditor', () => {
      const query = buildQuery({ queryType: QueryType.ListAlarms });

      renderElement(query);

      expect(ListAlarmsQueryEditor).toHaveBeenCalledWith(
        expect.objectContaining({
          query,
          handleQueryChange: expect.any(Function),
          datasource: mockDatasource.listAlarmsQueryHandler
        }),
        expect.anything()
      );
    });

    it('should call onChange with defaultListAlarmsQuery when switched to list alarms query type from other query type', async () => {
      const query = buildQuery({ queryType: QueryType.AlarmTrend });

      renderElement(query);
      await clickQueryTypeOption(QueryType.ListAlarms);

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith(
          expect.objectContaining({
            queryType: QueryType.ListAlarms,
            ...defaultListAlarmsQuery
          })
        );
        expect(mockOnRunQuery).toHaveBeenCalled();
      });
    });

    it('should not affect the same properties when switching between query types', async () => {
      const query = buildQuery({
        refId: 'A',
        queryType: QueryType.ListAlarms, 
        filter: 'initial-filter' 
      } as AlarmsQuery);

      renderElement(query);
      await clickQueryTypeOption(QueryType.AlarmTrend);

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith(
          expect.objectContaining({
            filter: '',
          })
        );
        expect(mockOnRunQuery).toHaveBeenCalled();
      });
    });

    it('should preserve the current state of ListAlarmsQuery when switching from list alarms to other types', async () => {
      const initialListAlarmsQuery = {
        refId: 'A',
        queryType: QueryType.ListAlarms,
        filter: 'filter-in-list-alarms',
      } as AlarmsQuery;
      const { onChange } = renderAlarmsQueryEditorWithRerender(initialListAlarmsQuery, mockDatasource, mockOnRunQuery);

      await clickQueryTypeOption(QueryType.AlarmTrend);

      await waitFor(() => {
        expect(onChange).toHaveBeenCalledWith(
          expect.objectContaining({
            refId: 'A',
            queryType: QueryType.AlarmTrend,
            ...defaultAlarmTrendQuery
          })
        );
      });

      await clickQueryTypeOption(QueryType.ListAlarms);

      await waitFor(() => {
        expect(onChange).toHaveBeenCalledWith(
          expect.objectContaining({
            refId: 'A',
            queryType: QueryType.ListAlarms,
            ...defaultListAlarmsQuery,
            filter: 'filter-in-list-alarms',
          })
        );
      });
    });
  });

  describe('AlarmTrendQueryEditor', () => {
    it('should render the AlarmTrendQueryEditor if queryType is AlarmTrend', () => {
      const query = buildQuery({ queryType: QueryType.AlarmTrend });

      renderElement(query);

      expect(screen.getByTestId('mock-alarm-trend')).toBeInTheDocument();
    });

    it('should not render the AlarmTrendQueryEditor when queryType is invalid', () => {
      const query = buildQuery({ queryType: undefined });

      renderElement(query);

      expect(screen.queryByTestId('mock-alarm-trend')).not.toBeInTheDocument();
    });

    it('should pass the correct props to AlarmTrendQueryEditor', () => {
      const query = buildQuery({ queryType: QueryType.AlarmTrend });

      renderElement(query);

      expect(AlarmTrendQueryEditor).toHaveBeenCalledWith(
        expect.objectContaining({
          query,
          handleQueryChange: expect.any(Function),
          datasource: mockDatasource.alarmTrendQueryHandler,
        }),
        expect.anything()
      );
    });

    it('should call onChange with defaultAlarmTrendQuery when switched to alarm trend query type from other query type', async () => {
      const query = buildQuery({ queryType: QueryType.ListAlarms });

      renderElement(query);
      await clickQueryTypeOption(QueryType.AlarmTrend);

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith(
          expect.objectContaining({
            refId: 'A',
            queryType: QueryType.AlarmTrend,
            ...defaultAlarmTrendQuery,
          })
        );
        expect(mockOnRunQuery).toHaveBeenCalled();
      });
    });

    it('should not affect the same properties when switching between query types', async () => {
      const query = buildQuery({
        refId: 'A',
        queryType: QueryType.AlarmTrend,
        filter: 'initial-filter' 
      } as AlarmsQuery);

      renderElement(query);
      await clickQueryTypeOption(QueryType.ListAlarms);

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith(
          expect.objectContaining({
            filter: ''
          })
        );
        expect(mockOnRunQuery).toHaveBeenCalled();
      });
    });

    it('should preserve the current state of AlarmTrendQuery when switching from alarm trend to other types', async () => {
      const initialAlarmTrendQuery = {
        refId: 'A',
        queryType: QueryType.AlarmTrend,
        filter: 'filter-in-alarm-trend',
      } as AlarmsQuery;
      const { onChange } = renderAlarmsQueryEditorWithRerender(initialAlarmTrendQuery, mockDatasource, mockOnRunQuery);

      await clickQueryTypeOption(QueryType.ListAlarms);

      await waitFor(() => {
        expect(onChange).toHaveBeenCalledWith(
          expect.objectContaining({
            refId: 'A',
            queryType: QueryType.ListAlarms,
            ...defaultListAlarmsQuery
          })
        );
      });

      await clickQueryTypeOption(QueryType.AlarmTrend);

      await waitFor(() => {
        expect(onChange).toHaveBeenCalledWith(
          expect.objectContaining({
            refId: 'A',
            queryType: QueryType.AlarmTrend,
            ...defaultAlarmTrendQuery,
            filter: 'filter-in-alarm-trend',
          })
        );
      });
    });
  });
});
