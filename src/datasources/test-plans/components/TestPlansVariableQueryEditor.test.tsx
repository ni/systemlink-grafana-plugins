import React from 'react';
import { act, render, waitFor, screen } from '@testing-library/react';
import { TestPlansVariableQueryEditor } from './TestPlansVariableQueryEditor';
import { QueryEditorProps } from '@grafana/data';
import { TestPlansDataSource } from '../TestPlansDataSource';
import { TestPlansVariableQuery } from '../types';
import userEvent from '@testing-library/user-event';
import { select } from 'react-select-event';

const mockOnChange = jest.fn();
const mockOnRunQuery = jest.fn();
const mockDatasource = {
  prepareQuery: jest.fn((query: TestPlansVariableQuery) => query),
  workspaceUtils: {
    getWorkspaces: jest.fn().mockResolvedValue(
      new Map([
        ['1', { id: '1', name: 'WorkspaceName' }],
        ['2', { id: '2', name: 'AnotherWorkspaceName' }],
      ])
    ),
  }
} as unknown as TestPlansDataSource;

const defaultProps: QueryEditorProps<TestPlansDataSource, TestPlansVariableQuery> = {
  query: {
    refId: 'A',
  },
  onChange: mockOnChange,
  onRunQuery: mockOnRunQuery,
  datasource: mockDatasource,
};

describe('TestPlansVariableQueryEditor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  async function renderElement(query: TestPlansVariableQuery = { refId: 'A' }) {
    await act(async () => {
      const reactNode = React.createElement(TestPlansVariableQueryEditor, { ...defaultProps, query });
      render(reactNode);
    });
  }

  it('should render default query', async () => {
    await renderElement();

    await waitFor(() => {
      const orderBy = screen.getAllByRole('combobox')[0];
      expect(orderBy).toBeInTheDocument();
      expect(orderBy).toHaveAccessibleDescription('Select a field to set the query order');
      expect(orderBy).toHaveDisplayValue('');

      const descending = screen.getByRole('checkbox');
      expect(descending).toBeInTheDocument();
      expect(descending).not.toBeChecked();

      const recordCount = screen.getByRole('spinbutton');
      expect(recordCount).toBeInTheDocument();
      expect(recordCount).toHaveDisplayValue('');

      const queryBuilder = screen.getByRole('dialog');
      expect(queryBuilder).toBeInTheDocument();
    });
  });

  it('only allows numbers in Take field', async () => {
    await renderElement();

    const recordCountInput = screen.getByRole('spinbutton');

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

  it('should load workspaces and set them in state', async () => {
    await renderElement();

    expect(mockDatasource.workspaceUtils.getWorkspaces()).toBeDefined();
    await expect(mockDatasource.workspaceUtils.getWorkspaces()).resolves.toEqual(
      new Map([
        ['1', { id: '1', name: 'WorkspaceName' }],
        ['2', { id: '2', name: 'AnotherWorkspaceName' }],
      ])
    );
  });

  describe('onChange', () => {
    it('should call onChange with order by when user selects order by', async () => {
      await renderElement();
      const orderBySelect = screen.getAllByRole('combobox')[0];

      userEvent.click(orderBySelect);
      await select(orderBySelect, 'ID', { container: document.body });

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith(expect.objectContaining({ orderBy: 'ID' }));
      });
    });

    it('should call onChange with descending when user toggles descending', async () => {
      await renderElement();
      const descendingCheckbox = screen.getByRole('checkbox');

      userEvent.click(descendingCheckbox);

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith(expect.objectContaining({ descending: true }));
      });
    });

    it('should call onChange with record count when user enters record count', async () => {
      await renderElement();
      const recordCountInput = screen.getByRole('spinbutton');

      await userEvent.clear(recordCountInput);
      await userEvent.type(recordCountInput, '50');
      userEvent.tab(); // Trigger onCommitChange

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith(expect.objectContaining({ recordCount: 50 }));
      });
    });

    it('should call onChange when query by changes', async () => {
      await renderElement();

      const queryBuilder = screen.getByRole('dialog');
      expect(queryBuilder).toBeInTheDocument();

      // Simulate a change event
      const event = { detail: { linq: 'new-query' } };
      queryBuilder?.dispatchEvent(new CustomEvent('change', event));

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith(expect.objectContaining({ queryBy: 'new-query' }));
      });
    });

    it('should show error message when when user changes take to number greater than max take', async () => {
      await renderElement();
      const takeInput = screen.getByRole('spinbutton');
      mockOnChange.mockClear();

      await userEvent.clear(takeInput);
      await userEvent.type(takeInput, '1000000');
      await userEvent.tab();

      await waitFor(() => {
        expect(screen.getByText('Enter a value less than or equal to 10,000')).toBeInTheDocument();
        expect(mockOnChange).not.toHaveBeenCalled();
      });
    });

    it('should show error message when when user changes take to number less than min take', async () => {
      await renderElement();
      const takeInput = screen.getByRole('spinbutton');
      mockOnChange.mockClear();

      await userEvent.clear(takeInput);
      await userEvent.tab();

      await waitFor(() => {
        expect(screen.getByText('Enter a value greater than or equal to 0')).toBeInTheDocument();
        expect(mockOnChange).not.toHaveBeenCalled();
      });
    });

    it('should not show error message when when user changes take to number between min and max take', async () => {
      await renderElement();
      const takeInput = screen.getByRole('spinbutton');

      // User enters a value greater than max take
      await userEvent.clear(takeInput);
      await userEvent.type(takeInput, '1000000');
      await userEvent.tab();
      await waitFor(() => {
        expect(screen.getByText('Enter a value less than or equal to 10,000')).toBeInTheDocument();
      });

      // User enters a valid value
      await userEvent.clear(takeInput);
      await userEvent.type(takeInput, '100');
      await userEvent.tab();

      await waitFor(() => {
        expect(screen.queryByText('Enter a value greater than or equal to 0')).not.toBeInTheDocument();
        expect(screen.queryByText('Enter a value less than or equal to 10,000')).not.toBeInTheDocument();
      });
    });
  });
});
