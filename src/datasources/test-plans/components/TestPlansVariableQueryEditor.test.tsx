import React from 'react';
import { render, waitFor } from '@testing-library/react';
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

  function renderElement(query: TestPlansVariableQuery = { refId: 'A' }) {
    const reactNode = React.createElement(TestPlansVariableQueryEditor, { ...defaultProps, query });
    return render(reactNode);
  }

  it('should render default query', async () => {
    const container = renderElement();

    await waitFor(() => {
      const orderBy = container.getAllByRole('combobox')[0];
      expect(orderBy).toBeInTheDocument();
      expect(orderBy).toHaveAccessibleDescription('Select a field to set the query order');
      expect(orderBy).toHaveDisplayValue('');

      const descending = container.getByRole('checkbox');
      expect(descending).toBeInTheDocument();
      expect(descending).not.toBeChecked();

      const recordCount = container.getByRole('spinbutton');
      expect(recordCount).toBeInTheDocument();
      expect(recordCount).toHaveDisplayValue('');
    });
  });

  it('only allows numbers in Take field', async () => {
    const container = renderElement();

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

  describe('onChange', () => {
    it('should call onChange with order by when user selects order by', async () => {
      const container = renderElement();
      const orderBySelect = container.getAllByRole('combobox')[0];

      userEvent.click(orderBySelect);
      await select(orderBySelect, 'ID', { container: document.body });

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith(expect.objectContaining({ orderBy: 'ID' }));
      });
    });

    it('should call onChange with descending when user toggles descending', async () => {
      const container = renderElement();
      const descendingCheckbox = container.getByRole('checkbox');

      userEvent.click(descendingCheckbox);

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith(expect.objectContaining({ descending: true }));
      });
    });

    it('should call onChange with record count when user enters record count', async () => {
      const container = renderElement();
      const recordCountInput = container.getByRole('spinbutton');

      await userEvent.clear(recordCountInput);
      await userEvent.type(recordCountInput, '50');
      userEvent.tab(); // Trigger onCommitChange

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith(expect.objectContaining({ recordCount: 50 }));
      });
    });

    it('should call onChange when query by changes', async () => {
      const container = renderElement();

      const queryBuilder = container.getByRole('dialog');
      expect(queryBuilder).toBeInTheDocument();

      // Simulate a change event
      const event = { detail: { linq: 'new-query' } };
      queryBuilder?.dispatchEvent(new CustomEvent('change', event));

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith(expect.objectContaining({ queryBy: 'new-query' }));
        expect(mockOnRunQuery).toHaveBeenCalled();
      });
    });

    it('should show error message when record count is invalid', async () => {
      const container = renderElement();
      const recordCountInput = container.getByRole('spinbutton');

      await userEvent.clear(recordCountInput);
      await userEvent.type(recordCountInput, '10001');
      userEvent.tab();

      await waitFor(() => {
        expect(container.getByText('Record count must be less than 10000')).toBeInTheDocument();
      });
    });
  });
});
