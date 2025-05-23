import { render, RenderResult, screen, waitFor } from '@testing-library/react';
import { WorkOrdersDataSource } from '../WorkOrdersDataSource';
import { WorkOrdersQueryEditor } from './WorkOrdersQueryEditor';
import { OutputType, WorkOrdersQuery } from '../types';
import { QueryEditorProps } from '@grafana/data';
import React from 'react';
import userEvent from '@testing-library/user-event';
import { select } from 'react-select-event';

const mockOnChange = jest.fn();
const mockOnRunQuery = jest.fn();
const mockDatasource = {
  prepareQuery: jest.fn((query: WorkOrdersQuery) => query),
} as unknown as WorkOrdersDataSource;

const defaultProps: QueryEditorProps<WorkOrdersDataSource, WorkOrdersQuery> = {
  query: {
    refId: 'A',
    outputType: OutputType.Properties,
  },
  onChange: mockOnChange,
  onRunQuery: mockOnRunQuery,
  datasource: mockDatasource,
};

describe('WorkOrdersQueryEditor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  function renderElement(query: WorkOrdersQuery = { refId: 'A', outputType: OutputType.Properties }) {
    const reactNode = React.createElement(WorkOrdersQueryEditor, { ...defaultProps, query });
    return render(reactNode);
  }

  it('renders the query builder', async () => {
    renderElement();

    await waitFor(() => expect(screen.getAllByText('Property').length).toBe(1));
    await waitFor(() => expect(screen.getAllByText('Operator').length).toBe(1));
    await waitFor(() => expect(screen.getAllByText('Value').length).toBe(1));
  });

  it('should render default query', async () => {
    const container = renderElement();

    expect(container.getByRole('radio', { name: OutputType.Properties })).toBeInTheDocument();
    expect(container.getByRole('radio', { name: OutputType.Properties })).toBeChecked();
    expect(container.getByRole('radio', { name: OutputType.TotalCount })).toBeInTheDocument();
    expect(container.getByRole('radio', { name: OutputType.TotalCount })).not.toBeChecked();

    const orderBy = container.getAllByRole('combobox')[0];
    expect(orderBy).toBeInTheDocument();
    expect(orderBy).toHaveAccessibleDescription('Select a field to set the query order');
    expect(orderBy).toHaveDisplayValue('');

    const descending = container.getByRole('checkbox');
    expect(descending).toBeInTheDocument();
    expect(descending).not.toBeChecked();

    const take = container.getByRole('spinbutton');
    expect(take).toBeInTheDocument();
    expect(take).toHaveDisplayValue('');
  });

  describe('output type is total count', () => {
    let container: RenderResult;
    beforeEach(() => {
      const query = {
        refId: 'A',
        outputType: OutputType.TotalCount,
      };
      container = renderElement(query);
    });

    it('should not render order by', async () => {
      await waitFor(() => {
        const orderBy = container.queryByRole('combobox', { name: 'OrderBy' });
        expect(orderBy).not.toBeInTheDocument();
      });
    });

    it('should not render descending', async () => {
      await waitFor(() => {
        const descending = container.queryByRole('checkbox', { name: 'Descending' });
        expect(descending).not.toBeInTheDocument();
      });
    });

    it('should render take', async () => {
      const take = container.getByRole('spinbutton', { name: 'Take' });
      expect(take).toBeInTheDocument();
    });
  });

  describe('output type is properties', () => {
    let container: RenderResult;
    beforeEach(() => {
      const query = {
        refId: 'A',
        outputType: OutputType.Properties,
      };
      container = renderElement(query);
    });

    it('should render order by', async () => {
      const orderBy = container.getByRole('combobox');
      expect(orderBy).toBeInTheDocument();
    });

    it('should render descending', async () => {
      const descending = container.getByRole('checkbox');
      expect(descending).toBeInTheDocument();
    });

    it('should render take', async () => {
      const take = container.getByRole('spinbutton');
      expect(take).toBeInTheDocument();
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
    it('should call onChange with properties output type when switching from total count', async () => {
      const query = {
        refId: 'A',
        outputType: OutputType.TotalCount,
      };
      const container = renderElement(query);

      const propertiesRadio = container.getByRole('radio', { name: OutputType.Properties });
      userEvent.click(propertiesRadio);

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith(expect.objectContaining({ outputType: OutputType.Properties }));
        expect(mockOnRunQuery).toHaveBeenCalled();
      });
    });

    it('should call onChange with total count output type when switching from properties', async () => {
      const container = renderElement();

      const totalCountRadio = container.getByRole('radio', { name: OutputType.TotalCount });
      userEvent.click(totalCountRadio);

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith(expect.objectContaining({ outputType: OutputType.TotalCount }));
        expect(mockOnRunQuery).toHaveBeenCalled();
      });
    });

    it('should call onChange with order by when user changes order by', async () => {
      const container = renderElement();
      const orderBySelect = container.getAllByRole('combobox')[0];

      userEvent.click(orderBySelect);
      await select(orderBySelect, 'ID', { container: document.body });

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith(expect.objectContaining({ orderBy: 'ID' }));
        expect(mockOnRunQuery).toHaveBeenCalled();
      });
    });

    it('should call onChange with descending when user toggles descending', async () => {
      const container = renderElement();
      const descendingCheckbox = container.getByRole('checkbox');

      userEvent.click(descendingCheckbox);

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith(expect.objectContaining({ descending: true }));
        expect(mockOnRunQuery).toHaveBeenCalled();
      });
    });

    it('should call onChange with take when user changes take', async () => {
      const container = renderElement();
      const takeInput = container.getByRole('spinbutton');

      userEvent.type(takeInput, '10');
      userEvent.tab(); // Trigger onCommitChange

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith(expect.objectContaining({ take: 10 }));
        expect(mockOnRunQuery).toHaveBeenCalled();
      });
    });

    it('should show error message when when user changes take to number greater than max take', async () => {
      const container = renderElement();
      const takeInput = container.getByRole('spinbutton');

      userEvent.clear(takeInput);
      userEvent.type(takeInput, '1000000');
      userEvent.tab();

      await waitFor(() => {
        expect(container.getByText('Record count must be less than 10000')).toBeInTheDocument();
      });
    });
    it('should show error message when when user changes take to number less than min take', async () => {
      const container = renderElement();
      const takeInput = container.getByRole('spinbutton');

      userEvent.clear(takeInput);
      userEvent.type(takeInput, '0');
      userEvent.tab();

      await waitFor(() => {
        expect(container.getByText('Record count must be greater than 0')).toBeInTheDocument();
      });
    });

    it('should not show error message when when user changes take to number between min and max take', async () => {
      const container = renderElement();
      const takeInput = container.getByRole('spinbutton');

      // User enters a value greater than max take
      userEvent.clear(takeInput);
      userEvent.type(takeInput, '1000000');
      userEvent.tab();
      await waitFor(() => {
        expect(container.getByText('Record count must be less than 10000')).toBeInTheDocument();
      });

      // User enters a valid value
      userEvent.clear(takeInput);
      userEvent.type(takeInput, '100');
      userEvent.tab();

      await waitFor(() => {
        expect(container.queryByText('Record count must be greater than 0')).not.toBeInTheDocument();
        expect(container.queryByText('Record count must be less than 10000')).not.toBeInTheDocument();
      });
    });
  });
});
