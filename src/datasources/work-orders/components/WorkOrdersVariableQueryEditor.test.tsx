import { render, RenderResult, screen, waitFor } from '@testing-library/react';
import { WorkOrdersDataSource } from '../WorkOrdersDataSource';
import { WorkOrdersVariableQuery } from '../types';
import { QueryEditorProps } from '@grafana/data';
import React from 'react';
import userEvent from '@testing-library/user-event';
import selectEvent, { select } from 'react-select-event';
import { WorkOrdersVariableQueryEditor } from './WorkOrdersVariableQueryEditor';

const mockOnChange = jest.fn();
const mockOnRunQuery = jest.fn();
const mockDatasource = {
  prepareQuery: jest.fn((query: WorkOrdersVariableQuery) => query),
} as unknown as WorkOrdersDataSource;

const defaultProps: QueryEditorProps<WorkOrdersDataSource, WorkOrdersVariableQuery> = {
  query: {
    refId: 'A',
  },
  onChange: mockOnChange,
  onRunQuery: mockOnRunQuery,
  datasource: mockDatasource,
};

describe('WorkOrdersVariableQueryEditor', () => {
  let container: RenderResult;
  beforeEach(() => {
    jest.clearAllMocks();
    container = renderElement();
  });

  function renderElement(query: WorkOrdersVariableQuery = { refId: 'A' }) {
    const reactNode = React.createElement(WorkOrdersVariableQueryEditor, { ...defaultProps, query });
    return render(reactNode);
  }

  it('renders the query builder', async () => {
    await waitFor(() => expect(screen.getAllByText('Property').length).toBe(1));
    await waitFor(() => expect(screen.getAllByText('Operator').length).toBe(1));
    await waitFor(() => expect(screen.getAllByText('Value').length).toBe(1));
  });

  it('should render order by', async () => {
    const orderBy = container.queryAllByRole('combobox')[0];
    expect(orderBy).toBeInTheDocument();
    expect(orderBy).toHaveAccessibleDescription('Select a field to set the query order');
    expect(orderBy).toHaveDisplayValue('');

    selectEvent.openMenu(orderBy);

    expect(screen.getByText('ID')).toBeInTheDocument();
    expect(screen.getByText('ID of the work order')).toBeInTheDocument();
    expect(screen.getByText('Updated At')).toBeInTheDocument();
    expect(screen.getByText('Latest update at time of the work order')).toBeInTheDocument();
  });

  it('should render descending', async () => {
    const descending = container.getByRole('checkbox');
    expect(descending).toBeInTheDocument();
    expect(descending).not.toBeChecked();
  });

  describe('onChange', () => {
    it('should call onChange with order by when user changes order by', async () => {
      const orderBySelect = container.getAllByRole('combobox')[0];

      userEvent.click(orderBySelect);
      await select(orderBySelect, 'ID', { container: document.body });

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith(expect.objectContaining({ orderBy: 'ID' }));
      });
    });

    it('should call onChange with descending when user toggles descending', async () => {
      const descendingCheckbox = container.getByRole('checkbox');

      userEvent.click(descendingCheckbox);

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith(expect.objectContaining({ descending: true }));
      });
    });

    it('should call onChange when query by changes', async () => {
      const queryBuilder = container.getByRole('dialog');
      expect(queryBuilder).toBeInTheDocument();

      // Simulate a change event
      const event = { detail: { linq: 'new-query' } };
      queryBuilder?.dispatchEvent(new CustomEvent('change', event));

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith(expect.objectContaining({ queryBy: 'new-query' }));
      });
    });

    it('should not call onChange when query by changes with same value', async () => {
      mockOnChange.mockClear();

      const queryBuilder = container.getByRole('dialog');
      expect(queryBuilder).toBeInTheDocument();

      // Simulate a change event
      let event = { detail: { linq: 'new-query' } };
      queryBuilder?.dispatchEvent(new CustomEvent('change', event));

      // Simulate a change event with the same value
      event = { detail: { linq: 'new-query' } };
      queryBuilder?.dispatchEvent(new CustomEvent('change', event));

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledTimes(1);
      });
    });
  });
});
