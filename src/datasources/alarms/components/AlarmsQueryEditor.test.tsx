import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import { AlarmsQueryEditor } from './AlarmsQueryEditor';
import { AlarmsQuery, QueryType } from '../types/types';
import { QueryEditorProps } from '@grafana/data';
import { AlarmsDataSource } from '../AlarmsDataSource';
import { AlarmsCountQueryEditor } from './editors/alarms-count/AlarmsCountQueryEditor';
import { defaultListAlarmsQuery } from '../constants/defaultQueries';
import userEvent from '@testing-library/user-event';

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

function renderElement(query: AlarmsQuery) {
  const reactNode = React.createElement(AlarmsQueryEditor, { ...defaultProps, query });
  return render(reactNode);
}

describe('AlarmsQueryEditor', () => {

  beforeAll(() => {
  const mockGetBoundingClientRect = jest.fn(() => ({
    width: 120,
    height: 120,
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
  }));

  Object.defineProperty(Element.prototype, 'getBoundingClientRect', {
    value: mockGetBoundingClientRect,
  });
});

beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    mockOnChange.mockClear();
    mockOnRunQuery.mockClear();
  });

  it('should call onChange and onRunQuery on initialization meaning query type is not defined', () => {
    const query = buildQuery();

    renderElement(query);

    expect(mockOnChange).toHaveBeenCalledTimes(1);
    expect(mockOnRunQuery).toHaveBeenCalledTimes(1);
  });

  it('should not call onChange and onRunQuery after initialization', () => {
    const query = buildQuery({ queryType: QueryType. ListAlarms });

    renderElement(query);

    expect(mockOnChange).not.toHaveBeenCalled();
    expect(mockOnRunQuery).not.toHaveBeenCalled();
  });

  it('should call onChange and onRunQuery with defaultListAlarmsQuery and queryType as listAlarms when query Type is not defined', () => {
    const query = buildQuery();

    renderElement(query);

    expect(mockOnChange).toHaveBeenCalledWith(expect.objectContaining({ ...defaultListAlarmsQuery, queryType: QueryType.ListAlarms }));
    expect(mockOnRunQuery).toHaveBeenCalled();
  });

  it('should render the Query Type UI control', async () => {
    const query = buildQuery({ queryType: QueryType.AlarmsCount });

    const renderResult = renderElement(query);
    const queryTypeControl = renderResult.getByRole('combobox');
    await userEvent.click(queryTypeControl);
    const item = await screen.findByRole('option', { name: QueryType.ListAlarms });
    await userEvent.click(item);

    expect(screen.getByDisplayValue(QueryType.ListAlarms)).toBeInTheDocument();
  });

  it('should render the Query Type UI control and allow selecting an option', async () => {
    const query = buildQuery({ queryType: QueryType.AlarmsCount });

    const renderResult = renderElement(query);
    const queryTypeControl = renderResult.getByRole('combobox');
    await userEvent.clear(queryTypeControl);
    await userEvent.keyboard('{Enter}');
    await userEvent.type(queryTypeControl, 'List Alarms');
    
    await waitFor(() => {
      expect(queryTypeControl).toHaveDisplayValue('List Alarms');
      expect(mockOnChange).toHaveBeenCalledWith(expect.objectContaining(defaultListAlarmsQuery));
    })
  });

  describe('ListAlarmsQueryEditor', () => {
    it('should render list alarms query type and its editor in the UI', () => {
      const query = buildQuery({ queryType: QueryType.ListAlarms });
  
      const container = renderElement(query);
  
      const queryTypeControl = container.getAllByRole('combobox')[0];
      expect(queryTypeControl).toBeInTheDocument();
      expect(queryTypeControl).toHaveDisplayValue(QueryType.ListAlarms);
      expect(container.getByText('List Alarms query editor')).toBeInTheDocument();
    });

    it('should change the query type', () => {
      const query = buildQuery({ queryType: QueryType.ListAlarms });
  
      const container = renderElement(query);
  
      const queryTypeControl = container.getAllByRole('combobox')[0];
      expect(queryTypeControl).toBeInTheDocument();
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

    it('should save the previous edit state when switching query types and restore it when switching back', async () => {
      const user = userEvent.setup();
      const initialAlarmsCountQuery = {
        refId: 'A',
        queryType: QueryType.AlarmsCount,
        filter: 'workspace = "1"',
      };

      let currentQuery = { ...initialAlarmsCountQuery };
    const onChange = jest.fn((query) => {
      currentQuery = { ...currentQuery, ...query };
      renderResult.rerender(
        React.createElement(AlarmsQueryEditor, { ...defaultProps, query: currentQuery, onChange })
      );
    });

    const renderResult = render(
      React.createElement(AlarmsQueryEditor, { ...defaultProps, query: currentQuery, onChange })
    );

    });
  });
});
