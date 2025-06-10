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
  globalVariableOptions: jest.fn(() => []),
  usersUtils: {
    getUsers: jest.fn().mockResolvedValue(
      new Map([
        ['1', { id: '1', firstName: 'User', lastName: '1' }],
        ['2', { id: '2', firstName: 'User', lastName: '2' }],
      ])
    ),
  },
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

  it('should render take', async () => {
    const take = container.getByRole('spinbutton');
    expect(take).toBeInTheDocument();
  });

  it('only allows numbers in Take field', async () => {
    const recordCountInput = container.getByRole('spinbutton');

    // User tries to enter a non-numeric value
    await userEvent.clear(recordCountInput);
    await userEvent.type(recordCountInput, 'abc');
    await waitFor(() => {
      expect(recordCountInput).toHaveValue(null);
    });

    // User enters a valid numeric value
    await userEvent.clear(recordCountInput);
    await userEvent.type(recordCountInput, '500');
    await waitFor(() => {
      expect(recordCountInput).toHaveValue(500);
    });
  });

  it('should load users and set them in state', async () => {
    renderElement();

    const users = await mockDatasource.usersUtils.getUsers();
    expect(users).toBeDefined();
    expect(users).toEqual(
      new Map([
        ['1', { id: '1', firstName: 'User', lastName: '1' }],
        ['2', { id: '2', firstName: 'User', lastName: '2' }],
      ])
    );
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


    it('should call onChange with take when user changes take', async () => {
      const takeInput = container.getByRole('spinbutton');

      await userEvent.type(takeInput, '10');
      await userEvent.tab(); // Trigger onCommitChange

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith(expect.objectContaining({ take: 10 }));
      });
    });

    it('should show error message when when user changes take to number greater than max take', async () => {
      const takeInput = container.getByRole('spinbutton');
      mockOnChange.mockClear();

      await userEvent.clear(takeInput);
      await userEvent.type(takeInput, '1000000');
      await userEvent.tab();

      await waitFor(() => {
        expect(container.getByText('Enter a value less than or equal to 10,000')).toBeInTheDocument();
        expect(mockOnChange).not.toHaveBeenCalled();
      });
    });

    it('should show error message when when user changes take to number less than min take', async () => {
      const takeInput = container.getByRole('spinbutton');
      mockOnChange.mockClear();

      await userEvent.clear(takeInput);
      await userEvent.tab();

      await waitFor(() => {
        expect(container.getByText('Enter a value greater than or equal to 0')).toBeInTheDocument();
        expect(mockOnChange).not.toHaveBeenCalled();
      });
    });

    it('should not show error message when when user changes take to number between min and max take', async () => {
      const takeInput = container.getByRole('spinbutton');

      // User enters a value greater than max take
      await userEvent.clear(takeInput);
      await userEvent.type(takeInput, '1000000');
      await userEvent.tab();
      await waitFor(() => {
        expect(container.getByText('Enter a value less than or equal to 10,000')).toBeInTheDocument();
      });

      // User enters a valid value
      await userEvent.clear(takeInput);
      await userEvent.type(takeInput, '100');
      await userEvent.tab();

      await waitFor(() => {
        expect(container.queryByText('Enter a value greater than or equal to 0')).not.toBeInTheDocument();
        expect(container.queryByText('Enter a value less than or equal to 10,000')).not.toBeInTheDocument();
      });
    });
  });
});
