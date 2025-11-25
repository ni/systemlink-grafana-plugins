import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { AlarmsQueryEditor } from './AlarmsQueryEditor';
import { AlarmsQuery, QueryType } from '../types/types';
import { QueryEditorProps } from '@grafana/data';
import { AlarmsDataSource } from '../AlarmsDataSource';
import userEvent from '@testing-library/user-event';
import { defaultAlarmsTrendQuery, defaultListAlarmsQuery } from '../constants/DefaultQueries.constants';
import { ListAlarmsQueryEditor } from './editors/list-alarms/ListAlarmsQueryEditor';
import { AlarmsTrendQueryEditor } from './editors/alarms-trend/AlarmsTrendQueryEditor';

jest.mock('./editors/list-alarms/ListAlarmsQueryEditor', () => ({
  ListAlarmsQueryEditor: jest.fn(() => <div data-testid="mock-list-alarms" />),
}));
jest.mock('./editors/alarms-trend/AlarmsTrendQueryEditor', () => ({
  AlarmsTrendQueryEditor: jest.fn(() => <div data-testid="mock-alarms-trend" />),
}));

const mockListAlarmsQueryHandler = {
  defaultQuery: defaultListAlarmsQuery,
};
const mockAlarmsTrendQueryHandler = {
  defaultQuery: defaultAlarmsTrendQuery,
};
const mockOnChange = jest.fn();
const mockOnRunQuery = jest.fn();
const mockDatasource = {
  prepareQuery: jest.fn((query: AlarmsQuery) => query),
  listAlarmsQueryHandler: mockListAlarmsQueryHandler,
  alarmsTrendQueryHandler: mockAlarmsTrendQueryHandler,
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
    const initialAlarmsTrendQuery = {
      refId: 'A',
      queryType: QueryType.AlarmsTrend,
      hide: false, // Base query property
    } as AlarmsQuery;
    const { onChange } = renderAlarmsQueryEditorWithRerender(initialAlarmsTrendQuery, mockDatasource, mockOnRunQuery);

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

    await clickQueryTypeOption(QueryType.AlarmsTrend);

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          refId: 'A',
          hide: false,
          queryType: QueryType.AlarmsTrend,
          ...defaultAlarmsTrendQuery,
        })
      );
    });
  });

  describe('ListAlarmsQueryEditor', () => {
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
      const query = buildQuery({ queryType: QueryType.AlarmsTrend });

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
      await clickQueryTypeOption(QueryType.AlarmsTrend);

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

      await clickQueryTypeOption(QueryType.AlarmsTrend);

      await waitFor(() => {
        expect(onChange).toHaveBeenCalledWith(
          expect.objectContaining({
            refId: 'A',
            queryType: QueryType.AlarmsTrend,
            ...defaultAlarmsTrendQuery
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

  describe('AlarmsTrendQueryEditor', () => {
    it('should render the AlarmsTrendQueryEditor if queryType is AlarmsTrend', () => {
      const query = buildQuery({ queryType: QueryType.AlarmsTrend });

      renderElement(query);

      expect(screen.getByTestId('mock-alarms-trend')).toBeInTheDocument();
    });

    it('should not render the AlarmsTrendQueryEditor when queryType is invalid', () => {
      const query = buildQuery({ queryType: undefined });

      renderElement(query);

      expect(screen.queryByTestId('mock-alarms-trend')).not.toBeInTheDocument();
    });

    it('should pass the correct props to AlarmsTrendQueryEditor', () => {
      const query = buildQuery({ queryType: QueryType.AlarmsTrend });

      renderElement(query);

      expect(AlarmsTrendQueryEditor).toHaveBeenCalledWith(
        expect.objectContaining({
          query,
          handleQueryChange: expect.any(Function),
          datasource: mockDatasource.alarmsTrendQueryHandler,
        }),
        expect.anything()
      );
    });

    it('should call onChange with defaultAlarmsTrendQuery when switched to alarms trend query type from other query type', async () => {
      const query = buildQuery({ queryType: QueryType.ListAlarms });

      renderElement(query);
      await clickQueryTypeOption(QueryType.AlarmsTrend);

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith(
          expect.objectContaining({
            refId: 'A',
            queryType: QueryType.AlarmsTrend,
            ...defaultAlarmsTrendQuery,
          })
        );
        expect(mockOnRunQuery).toHaveBeenCalled();
      });
    });

    it('should not affect the same properties when switching between query types', async () => {
      const query = buildQuery({
        refId: 'A',
        queryType: QueryType.AlarmsTrend,
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

    it('should preserve the current state of AlarmsTrendQuery when switching from alarms trend to other types', async () => {
      const initialAlarmsTrendQuery = {
        refId: 'A',
        queryType: QueryType.AlarmsTrend,
        filter: 'filter-in-alarms-trend',
      } as AlarmsQuery;
      const { onChange } = renderAlarmsQueryEditorWithRerender(initialAlarmsTrendQuery, mockDatasource, mockOnRunQuery);

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

      await clickQueryTypeOption(QueryType.AlarmsTrend);

      await waitFor(() => {
        expect(onChange).toHaveBeenCalledWith(
          expect.objectContaining({
            refId: 'A',
            queryType: QueryType.AlarmsTrend,
            ...defaultAlarmsTrendQuery,
            filter: 'filter-in-alarms-trend',
          })
        );
      });
    });
  });
});
